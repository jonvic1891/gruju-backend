require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const twilio = require('twilio');
const sgMail = require('@sendgrid/mail');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
const allowedOrigins = [
    'https://gruju-parent-activity-app.web.app',
    'https://gruju-parent-activity-app.firebaseapp.com',
    'http://localhost:3000', 
    'http://localhost:9000', 
    'http://127.0.0.1:5500', 
    'http://127.0.0.1:9000', 
    'file://', 
    'null'
];

app.use(cors({
    origin: allowedOrigins,
    credentials: true
}));
app.use(express.json());

// PostgreSQL Database Configuration
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Test database connection
async function initializeDatabase() {
    try {
        console.log('🔄 Connecting to PostgreSQL Database...');
        const client = await pool.connect();
        console.log('✅ Connected to PostgreSQL Database successfully!');
        
        // Test the connection
        await client.query('SELECT NOW()');
        console.log('✅ Database connection test query successful');
        
        // Create tables if they don't exist
        await createTables(client);
        client.release();
        
        return true;
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        throw error;
    }
}

// Create database tables
async function createTables(client) {
    try {
        console.log('🔧 Creating database tables...');
        
        // Users table
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                phone VARCHAR(20),
                password_hash VARCHAR(255) NOT NULL,
                role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'super_admin')),
                is_active BOOLEAN DEFAULT true,
                family_name VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Children table
        await client.query(`
            CREATE TABLE IF NOT EXISTS children (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                parent_id INTEGER NOT NULL,
                age INTEGER,
                grade VARCHAR(20),
                school VARCHAR(100),
                interests TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (parent_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

        // Activities table
        await client.query(`
            CREATE TABLE IF NOT EXISTS activities (
                id SERIAL PRIMARY KEY,
                child_id INTEGER NOT NULL,
                name VARCHAR(200) NOT NULL,
                description TEXT,
                start_date DATE NOT NULL,
                end_date DATE,
                start_time TIME,
                end_time TIME,
                location VARCHAR(200),
                website_url VARCHAR(500),
                cost DECIMAL(10,2),
                max_participants INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE
            )
        `);

        // Connection requests table
        await client.query(`
            CREATE TABLE IF NOT EXISTS connection_requests (
                id SERIAL PRIMARY KEY,
                requester_id INTEGER NOT NULL,
                target_parent_id INTEGER NOT NULL,
                child_id INTEGER,
                target_child_id INTEGER,
                status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
                message TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (requester_id) REFERENCES users(id),
                FOREIGN KEY (target_parent_id) REFERENCES users(id),
                FOREIGN KEY (child_id) REFERENCES children(id),
                FOREIGN KEY (target_child_id) REFERENCES children(id)
            )
        `);

        // Connections table
        await client.query(`
            CREATE TABLE IF NOT EXISTS connections (
                id SERIAL PRIMARY KEY,
                parent1_id INTEGER NOT NULL,
                parent2_id INTEGER NOT NULL,
                status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'blocked')),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (parent1_id) REFERENCES users(id),
                FOREIGN KEY (parent2_id) REFERENCES users(id),
                UNIQUE(parent1_id, parent2_id)
            )
        `);

        // System logs table
        await client.query(`
            CREATE TABLE IF NOT EXISTS system_logs (
                id SERIAL PRIMARY KEY,
                level VARCHAR(10) NOT NULL CHECK (level IN ('info', 'warn', 'error')),
                message TEXT NOT NULL,
                user_id INTEGER,
                metadata TEXT,
                ip_address INET,
                user_agent TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        `);

        // Insert demo users if they don't exist
        const demoUsers = [
            ['admin', 'admin@parentactivityapp.com', '+1555000001', 'super_admin', 'Admin Family'],
            ['manager', 'manager@parentactivityapp.com', '+1555000002', 'admin', 'Manager Family'],
            ['johnson_family', 'johnson.family@email.com', '+1555000003', 'user', 'Johnson Family'],
            ['smith_family', 'smith.family@email.com', '+1555000004', 'user', 'Smith Family'],
            ['davis_family', 'davis.family@email.com', '+1555000005', 'user', 'Davis Family'],
            ['wilson_family', 'wilson.family@email.com', '+1555000006', 'user', 'Wilson Family'],
            ['brown_family', 'brown.family@email.com', '+1555000007', 'user', 'Brown Family']
        ];

        for (const [username, email, phone, role, family_name] of demoUsers) {
            const userExists = await client.query(`SELECT id FROM users WHERE email = $1 OR username = $2`, [email, username]);
            if (userExists.rows.length === 0) {
                try {
                    await client.query(`
                        INSERT INTO users (username, email, phone, password_hash, role, family_name)
                        VALUES ($1, $2, $3, '$2a$12$dummy.hash.for.demo.purposes', $4, $5)
                    `, [username, email, phone, role, family_name]);
                    console.log(`✅ Created demo user: ${username}`);
                } catch (error) {
                    if (error.code !== '23505') { // Ignore duplicate key errors
                        console.error(`Error creating user ${username}:`, error);
                    }
                }
            }
        }

        // Insert demo children if they don't exist
        await insertDemoChildren(client);
        
        // Insert demo activities if they don't exist
        await insertDemoActivities(client);
        
        // Insert demo connections if they don't exist
        await insertDemoConnections(client);

        console.log('✅ Database tables created successfully');
    } catch (error) {
        console.error('❌ Error creating tables:', error);
        throw error;
    }
}

// Insert demo children
async function insertDemoChildren(client) {
    // Get user IDs dynamically
    const users = await client.query('SELECT id, username FROM users ORDER BY id');
    const userMap = {};
    users.rows.forEach(user => {
        userMap[user.username] = user.id;
    });

    const demoChildren = [
        // Johnson Family children
        ['Emma Johnson', userMap['johnson_family'], 8, 'K', 'Maple Elementary', 'Soccer, Art, Reading'],
        ['Noah Johnson', userMap['johnson_family'], 10, '4th', 'Maple Elementary', 'Basketball, Video Games, Science'],
        
        // Smith Family children  
        ['Sophia Smith', userMap['smith_family'], 6, 'Pre-K', 'Sunshine Daycare', 'Dancing, Music, Puzzles'],
        ['Liam Smith', userMap['smith_family'], 9, '3rd', 'Oak Elementary', 'Baseball, Math, Chess'],
        
        // Davis Family children
        ['Olivia Davis', userMap['davis_family'], 7, '1st', 'Pine Elementary', 'Swimming, Drawing, Books'],
        ['Mason Davis', userMap['davis_family'], 12, '6th', 'Riverside Middle', 'Football, Coding, History'],
        
        // Wilson Family children
        ['Ava Wilson', userMap['wilson_family'], 5, 'Pre-K', 'Little Stars Preschool', 'Singing, Coloring, Animals'],
        
        // Brown Family children  
        ['Ethan Brown', userMap['brown_family'], 11, '5th', 'Cedar Elementary', 'Tennis, Guitar, Adventure'],
        ['Isabella Brown', userMap['brown_family'], 14, '8th', 'Valley Middle School', 'Volleyball, Photography, Writing']
    ];

    for (const [name, parent_id, age, grade, school, interests] of demoChildren) {
        const childExists = await client.query(`SELECT id FROM children WHERE name = $1 AND parent_id = $2`, [name, parent_id]);
        if (childExists.rows.length === 0) {
            try {
                await client.query(`
                    INSERT INTO children (name, parent_id, age, grade, school, interests)
                    VALUES ($1, $2, $3, $4, $5, $6)
                `, [name, parent_id, age, grade, school, interests]);
                console.log(`✅ Created demo child: ${name}`);
            } catch (error) {
                console.error(`Error creating child ${name}:`, error.message);
            }
        }
    }
}

// Insert demo activities
async function insertDemoActivities(client) {
    // Get child IDs dynamically
    const children = await client.query('SELECT id, name FROM children ORDER BY id');
    const childMap = {};
    children.rows.forEach(child => {
        childMap[child.name] = child.id;
    });

    const demoActivities = [
        // Emma's activities
        [childMap['Emma Johnson'], 'Soccer Practice', 'Weekly soccer practice with the Lightning Bolts team', '2025-08-02', null, '10:00', '11:30', 'Riverside Sports Complex', null, 25.00, 15],
        [childMap['Emma Johnson'], 'Art Class', 'Creative painting and drawing session', '2025-08-05', null, '14:00', '15:30', 'Community Art Center', 'https://communityartcenter.com', 30.00, 10],
        [childMap['Emma Johnson'], 'Birthday Party', 'Sarah\'s 8th birthday party', '2025-08-10', null, '15:00', '17:00', '123 Oak Street', null, null, null],
        [childMap['Emma Johnson'], 'Swimming Lessons', 'Beginner swimming lessons', '2025-08-12', null, '16:00', '17:00', 'Aquatic Center', null, 40.00, 8],
        
        // Noah's activities
        [childMap['Noah Johnson'], 'Basketball Practice', 'Weekly basketball training', '2025-08-03', null, '09:00', '10:30', 'School Gymnasium', null, 20.00, 12],
        [childMap['Noah Johnson'], 'Science Club', 'Weekly science experiments and projects', '2025-08-07', null, '15:30', '16:30', 'Maple Elementary', null, 15.00, 20],
        [childMap['Noah Johnson'], 'Gaming Tournament', 'Local esports tournament', '2025-08-14', null, '13:00', '18:00', 'Gaming Lounge', 'https://gamerlounge.com', 10.00, 32],
        
        // Sophia's activities
        [childMap['Sophia Smith'], 'Dance Class', 'Ballet and jazz dance lessons', '2025-08-01', null, '17:00', '18:00', 'Dance Studio', null, 35.00, 8],
        [childMap['Sophia Smith'], 'Music Lessons', 'Piano lessons for beginners', '2025-08-04', null, '11:00', '11:45', 'Music Academy', null, 50.00, 1],
        [childMap['Sophia Smith'], 'Playdate', 'Playdate with Emma Johnson', '2025-08-08', null, '14:00', '16:00', 'Central Park', null, null, null],
        
        // Liam's activities
        [childMap['Liam Smith'], 'Baseball Practice', 'Little League practice', '2025-08-02', null, '08:00', '10:00', 'Baseball Fields', null, 30.00, 15],
        [childMap['Liam Smith'], 'Chess Club', 'Weekly chess club meeting', '2025-08-06', null, '15:00', '16:00', 'Oak Elementary', null, 10.00, 12],
        [childMap['Liam Smith'], 'Math Tutoring', 'Advanced math tutoring session', '2025-08-09', null, '16:00', '17:00', 'Learning Center', null, 45.00, 1],
        
        // Olivia's activities
        [childMap['Olivia Davis'], 'Swimming Class', 'Intermediate swimming', '2025-08-01', null, '18:00', '19:00', 'Aquatic Center', null, 40.00, 8],
        [childMap['Olivia Davis'], 'Art Workshop', 'Drawing and painting workshop', '2025-08-11', null, '10:00', '12:00', 'Community Center', null, 25.00, 15],
        
        // Mason's activities
        [childMap['Mason Davis'], 'Football Practice', 'Middle school football team', '2025-08-03', null, '16:00', '18:00', 'School Field', null, 50.00, 25],
        [childMap['Mason Davis'], 'Coding Club', 'Learn programming basics', '2025-08-08', null, '17:00', '18:30', 'Tech Center', 'https://techcenter.com', 40.00, 10],
        
        // Ava's activities
        [childMap['Ava Wilson'], 'Singing Lessons', 'Voice lessons for kids', '2025-08-05', null, '10:00', '10:30', 'Music Studio', null, 35.00, 1],
        [childMap['Ava Wilson'], 'Zoo Trip', 'Field trip to the zoo', '2025-08-13', null, '09:00', '15:00', 'City Zoo', 'https://cityzoo.com', 20.00, 50],
        
        // Ethan's activities
        [childMap['Ethan Brown'], 'Tennis Lessons', 'Tennis coaching for kids', '2025-08-02', null, '14:00', '15:00', 'Tennis Club', null, 45.00, 6],
        [childMap['Ethan Brown'], 'Guitar Lessons', 'Learn to play guitar', '2025-08-07', null, '16:00', '16:45', 'Music School', null, 40.00, 1],
        
        // Isabella's activities
        [childMap['Isabella Brown'], 'Volleyball Practice', 'School volleyball team', '2025-08-04', null, '15:30', '17:00', 'School Gym', null, 25.00, 12],
        [childMap['Isabella Brown'], 'Photography Workshop', 'Digital photography basics', '2025-08-10', null, '13:00', '16:00', 'Photo Studio', 'https://photostudio.com', 60.00, 8]
    ];

    for (const [child_id, name, description, start_date, end_date, start_time, end_time, location, website_url, cost, max_participants] of demoActivities) {
        const activityExists = await client.query(`SELECT id FROM activities WHERE name = $1 AND child_id = $2`, [name, child_id]);
        if (activityExists.rows.length === 0) {
            try {
                await client.query(`
                    INSERT INTO activities (child_id, name, description, start_date, end_date, start_time, end_time, location, website_url, cost, max_participants)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                `, [child_id, name, description, start_date, end_date, start_time, end_time, location, website_url, cost, max_participants]);
                console.log(`✅ Created demo activity: ${name} for child ${child_id}`);
            } catch (error) {
                console.error(`Error creating activity ${name}:`, error.message);
            }
        }
    }
}

// Insert demo connections
async function insertDemoConnections(client) {
    // Get user IDs dynamically
    const users = await client.query('SELECT id, username FROM users');
    const userMap = {};
    users.rows.forEach(user => {
        userMap[user.username] = user.id;
    });

    const demoConnections = [
        [userMap['johnson_family'], userMap['smith_family']], // Johnson <-> Smith families
        [userMap['johnson_family'], userMap['davis_family']], // Johnson <-> Davis families  
        [userMap['smith_family'], userMap['davis_family']], // Smith <-> Davis families
        [userMap['wilson_family'], userMap['brown_family']]  // Wilson <-> Brown families
    ];

    for (const [parent1_id, parent2_id] of demoConnections) {
        const connectionExists = await client.query(`
            SELECT id FROM connections 
            WHERE (parent1_id = $1 AND parent2_id = $2) OR (parent1_id = $2 AND parent2_id = $1)
        `, [parent1_id, parent2_id]);
        
        if (connectionExists.rows.length === 0) {
            try {
                await client.query(`
                    INSERT INTO connections (parent1_id, parent2_id, status)
                    VALUES ($1, $2, 'active')
                `, [parent1_id, parent2_id]);
                console.log(`✅ Created demo connection: ${parent1_id} <-> ${parent2_id}`);
            } catch (error) {
                console.error(`Error creating connection ${parent1_id} <-> ${parent2_id}:`, error.message);
            }
        }
    }
}

// Authentication middleware
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.sendStatus(401);
    }

    jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
}

// Admin middleware
function requireAdmin(req, res, next) {
    if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'super_admin')) {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
}

// Super admin middleware
function requireSuperAdmin(req, res, next) {
    if (!req.user || req.user.role !== 'super_admin') {
        return res.status(403).json({ error: 'Super admin access required' });
    }
    next();
}

// Logging function
async function logActivity(level, message, userId = null, metadata = null, req = null) {
    try {
        const client = await pool.connect();
        await client.query(`
            INSERT INTO system_logs (level, message, user_id, metadata, ip_address, user_agent)
            VALUES ($1, $2, $3, $4, $5, $6)
        `, [level, message, userId, metadata ? JSON.stringify(metadata) : null, req ? req.ip : null, req ? req.get('User-Agent') : null]);
        client.release();
    } catch (error) {
        console.error('Logging error:', error);
    }
}

// Health check endpoint
app.get('/health', async (req, res) => {
    try {
        const client = await pool.connect();
        await client.query('SELECT NOW()');
        client.release();
        res.json({
            status: 'OK',
            message: 'SMS & Email Backend with PostgreSQL Database is running',
            database: 'Connected',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            status: 'ERROR',
            message: 'Database connection failed',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Database status endpoint
app.get('/database/status', async (req, res) => {
    try {
        const client = await pool.connect();
        
        const userCount = await client.query('SELECT COUNT(*) as count FROM users');
        const childCount = await client.query('SELECT COUNT(*) as count FROM children');
        const activityCount = await client.query('SELECT COUNT(*) as count FROM activities');
        const connectionCount = await client.query('SELECT COUNT(*) as count FROM connections');
        
        client.release();
        
        res.json({
            success: true,
            status: 'connected',
            message: 'Database is connected and operational',
            data: {
                connectionStatus: 'connected',
                currentMode: 'production',
                type: 'PostgreSQL Database',
                userCount: parseInt(userCount.rows[0].count),
                childCount: parseInt(childCount.rows[0].count),
                activityCount: parseInt(activityCount.rows[0].count),
                connectionCount: parseInt(connectionCount.rows[0].count),
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        res.json({
            success: false,
            status: 'error',
            message: 'Database connection failed',
            data: {
                connectionStatus: 'disconnected',
                error: error.message,
                timestamp: new Date().toISOString()
            }
        });
    }
});

// ===== AUTHENTICATION ENDPOINTS =====

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ success: false, error: 'Email and password required' });
        }

        const client = await pool.connect();
        const result = await client.query('SELECT * FROM users WHERE email = $1 AND is_active = true', [email]);

        if (result.rows.length === 0) {
            await logActivity('warn', `Failed login attempt for ${email}`, null, null, req);
            client.release();
            return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }

        const user = result.rows[0];
        
        // For demo purposes, accept 'demo123' as password for all demo accounts
        const isValidPassword = password === 'demo123' || 
            await bcrypt.compare(password, user.password_hash);

        if (!isValidPassword) {
            await logActivity('warn', `Failed login attempt for ${email}`, null, null, req);
            client.release();
            return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { 
                id: user.id, 
                email: user.email, 
                role: user.role,
                username: user.username 
            },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );

        await logActivity('info', `User logged in: ${email}`, user.id, null, req);
        client.release();

        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                family_name: user.family_name
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        await logActivity('error', `Login error: ${error.message}`, null, null, req);
        res.status(500).json({ success: false, error: 'Login failed' });
    }
});

// Register endpoint
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, email, phone, password, family_name } = req.body;
        
        if (!username || !email || !password) {
            return res.status(400).json({ success: false, error: 'Username, email, and password required' });
        }

        const client = await pool.connect();
        
        // Check if email already exists
        const existingUser = await client.query('SELECT id FROM users WHERE email = $1', [email]);

        if (existingUser.rows.length > 0) {
            client.release();
            return res.status(400).json({ success: false, error: 'An account with this email address already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const result = await client.query(`
            INSERT INTO users (username, email, phone, password_hash, family_name)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, username, email, phone, role, family_name
        `, [username, email, phone, hashedPassword, family_name]);

        const newUser = result.rows[0];
        
        const token = jwt.sign(
            { 
                id: newUser.id, 
                email: newUser.email, 
                role: newUser.role,
                username: newUser.username 
            },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );

        await logActivity('info', `New user registered: ${email}`, newUser.id, null, req);
        client.release();

        res.json({
            success: true,
            token,
            user: {
                id: newUser.id,
                username: newUser.username,
                email: newUser.email,
                phone: newUser.phone,
                role: newUser.role,
                family_name: newUser.family_name
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        await logActivity('error', `Registration error: ${error.message}`, null, null, req);
        res.status(500).json({ success: false, error: 'Registration failed' });
    }
});

// Auth verification endpoint
app.get('/auth/verify', authenticateToken, async (req, res) => {
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT id, username, email, role, family_name FROM users WHERE id = $1 AND is_active = true', [req.user.id]);
        client.release();

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        res.json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Auth verify error:', error);
        res.status(500).json({ success: false, error: 'Verification failed' });
    }
});

// Forgot password endpoint
app.post('/auth/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ success: false, error: 'Email is required' });
        }

        const client = await pool.connect();
        const user = await client.query('SELECT id, username FROM users WHERE email = $1 AND is_active = true', [email]);
        client.release();

        if (user.rows.length === 0) {
            // Don't reveal if email exists or not for security
            return res.json({
                success: true,
                message: 'If an account with this email exists, password reset instructions have been sent.'
            });
        }

        await logActivity('info', `Password reset requested for ${email}`, user.rows[0].id, null, req);

        res.json({
            success: true,
            message: 'If an account with this email exists, password reset instructions have been sent.'
        });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ success: false, error: 'Failed to process password reset request' });
    }
});

// Children endpoints
app.get('/api/children', authenticateToken, async (req, res) => {
    try {
        const client = await pool.connect();
        const result = await client.query(
            'SELECT * FROM children WHERE parent_id = $1 ORDER BY created_at DESC',
            [req.user.id]
        );
        client.release();

        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error('Get children error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch children' });
    }
});

app.post('/api/children', authenticateToken, async (req, res) => {
    try {
        const { name, age, grade, school, interests } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ success: false, error: 'Child name is required' });
        }

        const client = await pool.connect();
        const result = await client.query(
            'INSERT INTO children (name, parent_id, age, grade, school, interests) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [name.trim(), req.user.id, age, grade, school, interests]
        );
        client.release();

        res.json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Create child error:', error);
        res.status(500).json({ success: false, error: 'Failed to create child' });
    }
});

app.delete('/api/children/:id', authenticateToken, async (req, res) => {
    try {
        const childId = parseInt(req.params.id);
        
        const client = await pool.connect();
        
        // First check if the child belongs to this user
        const child = await client.query(
            'SELECT id FROM children WHERE id = $1 AND parent_id = $2',
            [childId, req.user.id]
        );

        if (child.rows.length === 0) {
            client.release();
            return res.status(404).json({ success: false, error: 'Child not found' });
        }

        // Delete child (activities will be deleted by CASCADE)
        await client.query('DELETE FROM children WHERE id = $1', [childId]);
        client.release();

        res.json({ success: true });
    } catch (error) {
        console.error('Delete child error:', error);
        res.status(500).json({ success: false, error: 'Failed to delete child' });
    }
});

// Activities endpoints
app.get('/api/activities/:childId', authenticateToken, async (req, res) => {
    try {
        const childId = parseInt(req.params.childId);
        
        const client = await pool.connect();
        
        // First verify the child belongs to this user
        const child = await client.query(
            'SELECT id FROM children WHERE id = $1 AND parent_id = $2',
            [childId, req.user.id]
        );

        if (child.rows.length === 0) {
            client.release();
            return res.status(404).json({ success: false, error: 'Child not found' });
        }

        const result = await client.query(
            'SELECT * FROM activities WHERE child_id = $1 ORDER BY start_date DESC, start_time DESC',
            [childId]
        );
        client.release();

        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error('Get activities error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch activities' });
    }
});

app.post('/api/activities/:childId', authenticateToken, async (req, res) => {
    try {
        const childId = parseInt(req.params.childId);
        const { name, description, start_date, end_date, start_time, end_time, location, website_url, cost, max_participants } = req.body;

        if (!name || !name.trim() || !start_date) {
            return res.status(400).json({ success: false, error: 'Activity name and start date are required' });
        }

        const client = await pool.connect();
        
        // First verify the child belongs to this user
        const child = await client.query(
            'SELECT id FROM children WHERE id = $1 AND parent_id = $2',
            [childId, req.user.id]
        );

        if (child.rows.length === 0) {
            client.release();
            return res.status(404).json({ success: false, error: 'Child not found' });
        }

        const result = await client.query(
            'INSERT INTO activities (child_id, name, description, start_date, end_date, start_time, end_time, location, website_url, cost, max_participants) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *',
            [childId, name.trim(), description, start_date, end_date, start_time, end_time, location, website_url, cost, max_participants]
        );
        client.release();

        res.json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Create activity error:', error);
        res.status(500).json({ success: false, error: 'Failed to create activity' });
    }
});

// Calendar endpoint
app.get('/api/calendar/activities', authenticateToken, async (req, res) => {
    try {
        const { start, end } = req.query;
        
        const client = await pool.connect();
        
        let query = `
            SELECT a.*, c.name as child_name 
            FROM activities a 
            JOIN children c ON a.child_id = c.id 
            WHERE c.parent_id = $1
        `;
        let params = [req.user.id];

        if (start && end) {
            query += ' AND a.start_date BETWEEN $2 AND $3';
            params.push(start, end);
        }

        query += ' ORDER BY a.start_date, a.start_time';

        const result = await client.query(query, params);
        client.release();

        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error('Get calendar activities error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch calendar activities' });
    }
});

// Connection endpoints
app.get('/api/connections/requests', authenticateToken, async (req, res) => {
    try {
        const client = await pool.connect();
        const result = await client.query(
            `SELECT cr.*, u.username as requester_name, u.email as requester_email, 
                    c1.name as child_name, c2.name as target_child_name
             FROM connection_requests cr
             JOIN users u ON cr.requester_id = u.id
             LEFT JOIN children c1 ON cr.child_id = c1.id
             LEFT JOIN children c2 ON cr.target_child_id = c2.id
             WHERE cr.target_parent_id = $1 AND cr.status = 'pending'
             ORDER BY cr.created_at DESC`,
            [req.user.id]
        );
        client.release();

        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error('Get connection requests error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch connection requests' });
    }
});

app.get('/api/connections/search', authenticateToken, async (req, res) => {
    try {
        const { q } = req.query;
        
        if (!q || q.length < 3) {
            return res.status(400).json({ success: false, error: 'Search query must be at least 3 characters' });
        }

        const client = await pool.connect();
        const result = await client.query(
            `SELECT u.id, u.username, u.email, u.phone,
                    json_agg(json_build_object('id', c.id, 'name', c.name, 'age', c.age)) as children
             FROM users u
             LEFT JOIN children c ON u.id = c.parent_id
             WHERE u.id != $1 AND u.is_active = true AND (u.email ILIKE $2 OR u.phone ILIKE $2)
             GROUP BY u.id, u.username, u.email, u.phone
             LIMIT 10`,
            [req.user.id, `%${q}%`]
        );
        client.release();

        // Process results to handle null children arrays
        const processedResults = result.rows.map(row => ({
            ...row,
            children: row.children.filter(child => child.id !== null)
        }));

        res.json({
            success: true,
            data: processedResults
        });
    } catch (error) {
        console.error('Search parents error:', error);
        res.status(500).json({ success: false, error: 'Failed to search parents' });
    }
});

app.post('/api/connections/request', authenticateToken, async (req, res) => {
    try {
        const { target_parent_id, child_id, target_child_id, message } = req.body;

        if (!target_parent_id || !child_id) {
            return res.status(400).json({ success: false, error: 'Target parent and child are required' });
        }

        const client = await pool.connect();
        
        // Verify the child belongs to this user
        const child = await client.query(
            'SELECT id FROM children WHERE id = $1 AND parent_id = $2',
            [child_id, req.user.id]
        );

        if (child.rows.length === 0) {
            client.release();
            return res.status(404).json({ success: false, error: 'Child not found' });
        }

        const result = await client.query(
            'INSERT INTO connection_requests (requester_id, target_parent_id, child_id, target_child_id, message, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [req.user.id, target_parent_id, child_id, target_child_id, message, 'pending']
        );
        client.release();

        res.json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Send connection request error:', error);
        res.status(500).json({ success: false, error: 'Failed to send connection request' });
    }
});

app.post('/api/connections/respond/:requestId', authenticateToken, async (req, res) => {
    try {
        const requestId = parseInt(req.params.requestId);
        const { action } = req.body;

        if (!['accept', 'reject'].includes(action)) {
            return res.status(400).json({ success: false, error: 'Invalid action' });
        }

        const client = await pool.connect();
        
        // Verify the request is for this user
        const request = await client.query(
            'SELECT * FROM connection_requests WHERE id = $1 AND target_parent_id = $2 AND status = $3',
            [requestId, req.user.id, 'pending']
        );

        if (request.rows.length === 0) {
            client.release();
            return res.status(404).json({ success: false, error: 'Connection request not found' });
        }

        const status = action === 'accept' ? 'accepted' : 'rejected';
        await client.query(
            'UPDATE connection_requests SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [status, requestId]
        );

        // If accepted, create the connection
        if (action === 'accept') {
            const req_data = request.rows[0];
            await client.query(
                'INSERT INTO connections (child1_id, child2_id, status) VALUES ($1, $2, $3)',
                [req_data.child_id, req_data.target_child_id || req_data.child_id, 'active']
            );
        }

        client.release();

        res.json({ success: true });
    } catch (error) {
        console.error('Respond to connection request error:', error);
        res.status(500).json({ success: false, error: 'Failed to respond to connection request' });
    }
});

// Start server
async function startServer() {
    try {
        await initializeDatabase();
        
        app.listen(PORT, () => {
            console.log('🚀 SMS & Email Backend Server with PostgreSQL Started!');
            console.log('📡 Server running on http://localhost:' + PORT);
            console.log('🔗 Health check: http://localhost:' + PORT + '/health');
            console.log('📱📧 Ready to handle SMS and Email requests');
            console.log('🗄️ Connected to PostgreSQL Database');
            console.log('\n📋 Available endpoints:');
            console.log('  GET  /health - Server health check');
            console.log('  POST /api/auth/login - User authentication');
            console.log('  POST /api/auth/register - User registration');
            console.log('  GET  /auth/verify - Token verification');
            console.log('  POST /auth/forgot-password - Password reset request');
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('\n🛑 Shutting down server...');
    try {
        await pool.end();
        console.log('✅ Database connection closed');
    } catch (error) {
        console.error('Error closing database:', error);
    }
    process.exit(0);
});

startServer();