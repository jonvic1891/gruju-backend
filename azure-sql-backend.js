require('dotenv').config();
const express = require('express');
const cors = require('cors');
const sql = require('mssql');
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

// Azure SQL Database Configuration
const dbConfig = {
    user: process.env.AZURE_SQL_USER || 'jonathan.roberts',
    password: process.env.AZURE_SQL_PASSWORD || 'Gruju1891',
    server: process.env.AZURE_SQL_SERVER || 'gruju.database.windows.net',
    database: process.env.AZURE_SQL_DATABASE || 'gruju_test',
    options: {
        encrypt: true, // Required for Azure SQL
        trustServerCertificate: false,
        enableArithAbort: true,
        connectionTimeout: 60000,
        requestTimeout: 60000
    },
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    }
};

// Global connection pool
let poolPromise;

// Initialize database connection with retry logic
async function initializeDatabase() {
    const maxRetries = 3;
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`🔄 Attempting to connect to Azure SQL Database (attempt ${attempt}/${maxRetries})...`);
            console.log(`📡 Connecting to: ${dbConfig.server}:1433`);
            console.log(`🗄️ Database: ${dbConfig.database}`);
            console.log(`👤 User: ${dbConfig.user}`);
            
            poolPromise = new sql.ConnectionPool(dbConfig).connect();
            const pool = await poolPromise;
            console.log('✅ Connected to Azure SQL Database successfully!');
            
            // Test the connection with a simple query
            await pool.request().query('SELECT 1 as test');
            console.log('✅ Database connection test query successful');
            
            // Create tables if they don't exist
            await createTables(pool);
            
            return pool;
        } catch (error) {
            lastError = error;
            console.error(`❌ Database connection attempt ${attempt} failed:`, error.message);
            
            if (attempt < maxRetries) {
                const delay = attempt * 5000; // 5s, 10s, 15s delays
                console.log(`⏳ Retrying in ${delay/1000} seconds...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    
    console.error('❌ All database connection attempts failed');
    throw lastError;
}

// Create database tables
async function createTables(pool) {
    try {
        console.log('🔧 Creating database tables...');
        
        // Users table
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='users' AND xtype='U')
            CREATE TABLE users (
                id INT IDENTITY(1,1) PRIMARY KEY,
                username NVARCHAR(50) UNIQUE NOT NULL,
                email NVARCHAR(255) UNIQUE NOT NULL,
                phone NVARCHAR(20),
                password_hash NVARCHAR(255) NOT NULL,
                role NVARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'super_admin')),
                is_active BIT DEFAULT 1,
                family_name NVARCHAR(100),
                created_at DATETIME2 DEFAULT GETDATE(),
                updated_at DATETIME2 DEFAULT GETDATE()
            )
        `);

        // Children table
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='children' AND xtype='U')
            CREATE TABLE children (
                id INT IDENTITY(1,1) PRIMARY KEY,
                name NVARCHAR(100) NOT NULL,
                parent_id INT NOT NULL,
                age INT,
                grade NVARCHAR(20),
                school NVARCHAR(100),
                interests NVARCHAR(500),
                created_at DATETIME2 DEFAULT GETDATE(),
                updated_at DATETIME2 DEFAULT GETDATE(),
                FOREIGN KEY (parent_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

        // Activities table
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='activities' AND xtype='U')
            CREATE TABLE activities (
                id INT IDENTITY(1,1) PRIMARY KEY,
                child_id INT NOT NULL,
                name NVARCHAR(200) NOT NULL,
                description NVARCHAR(1000),
                start_date DATE NOT NULL,
                end_date DATE,
                start_time TIME,
                end_time TIME,
                location NVARCHAR(200),
                website_url NVARCHAR(500),
                cost DECIMAL(10,2),
                max_participants INT,
                created_at DATETIME2 DEFAULT GETDATE(),
                updated_at DATETIME2 DEFAULT GETDATE(),
                FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE
            )
        `);

        // Connection requests table
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='connection_requests' AND xtype='U')
            CREATE TABLE connection_requests (
                id INT IDENTITY(1,1) PRIMARY KEY,
                requester_id INT NOT NULL,
                target_parent_id INT NOT NULL,
                child_id INT,
                target_child_id INT,
                status NVARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
                message NVARCHAR(1000),
                created_at DATETIME2 DEFAULT GETDATE(),
                updated_at DATETIME2 DEFAULT GETDATE(),
                FOREIGN KEY (requester_id) REFERENCES users(id),
                FOREIGN KEY (target_parent_id) REFERENCES users(id),
                FOREIGN KEY (child_id) REFERENCES children(id),
                FOREIGN KEY (target_child_id) REFERENCES children(id)
            )
        `);

        // Connections table
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='connections' AND xtype='U')
            CREATE TABLE connections (
                id INT IDENTITY(1,1) PRIMARY KEY,
                parent1_id INT NOT NULL,
                parent2_id INT NOT NULL,
                status NVARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'blocked')),
                created_at DATETIME2 DEFAULT GETDATE(),
                FOREIGN KEY (parent1_id) REFERENCES users(id),
                FOREIGN KEY (parent2_id) REFERENCES users(id),
                UNIQUE(parent1_id, parent2_id)
            )
        `);

        // SMS configurations table
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='sms_configurations' AND xtype='U')
            CREATE TABLE sms_configurations (
                id INT IDENTITY(1,1) PRIMARY KEY,
                name NVARCHAR(100) NOT NULL,
                environment NVARCHAR(20) DEFAULT 'development',
                account_sid NVARCHAR(255) NOT NULL,
                auth_token NVARCHAR(255) NOT NULL,
                phone_number NVARCHAR(20) NOT NULL,
                is_active BIT DEFAULT 0,
                created_by INT NOT NULL,
                created_at DATETIME2 DEFAULT GETDATE(),
                updated_at DATETIME2 DEFAULT GETDATE(),
                FOREIGN KEY (created_by) REFERENCES users(id)
            )
        `);

        // Email configurations table
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='email_configurations' AND xtype='U')
            CREATE TABLE email_configurations (
                id INT IDENTITY(1,1) PRIMARY KEY,
                name NVARCHAR(100) NOT NULL,
                environment NVARCHAR(20) DEFAULT 'development',
                api_key NVARCHAR(255) NOT NULL,
                from_email NVARCHAR(255) NOT NULL,
                from_name NVARCHAR(100),
                is_active BIT DEFAULT 0,
                created_by INT NOT NULL,
                created_at DATETIME2 DEFAULT GETDATE(),
                updated_at DATETIME2 DEFAULT GETDATE(),
                FOREIGN KEY (created_by) REFERENCES users(id)
            )
        `);

        // System logs table
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='system_logs' AND xtype='U')
            CREATE TABLE system_logs (
                id INT IDENTITY(1,1) PRIMARY KEY,
                level NVARCHAR(10) NOT NULL CHECK (level IN ('info', 'warn', 'error')),
                message NVARCHAR(1000) NOT NULL,
                user_id INT,
                metadata NVARCHAR(MAX),
                ip_address NVARCHAR(45),
                user_agent NVARCHAR(500),
                created_at DATETIME2 DEFAULT GETDATE(),
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        `);

        // Insert default admin user if not exists
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM users WHERE email = 'admin@parentactivityapp.com')
            INSERT INTO users (username, email, phone, password_hash, role, family_name)
            VALUES ('admin', 'admin@parentactivityapp.com', '+1555000001', 
                    '$2a$12$dummy.hash.for.demo.purposes', 'super_admin', 'Admin Family')
        `);

        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM users WHERE email = 'manager@parentactivityapp.com')
            INSERT INTO users (username, email, phone, password_hash, role, family_name)
            VALUES ('manager', 'manager@parentactivityapp.com', '+1555000002', 
                    '$2a$12$dummy.hash.for.demo.purposes', 'admin', 'Manager Family')
        `);

        console.log('✅ Database tables created successfully');
    } catch (error) {
        console.error('❌ Error creating tables:', error);
        throw error;
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
        const pool = await poolPromise;
        await pool.request()
            .input('level', sql.NVarChar, level)
            .input('message', sql.NVarChar, message)
            .input('user_id', sql.Int, userId)
            .input('metadata', sql.NVarChar, metadata ? JSON.stringify(metadata) : null)
            .input('ip_address', sql.NVarChar, req ? req.ip : null)
            .input('user_agent', sql.NVarChar, req ? req.get('User-Agent') : null)
            .query(`
                INSERT INTO system_logs (level, message, user_id, metadata, ip_address, user_agent)
                VALUES (@level, @message, @user_id, @metadata, @ip_address, @user_agent)
            `);
    } catch (error) {
        console.error('Logging error:', error);
    }
}

// Health check endpoint
app.get('/health', async (req, res) => {
    try {
        const pool = await poolPromise;
        await pool.request().query('SELECT 1');
        res.json({
            status: 'OK',
            message: 'SMS & Email Backend with Azure SQL Database is running',
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

// Database status endpoint (for demo app)
app.get('/database/status', async (req, res) => {
    try {
        const pool = await poolPromise;
        
        // Test database connection and get counts
        await pool.request().query('SELECT 1');
        
        const userCount = await pool.request().query('SELECT COUNT(*) as count FROM users');
        const childCount = await pool.request().query('SELECT COUNT(*) as count FROM children');
        const activityCount = await pool.request().query('SELECT COUNT(*) as count FROM activities');
        const connectionCount = await pool.request().query('SELECT COUNT(*) as count FROM connections');
        
        res.json({
            success: true,
            status: 'connected',
            message: 'Database is connected and operational',
            data: {
                connectionStatus: 'connected',
                currentMode: 'demo',
                type: 'Azure SQL Database',
                name: 'gruju_test',
                server: 'gruju.database.windows.net',
                userCount: userCount.recordset[0].count,
                childCount: childCount.recordset[0].count,
                activityCount: activityCount.recordset[0].count,
                connectionCount: connectionCount.recordset[0].count,
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

        const pool = await poolPromise;
        const result = await pool.request()
            .input('email', sql.NVarChar, email)
            .query('SELECT * FROM users WHERE email = @email AND is_active = 1');

        if (result.recordset.length === 0) {
            await logActivity('warn', `Failed login attempt for ${email}`, null, null, req);
            return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }

        const user = result.recordset[0];
        
        // For demo purposes, accept 'demo123' as password for all demo accounts
        const isValidPassword = password === 'demo123' || 
            await bcrypt.compare(password, user.password_hash);

        if (!isValidPassword) {
            await logActivity('warn', `Failed login attempt for ${email}`, null, null, req);
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

        const pool = await poolPromise;
        
        // Check if email already exists (email must be unique)
        const existingUser = await pool.request()
            .input('email', sql.NVarChar, email)
            .query('SELECT id FROM users WHERE email = @email');

        if (existingUser.recordset.length > 0) {
            return res.status(400).json({ success: false, error: 'An account with this email address already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const result = await pool.request()
            .input('username', sql.NVarChar, username)
            .input('email', sql.NVarChar, email)
            .input('phone', sql.NVarChar, phone)
            .input('password_hash', sql.NVarChar, hashedPassword)
            .input('family_name', sql.NVarChar, family_name)
            .query(`
                INSERT INTO users (username, email, phone, password_hash, family_name)
                OUTPUT INSERTED.id, INSERTED.username, INSERTED.email, INSERTED.phone, INSERTED.role, INSERTED.family_name
                VALUES (@username, @email, @phone, @password_hash, @family_name)
            `);

        const newUser = result.recordset[0];
        
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

// ===== ADMIN ENDPOINTS =====

// Get all users (admin only)
app.get('/api/admin/users', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const search = req.query.search || '';
        const offset = (page - 1) * limit;

        const pool = await poolPromise;
        
        let whereClause = 'WHERE 1=1';
        if (search) {
            whereClause += ` AND (username LIKE '%${search}%' OR email LIKE '%${search}%' OR phone LIKE '%${search}%' OR family_name LIKE '%${search}%')`;
        }

        const countResult = await pool.request()
            .query(`SELECT COUNT(*) as total FROM users ${whereClause}`);

        const usersResult = await pool.request()
            .query(`
                SELECT id, username, email, phone, role, is_active, family_name, created_at, updated_at
                FROM users 
                ${whereClause}
                ORDER BY created_at DESC
                OFFSET ${offset} ROWS
                FETCH NEXT ${limit} ROWS ONLY
            `);

        const total = countResult.recordset[0].total;
        const pages = Math.ceil(total / limit);

        await logActivity('info', `Admin viewed users list`, req.user.id, { search, page }, req);

        res.json({
            success: true,
            data: {
                users: usersResult.recordset,
                pagination: {
                    page,
                    limit,
                    total,
                    pages
                }
            }
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        await logActivity('error', `Error fetching users: ${error.message}`, req.user.id, null, req);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// Update user role (super admin only)
app.put('/api/admin/users/:id/role', authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const { role } = req.body;

        if (!['user', 'admin', 'super_admin'].includes(role)) {
            return res.status(400).json({ error: 'Invalid role specified' });
        }

        if (userId === req.user.id) {
            return res.status(400).json({ error: 'Cannot change your own role' });
        }

        const pool = await poolPromise;
        const result = await pool.request()
            .input('userId', sql.Int, userId)
            .input('role', sql.NVarChar, role)
            .query(`
                UPDATE users 
                SET role = @role, updated_at = GETDATE()
                OUTPUT INSERTED.id, INSERTED.username, INSERTED.email, INSERTED.role, INSERTED.updated_at
                WHERE id = @userId
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        await logActivity('info', `User role updated to ${role}`, req.user.id, { targetUserId: userId, newRole: role }, req);

        res.json({
            success: true,
            data: result.recordset[0],
            message: 'User role updated successfully'
        });
    } catch (error) {
        console.error('Error updating user role:', error);
        await logActivity('error', `Error updating user role: ${error.message}`, req.user.id, null, req);
        res.status(500).json({ error: 'Failed to update user role' });
    }
});

// Update user status (activate/deactivate)
app.put('/api/admin/users/:id/status', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const { isActive } = req.body;

        if (userId === req.user.id) {
            return res.status(400).json({ error: 'Cannot deactivate your own account' });
        }

        const pool = await poolPromise;
        const result = await pool.request()
            .input('userId', sql.Int, userId)
            .input('isActive', sql.Bit, isActive)
            .query(`
                UPDATE users 
                SET is_active = @isActive, updated_at = GETDATE()
                OUTPUT INSERTED.id, INSERTED.username, INSERTED.email, INSERTED.is_active, INSERTED.updated_at
                WHERE id = @userId
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        await logActivity('info', `User ${isActive ? 'activated' : 'deactivated'}`, req.user.id, { targetUserId: userId }, req);

        res.json({
            success: true,
            data: result.recordset[0],
            message: `User ${isActive ? 'activated' : 'deactivated'} successfully`
        });
    } catch (error) {
        console.error('Error updating user status:', error);
        await logActivity('error', `Error updating user status: ${error.message}`, req.user.id, null, req);
        res.status(500).json({ error: 'Failed to update user status' });
    }
});

// Delete user (super admin only)
app.delete('/api/admin/users/:id', authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
        const userId = parseInt(req.params.id);

        if (userId === req.user.id) {
            return res.status(400).json({ error: 'Cannot delete your own account' });
        }

        const pool = await poolPromise;
        const result = await pool.request()
            .input('userId', sql.Int, userId)
            .query('DELETE FROM users WHERE id = @userId');

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        await logActivity('info', `User deleted`, req.user.id, { targetUserId: userId }, req);

        res.json({
            success: true,
            message: 'User deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting user:', error);
        await logActivity('error', `Error deleting user: ${error.message}`, req.user.id, null, req);
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

// Get system statistics
app.get('/api/admin/stats', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const pool = await poolPromise;
        
        const stats = await pool.request().query(`
            SELECT 
                (SELECT COUNT(*) FROM users) as total_users,
                (SELECT COUNT(*) FROM users WHERE is_active = 1) as active_users,
                (SELECT COUNT(*) FROM users WHERE created_at >= DATEADD(day, -7, GETDATE())) as new_users_week,
                (SELECT COUNT(*) FROM users WHERE role IN ('admin', 'super_admin')) as admin_users,
                (SELECT COUNT(*) FROM children) as total_children,
                (SELECT COUNT(*) FROM activities) as total_activities,
                (SELECT COUNT(*) FROM activities WHERE start_date >= CAST(GETDATE() AS DATE)) as upcoming_activities,
                (SELECT COUNT(*) FROM connections) as total_connections,
                (SELECT COUNT(*) FROM connection_requests WHERE status = 'pending') as pending_connections
        `);

        const result = stats.recordset[0];
        
        res.json({
            success: true,
            data: {
                users: {
                    total: result.total_users,
                    active: result.active_users,
                    new_users_week: result.new_users_week,
                    admin_users: result.admin_users
                },
                children: {
                    total: result.total_children
                },
                activities: {
                    total: result.total_activities,
                    upcoming_activities: result.upcoming_activities
                },
                connections: {
                    total: result.total_connections,
                    pending_connections: result.pending_connections
                }
            }
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
});

// Get system logs (admin only)
app.get('/api/admin/logs', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const level = req.query.level;
        const page = parseInt(req.query.page) || 1;
        const offset = (page - 1) * limit;

        const pool = await poolPromise;
        
        let whereClause = '';
        if (level) {
            whereClause = `WHERE level = '${level}'`;
        }

        const logsResult = await pool.request().query(`
            SELECT l.*, u.username, u.email 
            FROM system_logs l
            LEFT JOIN users u ON l.user_id = u.id
            ${whereClause}
            ORDER BY l.created_at DESC
            OFFSET ${offset} ROWS
            FETCH NEXT ${limit} ROWS ONLY
        `);

        const countResult = await pool.request().query(`
            SELECT COUNT(*) as total FROM system_logs ${whereClause}
        `);

        res.json({
            success: true,
            data: {
                logs: logsResult.recordset,
                pagination: {
                    page,
                    limit,
                    total: countResult.recordset[0].total
                }
            }
        });
    } catch (error) {
        console.error('Error fetching logs:', error);
        res.status(500).json({ error: 'Failed to fetch logs' });
    }
});

// Auth verification endpoint
app.get('/auth/verify', authenticateToken, async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('userId', sql.Int, req.user.id)
            .query('SELECT id, username, email, role, family_name FROM users WHERE id = @userId AND is_active = 1');

        if (result.recordset.length === 0) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        res.json({
            success: true,
            data: result.recordset[0]
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

        const pool = await poolPromise;
        const user = await pool.request()
            .input('email', sql.NVarChar, email)
            .query('SELECT id, username FROM users WHERE email = @email AND is_active = 1');

        if (user.recordset.length === 0) {
            // Don't reveal if email exists or not for security
            return res.json({
                success: true,
                message: 'If an account with this email exists, password reset instructions have been sent.'
            });
        }

        await logActivity('info', `Password reset requested for ${email}`, user.recordset[0].id, null, req);

        // In a real app, you would send an email with reset link
        res.json({
            success: true,
            message: 'If an account with this email exists, password reset instructions have been sent.'
        });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ success: false, error: 'Failed to process password reset request' });
    }
});

// ===== USER ENDPOINTS =====

// Update profile endpoint
app.put('/users/profile', authenticateToken, async (req, res) => {
    try {
        const { username, email, phone } = req.body;
        const userId = req.user.id;

        if (!username || !email) {
            return res.status(400).json({ success: false, error: 'Username and email are required' });
        }

        // Check if email is already used by another user
        const pool = await poolPromise;
        const existingUser = await pool.request()
            .input('email', sql.NVarChar, email)
            .input('userId', sql.Int, userId)
            .query('SELECT id FROM users WHERE email = @email AND id != @userId');

        if (existingUser.recordset.length > 0) {
            return res.status(400).json({ success: false, error: 'Email already in use by another account' });
        }

        const result = await pool.request()
            .input('userId', sql.Int, userId)
            .input('username', sql.NVarChar, username)
            .input('email', sql.NVarChar, email)
            .input('phone', sql.NVarChar, phone)
            .query(`
                UPDATE users 
                SET username = @username, email = @email, phone = @phone, updated_at = GETDATE()
                OUTPUT INSERTED.id, INSERTED.username, INSERTED.email, INSERTED.phone, INSERTED.role
                WHERE id = @userId
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        await logActivity('info', `Profile updated`, userId, null, req);

        res.json({
            success: true,
            data: result.recordset[0]
        });
    } catch (error) {
        console.error('Profile update error:', error);
        await logActivity('error', `Profile update error: ${error.message}`, req.user?.id, null, req);
        res.status(500).json({ success: false, error: 'Failed to update profile' });
    }
});

// Change password endpoint
app.post('/users/change-password', authenticateToken, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user.id;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ success: false, error: 'Current and new passwords are required' });
        }

        const pool = await poolPromise;
        const user = await pool.request()
            .input('userId', sql.Int, userId)
            .query('SELECT password_hash FROM users WHERE id = @userId');

        if (user.recordset.length === 0) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        // Verify current password
        const isValidPassword = currentPassword === 'demo123' || 
            await bcrypt.compare(currentPassword, user.recordset[0].password_hash);

        if (!isValidPassword) {
            return res.status(400).json({ success: false, error: 'Current password is incorrect' });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 12);

        await pool.request()
            .input('userId', sql.Int, userId)
            .input('passwordHash', sql.NVarChar, hashedPassword)
            .query('UPDATE users SET password_hash = @passwordHash, updated_at = GETDATE() WHERE id = @userId');

        await logActivity('info', `Password changed`, userId, null, req);

        res.json({
            success: true,
            message: 'Password updated successfully'
        });
    } catch (error) {
        console.error('Change password error:', error);
        await logActivity('error', `Change password error: ${error.message}`, req.user?.id, null, req);
        res.status(500).json({ success: false, error: 'Failed to change password' });
    }
});

// ===== CHILDREN ENDPOINTS =====

// Get user's children
app.get('/children', authenticateToken, async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('parentId', sql.Int, req.user.id)
            .query(`
                SELECT id, name, age, grade, school, interests, created_at, updated_at
                FROM children 
                WHERE parent_id = @parentId
                ORDER BY created_at ASC
            `);

        res.json({
            success: true,
            data: result.recordset
        });
    } catch (error) {
        console.error('Get children error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch children' });
    }
});

// Create child
app.post('/children', authenticateToken, async (req, res) => {
    try {
        const { name, age, grade, school, interests } = req.body;

        if (!name) {
            return res.status(400).json({ success: false, error: 'Child name is required' });
        }

        const pool = await poolPromise;
        const result = await pool.request()
            .input('name', sql.NVarChar, name)
            .input('parentId', sql.Int, req.user.id)
            .input('age', sql.Int, age)
            .input('grade', sql.NVarChar, grade)
            .input('school', sql.NVarChar, school)
            .input('interests', sql.NVarChar, interests)
            .query(`
                INSERT INTO children (name, parent_id, age, grade, school, interests)
                OUTPUT INSERTED.id, INSERTED.name, INSERTED.age, INSERTED.grade, INSERTED.school, INSERTED.interests, INSERTED.created_at
                VALUES (@name, @parentId, @age, @grade, @school, @interests)
            `);

        await logActivity('info', `Child created: ${name}`, req.user.id, null, req);

        res.json({
            success: true,
            data: result.recordset[0]
        });
    } catch (error) {
        console.error('Create child error:', error);
        await logActivity('error', `Create child error: ${error.message}`, req.user.id, null, req);
        res.status(500).json({ success: false, error: 'Failed to create child' });
    }
});

// Update child
app.put('/children/:id', authenticateToken, async (req, res) => {
    try {
        const childId = parseInt(req.params.id);
        const { name, age, grade, school, interests } = req.body;

        if (!name) {
            return res.status(400).json({ success: false, error: 'Child name is required' });
        }

        const pool = await poolPromise;
        const result = await pool.request()
            .input('childId', sql.Int, childId)
            .input('parentId', sql.Int, req.user.id)
            .input('name', sql.NVarChar, name)
            .input('age', sql.Int, age)
            .input('grade', sql.NVarChar, grade)
            .input('school', sql.NVarChar, school)
            .input('interests', sql.NVarChar, interests)
            .query(`
                UPDATE children 
                SET name = @name, age = @age, grade = @grade, school = @school, interests = @interests, updated_at = GETDATE()
                OUTPUT INSERTED.id, INSERTED.name, INSERTED.age, INSERTED.grade, INSERTED.school, INSERTED.interests, INSERTED.updated_at
                WHERE id = @childId AND parent_id = @parentId
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ success: false, error: 'Child not found or access denied' });
        }

        await logActivity('info', `Child updated: ${name}`, req.user.id, { childId }, req);

        res.json({
            success: true,
            data: result.recordset[0]
        });
    } catch (error) {
        console.error('Update child error:', error);
        await logActivity('error', `Update child error: ${error.message}`, req.user.id, null, req);
        res.status(500).json({ success: false, error: 'Failed to update child' });
    }
});

// Delete child
app.delete('/children/:id', authenticateToken, async (req, res) => {
    try {
        const childId = parseInt(req.params.id);

        const pool = await poolPromise;
        const result = await pool.request()
            .input('childId', sql.Int, childId)
            .input('parentId', sql.Int, req.user.id)
            .query('DELETE FROM children WHERE id = @childId AND parent_id = @parentId');

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ success: false, error: 'Child not found or access denied' });
        }

        await logActivity('info', `Child deleted`, req.user.id, { childId }, req);

        res.json({
            success: true,
            message: 'Child deleted successfully'
        });
    } catch (error) {
        console.error('Delete child error:', error);
        await logActivity('error', `Delete child error: ${error.message}`, req.user.id, null, req);
        res.status(500).json({ success: false, error: 'Failed to delete child' });
    }
});

// ===== ACTIVITIES ENDPOINTS =====

// Get activities for a specific child
app.get('/children/:id/activities', authenticateToken, async (req, res) => {
    try {
        const childId = parseInt(req.params.id);

        const pool = await poolPromise;
        
        // Verify child belongs to user
        const childCheck = await pool.request()
            .input('childId', sql.Int, childId)
            .input('parentId', sql.Int, req.user.id)
            .query('SELECT id FROM children WHERE id = @childId AND parent_id = @parentId');

        if (childCheck.recordset.length === 0) {
            return res.status(404).json({ success: false, error: 'Child not found or access denied' });
        }

        const result = await pool.request()
            .input('childId', sql.Int, childId)
            .query(`
                SELECT id, name, description, start_date, end_date, start_time, end_time, 
                       location, website_url, cost, max_participants, created_at, updated_at
                FROM activities 
                WHERE child_id = @childId
                ORDER BY start_date ASC, start_time ASC
            `);

        res.json({
            success: true,
            data: result.recordset
        });
    } catch (error) {
        console.error('Get activities error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch activities' });
    }
});

// Create activity for a child
app.post('/children/:id/activities', authenticateToken, async (req, res) => {
    try {
        const childId = parseInt(req.params.id);
        const { name, description, start_date, end_date, start_time, end_time, location, website_url, cost, max_participants } = req.body;

        if (!name || !start_date) {
            return res.status(400).json({ success: false, error: 'Activity name and start date are required' });
        }

        const pool = await poolPromise;
        
        // Verify child belongs to user
        const childCheck = await pool.request()
            .input('childId', sql.Int, childId)
            .input('parentId', sql.Int, req.user.id)
            .query('SELECT id FROM children WHERE id = @childId AND parent_id = @parentId');

        if (childCheck.recordset.length === 0) {
            return res.status(404).json({ success: false, error: 'Child not found or access denied' });
        }

        const result = await pool.request()
            .input('childId', sql.Int, childId)
            .input('name', sql.NVarChar, name)
            .input('description', sql.NVarChar, description)
            .input('startDate', sql.Date, start_date)
            .input('endDate', sql.Date, end_date)
            .input('startTime', sql.Time, start_time)
            .input('endTime', sql.Time, end_time)
            .input('location', sql.NVarChar, location)
            .input('websiteUrl', sql.NVarChar, website_url)
            .input('cost', sql.Decimal(10, 2), cost)
            .input('maxParticipants', sql.Int, max_participants)
            .query(`
                INSERT INTO activities (child_id, name, description, start_date, end_date, start_time, end_time, location, website_url, cost, max_participants)
                OUTPUT INSERTED.id, INSERTED.name, INSERTED.description, INSERTED.start_date, INSERTED.end_date, 
                       INSERTED.start_time, INSERTED.end_time, INSERTED.location, INSERTED.website_url, 
                       INSERTED.cost, INSERTED.max_participants, INSERTED.created_at
                VALUES (@childId, @name, @description, @startDate, @endDate, @startTime, @endTime, @location, @websiteUrl, @cost, @maxParticipants)
            `);

        await logActivity('info', `Activity created: ${name}`, req.user.id, { childId }, req);

        res.json({
            success: true,
            data: result.recordset[0]
        });
    } catch (error) {
        console.error('Create activity error:', error);
        await logActivity('error', `Create activity error: ${error.message}`, req.user.id, null, req);
        res.status(500).json({ success: false, error: 'Failed to create activity' });
    }
});

// Update activity
app.put('/activities/:id', authenticateToken, async (req, res) => {
    try {
        const activityId = parseInt(req.params.id);
        const { name, description, start_date, end_date, start_time, end_time, location, website_url, cost, max_participants } = req.body;

        if (!name || !start_date) {
            return res.status(400).json({ success: false, error: 'Activity name and start date are required' });
        }

        const pool = await poolPromise;
        
        // Verify activity belongs to user's child
        const activityCheck = await pool.request()
            .input('activityId', sql.Int, activityId)
            .input('parentId', sql.Int, req.user.id)
            .query(`
                SELECT a.id FROM activities a
                INNER JOIN children c ON a.child_id = c.id
                WHERE a.id = @activityId AND c.parent_id = @parentId
            `);

        if (activityCheck.recordset.length === 0) {
            return res.status(404).json({ success: false, error: 'Activity not found or access denied' });
        }

        const result = await pool.request()
            .input('activityId', sql.Int, activityId)
            .input('name', sql.NVarChar, name)
            .input('description', sql.NVarChar, description)
            .input('startDate', sql.Date, start_date)
            .input('endDate', sql.Date, end_date)
            .input('startTime', sql.Time, start_time)
            .input('endTime', sql.Time, end_time)
            .input('location', sql.NVarChar, location)
            .input('websiteUrl', sql.NVarChar, website_url)
            .input('cost', sql.Decimal(10, 2), cost)
            .input('maxParticipants', sql.Int, max_participants)
            .query(`
                UPDATE activities 
                SET name = @name, description = @description, start_date = @startDate, end_date = @endDate,
                    start_time = @startTime, end_time = @endTime, location = @location, website_url = @websiteUrl,
                    cost = @cost, max_participants = @maxParticipants, updated_at = GETDATE()
                OUTPUT INSERTED.id, INSERTED.name, INSERTED.description, INSERTED.start_date, INSERTED.end_date,
                       INSERTED.start_time, INSERTED.end_time, INSERTED.location, INSERTED.website_url,
                       INSERTED.cost, INSERTED.max_participants, INSERTED.updated_at
                WHERE id = @activityId
            `);

        await logActivity('info', `Activity updated: ${name}`, req.user.id, { activityId }, req);

        res.json({
            success: true,
            data: result.recordset[0]
        });
    } catch (error) {
        console.error('Update activity error:', error);
        await logActivity('error', `Update activity error: ${error.message}`, req.user.id, null, req);
        res.status(500).json({ success: false, error: 'Failed to update activity' });
    }
});

// Delete activity
app.delete('/activities/:id', authenticateToken, async (req, res) => {
    try {
        const activityId = parseInt(req.params.id);

        const pool = await poolPromise;
        
        // Verify activity belongs to user's child
        const activityCheck = await pool.request()
            .input('activityId', sql.Int, activityId)
            .input('parentId', sql.Int, req.user.id)
            .query(`
                SELECT a.id FROM activities a
                INNER JOIN children c ON a.child_id = c.id
                WHERE a.id = @activityId AND c.parent_id = @parentId
            `);

        if (activityCheck.recordset.length === 0) {
            return res.status(404).json({ success: false, error: 'Activity not found or access denied' });
        }

        const result = await pool.request()
            .input('activityId', sql.Int, activityId)
            .query('DELETE FROM activities WHERE id = @activityId');

        await logActivity('info', `Activity deleted`, req.user.id, { activityId }, req);

        res.json({
            success: true,
            message: 'Activity deleted successfully'
        });
    } catch (error) {
        console.error('Delete activity error:', error);
        await logActivity('error', `Delete activity error: ${error.message}`, req.user.id, null, req);
        res.status(500).json({ success: false, error: 'Failed to delete activity' });
    }
});

// ===== CONNECTIONS ENDPOINTS =====

// Search for parents
app.get('/connections/search', authenticateToken, async (req, res) => {
    try {
        const query = req.query.q;
        
        if (!query || query.length < 2) {
            return res.status(400).json({ success: false, error: 'Search query must be at least 2 characters' });
        }

        const pool = await poolPromise;
        const result = await pool.request()
            .input('query', sql.NVarChar, `%${query}%`)
            .input('currentUserId', sql.Int, req.user.id)
            .query(`
                SELECT u.id, u.username, u.email, u.family_name,
                       (SELECT COUNT(*) FROM children WHERE parent_id = u.id) as child_count
                FROM users u
                WHERE (u.username LIKE @query OR u.email LIKE @query OR u.family_name LIKE @query)
                  AND u.id != @currentUserId
                  AND u.is_active = 1
                ORDER BY u.family_name, u.username
            `);

        res.json({
            success: true,
            data: result.recordset
        });
    } catch (error) {
        console.error('Search parents error:', error);
        res.status(500).json({ success: false, error: 'Failed to search parents' });
    }
});

// Send connection request
app.post('/connections/request', authenticateToken, async (req, res) => {
    try {
        const { target_parent_id, child_id, target_child_id, message } = req.body;

        if (!target_parent_id || !child_id) {
            return res.status(400).json({ success: false, error: 'Target parent and child are required' });
        }

        const pool = await poolPromise;

        // Check if connection request already exists
        const existingRequest = await pool.request()
            .input('requesterId', sql.Int, req.user.id)
            .input('targetParentId', sql.Int, target_parent_id)
            .query(`
                SELECT id FROM connection_requests 
                WHERE requester_id = @requesterId AND target_parent_id = @targetParentId AND status = 'pending'
            `);

        if (existingRequest.recordset.length > 0) {
            return res.status(400).json({ success: false, error: 'Connection request already pending' });
        }

        const result = await pool.request()
            .input('requesterId', sql.Int, req.user.id)
            .input('targetParentId', sql.Int, target_parent_id)
            .input('childId', sql.Int, child_id)
            .input('targetChildId', sql.Int, target_child_id)
            .input('message', sql.NVarChar, message)
            .query(`
                INSERT INTO connection_requests (requester_id, target_parent_id, child_id, target_child_id, message)
                OUTPUT INSERTED.id, INSERTED.requester_id, INSERTED.target_parent_id, INSERTED.child_id, 
                       INSERTED.target_child_id, INSERTED.message, INSERTED.status, INSERTED.created_at
                VALUES (@requesterId, @targetParentId, @childId, @targetChildId, @message)
            `);

        await logActivity('info', `Connection request sent`, req.user.id, { targetParentId: target_parent_id }, req);

        res.json({
            success: true,
            data: result.recordset[0]
        });
    } catch (error) {
        console.error('Send connection request error:', error);
        await logActivity('error', `Send connection request error: ${error.message}`, req.user.id, null, req);
        res.status(500).json({ success: false, error: 'Failed to send connection request' });
    }
});

// Get connection requests (received)
app.get('/connections/requests', authenticateToken, async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('userId', sql.Int, req.user.id)
            .query(`
                SELECT cr.id, cr.requester_id, cr.child_id, cr.target_child_id, cr.message, cr.status, cr.created_at,
                       u.username as requester_username, u.family_name as requester_family_name,
                       c1.name as child_name, c2.name as target_child_name
                FROM connection_requests cr
                INNER JOIN users u ON cr.requester_id = u.id
                LEFT JOIN children c1 ON cr.child_id = c1.id
                LEFT JOIN children c2 ON cr.target_child_id = c2.id
                WHERE cr.target_parent_id = @userId
                ORDER BY cr.created_at DESC
            `);

        res.json({
            success: true,
            data: result.recordset
        });
    } catch (error) {
        console.error('Get connection requests error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch connection requests' });
    }
});

// Respond to connection request
app.post('/connections/requests/:id/:action', authenticateToken, async (req, res) => {
    try {
        const requestId = parseInt(req.params.id);
        const action = req.params.action;

        if (!['accept', 'reject'].includes(action)) {
            return res.status(400).json({ success: false, error: 'Invalid action' });
        }

        const pool = await poolPromise;

        // Verify request belongs to user
        const requestCheck = await pool.request()
            .input('requestId', sql.Int, requestId)
            .input('userId', sql.Int, req.user.id)
            .query(`
                SELECT requester_id, target_parent_id FROM connection_requests 
                WHERE id = @requestId AND target_parent_id = @userId AND status = 'pending'
            `);

        if (requestCheck.recordset.length === 0) {
            return res.status(404).json({ success: false, error: 'Connection request not found or already processed' });
        }

        const request = requestCheck.recordset[0];
        const status = action === 'accept' ? 'accepted' : 'declined';

        // Update request status
        await pool.request()
            .input('requestId', sql.Int, requestId)
            .input('status', sql.NVarChar, status)
            .query('UPDATE connection_requests SET status = @status, updated_at = GETDATE() WHERE id = @requestId');

        // If accepted, create connection
        if (action === 'accept') {
            await pool.request()
                .input('parent1Id', sql.Int, request.requester_id)
                .input('parent2Id', sql.Int, request.target_parent_id)
                .query(`
                    IF NOT EXISTS (SELECT 1 FROM connections WHERE 
                        (parent1_id = @parent1Id AND parent2_id = @parent2Id) OR
                        (parent1_id = @parent2Id AND parent2_id = @parent1Id))
                    INSERT INTO connections (parent1_id, parent2_id) VALUES (@parent1Id, @parent2Id)
                `);
        }

        await logActivity('info', `Connection request ${status}`, req.user.id, { requestId }, req);

        res.json({
            success: true,
            message: `Connection request ${status} successfully`
        });
    } catch (error) {
        console.error('Respond to connection request error:', error);
        await logActivity('error', `Respond to connection request error: ${error.message}`, req.user.id, null, req);
        res.status(500).json({ success: false, error: 'Failed to respond to connection request' });
    }
});

// Get user's connections
app.get('/connections', authenticateToken, async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('userId', sql.Int, req.user.id)
            .query(`
                SELECT c.id, c.status, c.created_at,
                       CASE 
                           WHEN c.parent1_id = @userId THEN u2.id
                           ELSE u1.id
                       END as connected_parent_id,
                       CASE 
                           WHEN c.parent1_id = @userId THEN u2.username
                           ELSE u1.username
                       END as connected_username,
                       CASE 
                           WHEN c.parent1_id = @userId THEN u2.family_name
                           ELSE u1.family_name
                       END as connected_family_name,
                       CASE 
                           WHEN c.parent1_id = @userId THEN u2.email
                           ELSE u1.email
                       END as connected_email
                FROM connections c
                INNER JOIN users u1 ON c.parent1_id = u1.id
                INNER JOIN users u2 ON c.parent2_id = u2.id
                WHERE c.parent1_id = @userId OR c.parent2_id = @userId
                ORDER BY c.created_at DESC
            `);

        res.json({
            success: true,
            data: result.recordset
        });
    } catch (error) {
        console.error('Get connections error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch connections' });
    }
});

// Delete connection
app.delete('/connections/:id', authenticateToken, async (req, res) => {
    try {
        const connectionId = parseInt(req.params.id);

        const pool = await poolPromise;
        const result = await pool.request()
            .input('connectionId', sql.Int, connectionId)
            .input('userId', sql.Int, req.user.id)
            .query('DELETE FROM connections WHERE id = @connectionId AND (parent1_id = @userId OR parent2_id = @userId)');

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ success: false, error: 'Connection not found or access denied' });
        }

        await logActivity('info', `Connection deleted`, req.user.id, { connectionId }, req);

        res.json({
            success: true,
            message: 'Connection deleted successfully'
        });
    } catch (error) {
        console.error('Delete connection error:', error);
        await logActivity('error', `Delete connection error: ${error.message}`, req.user.id, null, req);
        res.status(500).json({ success: false, error: 'Failed to delete connection' });
    }
});

// ===== CALENDAR ENDPOINTS =====

// Get calendar activities for user's children
app.get('/calendar/activities', authenticateToken, async (req, res) => {
    try {
        const startDate = req.query.start;
        const endDate = req.query.end;

        if (!startDate || !endDate) {
            return res.status(400).json({ success: false, error: 'Start and end dates are required' });
        }

        const pool = await poolPromise;
        const result = await pool.request()
            .input('parentId', sql.Int, req.user.id)
            .input('startDate', sql.Date, startDate)
            .input('endDate', sql.Date, endDate)
            .query(`
                SELECT a.id, a.name, a.description, a.start_date, a.end_date, a.start_time, a.end_time,
                       a.location, a.website_url, a.cost, c.name as child_name, c.id as child_id
                FROM activities a
                INNER JOIN children c ON a.child_id = c.id
                WHERE c.parent_id = @parentId
                  AND a.start_date >= @startDate 
                  AND a.start_date <= @endDate
                ORDER BY a.start_date ASC, a.start_time ASC
            `);

        res.json({
            success: true,
            data: result.recordset
        });
    } catch (error) {
        console.error('Get calendar activities error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch calendar activities' });
    }
});

// Get connected children activities
app.get('/calendar/connected-activities', authenticateToken, async (req, res) => {
    try {
        const startDate = req.query.start;
        const endDate = req.query.end;

        if (!startDate || !endDate) {
            return res.status(400).json({ success: false, error: 'Start and end dates are required' });
        }

        const pool = await poolPromise;
        const result = await pool.request()
            .input('userId', sql.Int, req.user.id)
            .input('startDate', sql.Date, startDate)
            .input('endDate', sql.Date, endDate)
            .query(`
                SELECT a.id, a.name, a.description, a.start_date, a.end_date, a.start_time, a.end_time,
                       a.location, a.website_url, a.cost, c.name as child_name, c.id as child_id,
                       u.username as parent_username, u.family_name as parent_family_name
                FROM activities a
                INNER JOIN children c ON a.child_id = c.id
                INNER JOIN users u ON c.parent_id = u.id
                INNER JOIN connections conn ON (
                    (conn.parent1_id = @userId AND conn.parent2_id = u.id) OR
                    (conn.parent2_id = @userId AND conn.parent1_id = u.id)
                )
                WHERE conn.status = 'active'
                  AND a.start_date >= @startDate 
                  AND a.start_date <= @endDate
                ORDER BY a.start_date ASC, a.start_time ASC
            `);

        res.json({
            success: true,
            data: result.recordset
        });
    } catch (error) {
        console.error('Get connected activities error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch connected activities' });
    }
});

// ===== SMS ENDPOINTS =====

// SMS sending endpoint
app.post('/api/sms/send', async (req, res) => {
    try {
        console.log('📤 SMS Send Request:', {
            from: req.body.from,
            to: req.body.to,
            messageLength: req.body.message?.length
        });

        const { accountSid, authToken, from, to, message } = req.body;

        if (!accountSid || !authToken || !from || !to || !message) {
            return res.status(400).json({
                error: 'Missing required fields: accountSid, authToken, from, to, message'
            });
        }

        // Initialize Twilio client
        const client = twilio(accountSid, authToken);

        // Send SMS using Twilio
        const twilioMessage = await client.messages.create({
            body: message,
            from: from,
            to: to
        });

        console.log('✅ SMS Result:', {
            sid: twilioMessage.sid,
            status: twilioMessage.status
        });

        // Log SMS activity
        await logActivity('info', `SMS sent to ${to}`, req.user?.id, { messageId: twilioMessage.sid });

        res.json({
            messageId: twilioMessage.sid,
            status: twilioMessage.status,
            to: twilioMessage.to,
            from: twilioMessage.from,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ SMS Error:', error);
        await logActivity('error', `SMS send failed: ${error.message}`, req.user?.id);
        res.status(500).json({
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// SMS connection test endpoint
app.post('/api/sms/test-connection', async (req, res) => {
    try {
        console.log('🔧 Testing Twilio Connection...');

        const { accountSid, authToken, phoneNumber } = req.body;

        if (!accountSid || !authToken) {
            return res.status(400).json({ 
                error: 'Account SID and Auth Token are required' 
            });
        }

        // Test by creating Twilio client and fetching account info
        const client = twilio(accountSid, authToken);
        
        // Validate credentials by fetching account details
        const account = await client.api.accounts(accountSid).fetch();

        console.log('✅ Twilio Connection Test Successful');
        
        await logActivity('info', `Twilio connection test successful`, req.user?.id);
        
        res.json({
            status: 'Connection successful',
            accountName: account.friendlyName,
            phoneNumber: phoneNumber || 'Not provided',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Connection Test Failed:', error);
        await logActivity('error', `Twilio connection test failed: ${error.message}`, req.user?.id);
        res.status(400).json({
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// ===== EMAIL ENDPOINTS =====

// Email sending endpoint
app.post('/api/email/send', async (req, res) => {
    try {
        console.log('📧 Email Send Request:', {
            from: req.body.from,
            to: req.body.to,
            subject: req.body.subject
        });

        const { apiKey, from, to, subject, text, html } = req.body;

        if (!apiKey || !from || !to || !subject || (!text && !html)) {
            return res.status(400).json({
                error: 'Missing required fields: apiKey, from, to, subject, and either text or html'
            });
        }

        // Set SendGrid API key
        sgMail.setApiKey(apiKey);

        // Prepare email message
        const msg = {
            to: to,
            from: from,
            subject: subject,
            text: text,
            html: html || text
        };

        // Send email using SendGrid
        const result = await sgMail.send(msg);

        console.log('✅ Email Result:', {
            messageId: result[0].headers['x-message-id'],
            statusCode: result[0].statusCode
        });

        // Log email activity
        await logActivity('info', `Email sent to ${to}`, req.user?.id, { messageId: result[0].headers['x-message-id'] });

        res.json({
            messageId: result[0].headers['x-message-id'],
            status: 'Sent',
            statusCode: result[0].statusCode,
            to: to,
            from: from,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Email Error:', error);
        await logActivity('error', `Email send failed: ${error.message}`, req.user?.id);
        res.status(500).json({
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Email connection test endpoint
app.post('/api/email/test-connection', async (req, res) => {
    try {
        console.log('🔧 Testing SendGrid Connection...');

        const { apiKey, fromEmail } = req.body;

        if (!apiKey || !fromEmail) {
            return res.status(400).json({ 
                error: 'API Key and From Email are required' 
            });
        }

        // Set SendGrid API key
        sgMail.setApiKey(apiKey);

        // Test by sending a test email to the from address
        const testMsg = {
            to: fromEmail,
            from: fromEmail,
            subject: 'SendGrid Connection Test - Parent Activity App',
            text: 'This is a test email to verify your SendGrid configuration is working correctly.',
            html: '<p>This is a test email to verify your <strong>SendGrid</strong> configuration is working correctly.</p><p>If you received this email, your setup is ready!</p>'
        };

        const result = await sgMail.send(testMsg);

        console.log('✅ SendGrid Connection Test Successful');
        
        await logActivity('info', `SendGrid connection test successful`, req.user?.id);
        
        res.json({
            status: 'Connection successful',
            messageId: result[0].headers['x-message-id'],
            fromEmail: fromEmail,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Email Connection Test Failed:', error);
        await logActivity('error', `SendGrid connection test failed: ${error.message}`, req.user?.id);
        res.status(400).json({
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Keep-alive function to prevent Azure SQL connection timeout
async function keepConnectionAlive() {
    try {
        const pool = await poolPromise;
        await pool.request().query('SELECT 1 as keepalive');
        console.log('🔄 Database connection keep-alive successful');
    } catch (error) {
        console.error('❌ Database keep-alive failed:', error.message);
        // Try to reconnect
        try {
            console.log('🔄 Attempting database reconnection...');
            await initializeDatabase();
        } catch (reconnectError) {
            console.error('❌ Database reconnection failed:', reconnectError.message);
        }
    }
}

// Start server
async function startServer() {
    try {
        await initializeDatabase();
        
        // Set up keep-alive interval (every 10 minutes)
        setInterval(keepConnectionAlive, 10 * 60 * 1000);
        
        app.listen(PORT, () => {
            console.log('🚀 SMS & Email Backend Server with Azure SQL Started!');
            console.log('📡 Server running on http://localhost:' + PORT);
            console.log('🔗 Health check: http://localhost:' + PORT + '/health');
            console.log('📱📧 Ready to handle SMS and Email requests');
            console.log('🗄️ Connected to Azure SQL Database');
            console.log('\n📋 Available endpoints:');
            console.log('  GET  /health - Server health check');
            console.log('  POST /api/auth/login - User authentication');
            console.log('  POST /api/auth/register - User registration');
            console.log('  GET  /api/admin/users - Admin: Get all users');
            console.log('  PUT  /api/admin/users/:id/role - Admin: Update user role');
            console.log('  PUT  /api/admin/users/:id/status - Admin: Update user status');
            console.log('  DELETE /api/admin/users/:id - Admin: Delete user');
            console.log('  GET  /api/admin/stats - Admin: Get system statistics');
            console.log('  GET  /api/admin/logs - Admin: Get system logs');
            console.log('  POST /api/sms/send - Send SMS message');
            console.log('  POST /api/sms/test-connection - Test Twilio connection');
            console.log('  POST /api/email/send - Send Email message');
            console.log('  POST /api/email/test-connection - Test SendGrid connection');
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
        const pool = await poolPromise;
        await pool.close();
        console.log('✅ Database connection closed');
    } catch (error) {
        console.error('Error closing database:', error);
    }
    process.exit(0);
});

startServer();