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

// Run database migrations
async function runMigrations() {
    const client = await pool.connect();
    try {
        console.log('🔧 Running database migrations...');
        
        // Migration 1: Add auto_notify_new_connections column to activities table
        try {
            await client.query(`
                ALTER TABLE activities 
                ADD COLUMN IF NOT EXISTS auto_notify_new_connections BOOLEAN DEFAULT false
            `);
            console.log('✅ Migration: Added auto_notify_new_connections column to activities table');
        } catch (error) {
            if (error.code === '42701') {
                console.log('✅ Migration: auto_notify_new_connections column already exists');
            } else {
                throw error;
            }
        }

        // Migration 2: Add invited_child_id column to activity_invitations table
        try {
            await client.query(`
                ALTER TABLE activity_invitations 
                ADD COLUMN IF NOT EXISTS invited_child_id INTEGER REFERENCES children(id)
            `);
            console.log('✅ Migration: Added invited_child_id column to activity_invitations table');

            // Remove old child_id column if it exists (causes confusion with invited_child_id)
            try {
                await client.query(`
                    ALTER TABLE activity_invitations 
                    DROP COLUMN IF EXISTS child_id
                `);
                console.log('✅ Migration: Removed old child_id column from activity_invitations table');
            } catch (error) {
                console.log('Note: child_id column may not exist or already removed');
            }
        } catch (error) {
            if (error.code === '42701') {
                console.log('✅ Migration: invited_child_id column already exists');
            } else {
                throw error;
            }
        }

        // Migration 3: Add first_name and last_name columns to children table
        try {
            await client.query(`
                ALTER TABLE children 
                ADD COLUMN IF NOT EXISTS first_name VARCHAR(50),
                ADD COLUMN IF NOT EXISTS last_name VARCHAR(50)
            `);
            console.log('✅ Migration: Added first_name and last_name columns to children table');
        } catch (error) {
            if (error.code === '42701') {
                console.log('✅ Migration: first_name and last_name columns already exist');
            } else {
                throw error;
            }
        }

        // Migration 4: Update existing children to split name into first_name and last_name
        try {
            const result = await client.query(`
                UPDATE children 
                SET first_name = SPLIT_PART(name, ' ', 1),
                    last_name = CASE 
                        WHEN ARRAY_LENGTH(STRING_TO_ARRAY(name, ' '), 1) > 1 
                        THEN SUBSTRING(name FROM POSITION(' ' IN name) + 1)
                        ELSE ''
                    END
                WHERE first_name IS NULL AND name IS NOT NULL
            `);
            console.log(`✅ Migration: Updated ${result.rowCount} existing children with split names`);
        } catch (error) {
            console.log('⚠️ Migration: Could not update existing children names:', error.message);
        }

        // Migration 5: Add viewed_at column to activity_invitations table
        try {
            await client.query(`
                ALTER TABLE activity_invitations 
                ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMP
            `);
            console.log('✅ Migration: Added viewed_at column to activity_invitations table');
        } catch (error) {
            if (error.code === '42701') {
                console.log('✅ Migration: viewed_at column already exists');
            } else {
                throw error;
            }
        }

        // Migration 6: Add status_viewed_at column for tracking when host views status changes
        try {
            await client.query(`
                ALTER TABLE activity_invitations 
                ADD COLUMN IF NOT EXISTS status_viewed_at TIMESTAMP
            `);
            console.log('✅ Migration: Added status_viewed_at column to activity_invitations table');
        } catch (error) {
            if (error.code === '42701') {
                console.log('✅ Migration: status_viewed_at column already exists');
            } else {
                throw error;
            }
        }

        // Migration 7: Drop username unique constraint if it exists (for existing databases)
        try {
            await client.query(`
                ALTER TABLE users DROP CONSTRAINT IF EXISTS users_username_key;
            `);
            console.log('✅ Migration: Dropped username unique constraint (allows duplicate names)');
        } catch (error) {
            console.log('ℹ️ Migration: Username unique constraint already removed or didn\'t exist');
        }

        // Migration 8: Add phone unique constraint if it doesn't exist
        try {
            await client.query(`
                ALTER TABLE users ADD CONSTRAINT users_phone_key UNIQUE (phone);
            `);
            console.log('✅ Migration: Added phone unique constraint');
        } catch (error) {
            if (error.code === '23505' || error.message.includes('already exists')) {
                console.log('ℹ️ Migration: Phone unique constraint already exists');
            } else {
                console.log('ℹ️ Migration: Could not add phone constraint:', error.message);
            }
        }

        // Migration 9: Create pending_activity_invitations table for tracking pending connections per activity
        try {
            await client.query(`
                CREATE TABLE IF NOT EXISTS pending_activity_invitations (
                    id SERIAL PRIMARY KEY,
                    activity_id INTEGER NOT NULL,
                    pending_connection_id VARCHAR(100) NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE,
                    UNIQUE(activity_id, pending_connection_id)
                )
            `);
            console.log('✅ Migration: Created pending_activity_invitations table');
        } catch (error) {
            if (error.code === '42P07') {
                console.log('✅ Migration: pending_activity_invitations table already exists');
            } else {
                throw error;
            }
        }

        // Migration 10: Add is_shared column to activities table
        try {
            await client.query(`
                ALTER TABLE activities ADD COLUMN IF NOT EXISTS is_shared BOOLEAN DEFAULT false
            `);
            console.log('✅ Migration: Added is_shared column to activities table');
        } catch (error) {
            if (error.code === '42701') {
                console.log('✅ Migration: is_shared column already exists');
            } else {
                console.log('ℹ️ Migration: Could not add is_shared column:', error.message);
            }
        }

        // Migration 11: Add UUID columns for security (replace sequential IDs)
        try {
            console.log('🔐 Migration 11: Adding UUID columns for security...');
            await client.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
            
            // Add UUID columns to all tables (using safer syntax)
            const tables = ['users', 'children', 'activities', 'connections', 'activity_invitations', 'connection_requests', 'pending_activity_invitations'];
            
            for (const table of tables) {
                try {
                    await client.query(`ALTER TABLE ${table} ADD COLUMN uuid UUID DEFAULT uuid_generate_v4()`);
                    console.log(`✅ Added UUID column to ${table}`);
                } catch (err) {
                    if (err.message.includes('already exists')) {
                        console.log(`ℹ️ UUID column already exists in ${table}`);
                    } else {
                        console.log(`⚠️ Error adding UUID to ${table}:`, err.message);
                    }
                }
            }
            
            // Generate UUIDs for existing records that don't have them
            await client.query(`UPDATE users SET uuid = uuid_generate_v4() WHERE uuid IS NULL`);
            await client.query(`UPDATE children SET uuid = uuid_generate_v4() WHERE uuid IS NULL`);
            await client.query(`UPDATE activities SET uuid = uuid_generate_v4() WHERE uuid IS NULL`);
            await client.query(`UPDATE connections SET uuid = uuid_generate_v4() WHERE uuid IS NULL`);
            await client.query(`UPDATE activity_invitations SET uuid = uuid_generate_v4() WHERE uuid IS NULL`);
            await client.query(`UPDATE connection_requests SET uuid = uuid_generate_v4() WHERE uuid IS NULL`);
            await client.query(`UPDATE pending_activity_invitations SET uuid = uuid_generate_v4() WHERE uuid IS NULL`);
            
            // Add unique constraints on UUID columns (with error handling)
            const constraints = [
                { table: 'users', constraint: 'users_uuid_unique' },
                { table: 'children', constraint: 'children_uuid_unique' },
                { table: 'activities', constraint: 'activities_uuid_unique' },
                { table: 'connections', constraint: 'connections_uuid_unique' },
                { table: 'activity_invitations', constraint: 'activity_invitations_uuid_unique' },
                { table: 'connection_requests', constraint: 'connection_requests_uuid_unique' },
                { table: 'pending_activity_invitations', constraint: 'pending_activity_invitations_uuid_unique' }
            ];
            
            for (const { table, constraint } of constraints) {
                try {
                    await client.query(`ALTER TABLE ${table} ADD CONSTRAINT ${constraint} UNIQUE (uuid)`);
                    console.log(`✅ Added UUID constraint to ${table}`);
                } catch (err) {
                    if (err.message.includes('already exists')) {
                        console.log(`ℹ️ UUID constraint already exists on ${table}`);
                    } else {
                        console.log(`⚠️ Error adding UUID constraint to ${table}:`, err.message);
                    }
                }
            }
            
            console.log('✅ Migration 11: UUID columns added and populated');
        } catch (error) {
            console.log('ℹ️ Migration 11: UUID setup issue:', error.message);
        }

        // Migration 12: Fix orphaned activities without proper child_id links
        try {
            console.log('🔧 Migration 12: Fixing orphaned activities...');
            
            // Check for activities without valid child_id references
            const orphanedActivities = await client.query(`
                SELECT a.id, a.name, a.child_id
                FROM activities a 
                LEFT JOIN children c ON a.child_id = c.id 
                WHERE c.id IS NULL
            `);
            
            if (orphanedActivities.rows.length > 0) {
                console.log(`⚠️ Found ${orphanedActivities.rows.length} orphaned activities:`, 
                    orphanedActivities.rows.map(a => ({ id: a.id, name: a.name, child_id: a.child_id })));
                
                // For demo data, we can try to link activities based on naming patterns or delete them
                // For now, let's delete orphaned activities as they can't be properly linked
                const deleteResult = await client.query(`
                    DELETE FROM activities 
                    WHERE id NOT IN (
                        SELECT a.id 
                        FROM activities a 
                        JOIN children c ON a.child_id = c.id
                    )
                `);
                console.log(`🗑️ Deleted ${deleteResult.rowCount} orphaned activities`);
            } else {
                console.log('✅ No orphaned activities found');
            }
            
            console.log('✅ Migration 12: Activity cleanup completed');
        } catch (error) {
            console.log('ℹ️ Migration 12: Activity cleanup issue:', error.message);
        }

        // Migration 13: Convert activity_invitations to use UUIDs instead of sequential IDs
        try {
            console.log('🔄 Migration 13: Converting activity_invitations to use UUIDs...');
            
            // Add UUID columns to activity_invitations table
            await client.query(`
                ALTER TABLE activity_invitations 
                ADD COLUMN IF NOT EXISTS activity_uuid UUID,
                ADD COLUMN IF NOT EXISTS invited_child_uuid UUID
            `);
            
            // Update activity_uuid by joining with activities table
            await client.query(`
                UPDATE activity_invitations ai
                SET activity_uuid = a.uuid
                FROM activities a
                WHERE ai.activity_id = a.id AND ai.activity_uuid IS NULL
            `);
            
            // Update invited_child_uuid by joining with children table
            await client.query(`
                UPDATE activity_invitations ai
                SET invited_child_uuid = c.uuid
                FROM children c
                WHERE ai.invited_child_id = c.id AND ai.invited_child_uuid IS NULL
            `);
            
            // Delete any orphaned invitations that couldn't be matched
            const orphanedInvitations = await client.query(`
                DELETE FROM activity_invitations 
                WHERE activity_uuid IS NULL OR invited_child_uuid IS NULL
            `);
            
            if (orphanedInvitations.rowCount > 0) {
                console.log(`🗑️ Deleted ${orphanedInvitations.rowCount} orphaned activity invitations`);
            }
            
            console.log('✅ Migration 13: Activity invitations UUID conversion completed');
        } catch (error) {
            console.log('ℹ️ Migration 13: UUID conversion issue:', error.message);
        }

        // Migration 14: Add parent UUIDs and update invitation system
        try {
            console.log('🔄 Migration 14: Adding parent UUIDs to activity_invitations...');
            
            // Add parent UUID columns to activity_invitations table
            await client.query(`
                ALTER TABLE activity_invitations 
                ADD COLUMN IF NOT EXISTS inviter_parent_uuid UUID,
                ADD COLUMN IF NOT EXISTS invited_parent_uuid UUID
            `);
            
            // Update inviter_parent_uuid by joining with users table
            await client.query(`
                UPDATE activity_invitations ai
                SET inviter_parent_uuid = u.uuid
                FROM users u
                WHERE ai.inviter_parent_id = u.id AND ai.inviter_parent_uuid IS NULL
            `);
            
            // Update invited_parent_uuid by joining with users table
            await client.query(`
                UPDATE activity_invitations ai
                SET invited_parent_uuid = u.uuid
                FROM users u
                WHERE ai.invited_parent_id = u.id AND ai.invited_parent_uuid IS NULL
            `);
            
            console.log('✅ Migration 14: Parent UUIDs added to activity_invitations completed');
        } catch (error) {
            console.log('ℹ️ Migration 14: Parent UUID conversion issue:', error.message);
        }
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        client.release();
    }
}

// Test database connection
async function initializeDatabase() {
    try {
        console.log('🔄 Connecting to PostgreSQL Database...');
        
        const client = await pool.connect();
        console.log('✅ Connected to PostgreSQL Database successfully!');
        
        // Test the connection
        await client.query('SELECT NOW()');
        console.log('✅ Database connection test query successful');
        
        client.release();
        
        // Create tables if they don't exist
        // await createTables(client);
        // client.release();

        // Run migrations
        await runMigrations();
        
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
                username VARCHAR(50) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                phone VARCHAR(20) UNIQUE,
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

        // Connections table (updated to match original demo structure)
        await client.query(`
            CREATE TABLE IF NOT EXISTS connections (
                id SERIAL PRIMARY KEY,
                parent1_id INTEGER,
                parent2_id INTEGER,
                status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'blocked')),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (parent1_id) REFERENCES users(id),
                FOREIGN KEY (parent2_id) REFERENCES users(id),
                UNIQUE(parent1_id, parent2_id)
            )
        `);

        // Add child columns if they don't exist (migration)
        try {
            await client.query(`ALTER TABLE connections ADD COLUMN IF NOT EXISTS child1_id INTEGER`);
            await client.query(`ALTER TABLE connections ADD COLUMN IF NOT EXISTS child2_id INTEGER`);
            await client.query(`ALTER TABLE connections ADD CONSTRAINT IF NOT EXISTS fk_child1 FOREIGN KEY (child1_id) REFERENCES children(id)`);
            await client.query(`ALTER TABLE connections ADD CONSTRAINT IF NOT EXISTS fk_child2 FOREIGN KEY (child2_id) REFERENCES children(id)`);
        } catch (error) {
            console.log('Migration columns may already exist:', error.message);
        }

        // Activity invitations table
        try {
            await client.query(`
                CREATE TABLE IF NOT EXISTS activity_invitations (
                    id SERIAL PRIMARY KEY,
                    activity_id INTEGER NOT NULL,
                    inviter_parent_id INTEGER NOT NULL,
                    invited_parent_id INTEGER NOT NULL,
                    invited_child_id INTEGER,
                    message TEXT,
                    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE,
                    FOREIGN KEY (inviter_parent_id) REFERENCES users(id),
                    FOREIGN KEY (invited_parent_id) REFERENCES users(id),
                    FOREIGN KEY (invited_child_id) REFERENCES children(id)
                )
            `);
            console.log('✅ Activity invitations table created/verified');
        } catch (error) {
            console.log('⚠️ Activity invitations table creation error:', error.message);
        }

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

        // Insert EXACT users from real Azure SQL database (extracted data)
        const originalDemoUsers = [
            ['admin', 'admin@parentactivityapp.com', '+1555000001', 'super_admin', 'Super Admin'],
            ['manager', 'manager@parentactivityapp.com', '+1555000002', 'admin', 'System Manager'],
            ['johnson', 'johnson@example.com', '', 'user', 'Johnson Family'],
            ['davis', 'davis@example.com', '', 'user', 'Davis Family'],
            ['wong', 'wong@example.com', '', 'user', 'Wong Family'],
            ['thompson', 'thompson@example.com', '', 'user', 'Thompson Family'],
            ['miller', 'joe@example.com', '', 'user', 'Miller Family']
        ];

        for (const [username, email, phone, role, family_name] of originalDemoUsers) {
            const userExists = await client.query(`SELECT id FROM users WHERE email = $1`, [email]);
            if (userExists.rows.length === 0) {
                try {
                    await client.query(`
                        INSERT INTO users (username, email, phone, password_hash, role, family_name)
                        VALUES ($1, $2, $3, '$2a$12$dummy.hash.for.demo.purposes', $4, $5)
                    `, [username, email, phone, role, family_name]);
                    console.log(`✅ Created original demo user: ${username}`);
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

// Insert original demo children from demo.html
async function insertDemoChildren(client) {
    // Get user IDs dynamically
    const users = await client.query('SELECT id, email FROM users ORDER BY id');
    const userMap = {};
    users.rows.forEach(user => {
        userMap[user.email] = user.id;
    });

    const originalDemoChildren = [
        // EXACT children from real Azure SQL database
        ['Emma Johnson', userMap['johnson@example.com']],
        ['Alex Johnson', userMap['johnson@example.com']],
        ['Jake Davis', userMap['davis@example.com']],
        ['Mia Wong', userMap['wong@example.com']],
        ['Ryan Wong', userMap['wong@example.com']],
        ['Zoe Wong', userMap['wong@example.com']],
        ['Sophie Thompson', userMap['thompson@example.com']],
        ['Oliver Thompson', userMap['thompson@example.com']],
        ['Theodore Miller', userMap['joe@example.com']]
    ];

    for (const [name, parent_id] of originalDemoChildren) {
        if (parent_id) { // Only insert if parent exists
            const childExists = await client.query(`SELECT id FROM children WHERE name = $1 AND parent_id = $2`, [name, parent_id]);
            if (childExists.rows.length === 0) {
                try {
                    await client.query(`
                        INSERT INTO children (name, parent_id)
                        VALUES ($1, $2)
                    `, [name, parent_id]);
                    console.log(`✅ Created original demo child: ${name}`);
                } catch (error) {
                    console.error(`Error creating child ${name}:`, error.message);
                }
            }
        }
    }
}

// Insert original demo activities from demo.html
async function insertDemoActivities(client) {
    // Get child IDs dynamically
    const children = await client.query('SELECT id, name FROM children ORDER BY id');
    const childMap = {};
    children.rows.forEach(child => {
        childMap[child.name] = child.id;
    });

    // Get current week dates for activities (like original demo.html)
    const today = new Date();
    const currentWeekDates = [];
    const startOfWeek = new Date(today);
    const dayOfWeek = startOfWeek.getDay();
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    startOfWeek.setDate(startOfWeek.getDate() - daysFromMonday);
    
    for (let i = 0; i < 7; i++) {
        const weekDay = new Date(startOfWeek);
        weekDay.setDate(startOfWeek.getDate() + i);
        const year = weekDay.getFullYear();
        const month = String(weekDay.getMonth() + 1).padStart(2, '0');
        const day = String(weekDay.getDate()).padStart(2, '0');
        currentWeekDates.push(`${year}-${month}-${day}`);
    }
    
    console.log('🗓️ Generated currentWeekDates:', currentWeekDates);
    console.log(`📅 Soccer Practice will be created for: 2025-08-06 (hardcoded)`);

    const originalDemoActivities = [
        // EXACT activities from real Azure SQL database
        // Emma Johnson's 5 activities
        [childMap['Emma Johnson'], 'Soccer Practice', null, '2025-08-06', null, '17:00:00', '19:00:00', null, null, null, null],
        [childMap['Emma Johnson'], 'Swimming Lesson', null, currentWeekDates[2], null, '11:00:00', '12:00:00', null, null, null, null],
        [childMap['Emma Johnson'], 'Art Class', null, currentWeekDates[3], null, '15:00:00', '16:30:00', null, null, null, null],
        [childMap['Emma Johnson'], 'Dance Class', null, currentWeekDates[5], null, '12:00:00', '13:00:00', null, null, null, null],
        [childMap['Emma Johnson'], 'Tennis Lesson', null, currentWeekDates[6], null, '15:00:00', '16:00:00', null, null, null, null],
        
        // Alex Johnson's 2 activities
        [childMap['Alex Johnson'], 'Piano Lesson', null, currentWeekDates[1], null, '16:30:00', '17:30:00', null, null, null, null],
        [childMap['Alex Johnson'], 'Basketball', null, currentWeekDates[4], null, '10:00:00', '11:30:00', null, null, null, null],
        
        // Other family activities from real Azure SQL
        [childMap['Jake Davis'], 'Football Training', null, currentWeekDates[2], null, '18:00:00', '19:30:00', null, null, null, null],
        [childMap['Theodore Miller'], 'Robotics Club', null, currentWeekDates[1], null, '17:00:00', '19:00:00', null, null, null, null],
        [childMap['Mia Wong'], 'Violin Lessons', null, currentWeekDates[3], null, '16:00:00', '17:00:00', null, null, null, null]
    ];

    for (const [child_id, name, description, start_date, end_date, start_time, end_time, location, website_url, cost, max_participants] of originalDemoActivities) {
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

// Insert original demo connections
async function insertDemoConnections(client) {
    // Get user IDs dynamically
    const users = await client.query('SELECT id, email FROM users');
    const userMap = {};
    users.rows.forEach(user => {
        userMap[user.email] = user.id;
    });

    // Get child IDs
    const children = await client.query('SELECT id, name FROM children');
    const childMap = {};
    children.rows.forEach(child => {
        childMap[child.name] = child.id;
    });

    // Insert demo connection requests with all notification types for Emma
    const demoConnectionRequests = [
        {
            requester_id: userMap['davis@example.com'],
            target_parent_id: userMap['johnson@example.com'],
            child_id: childMap['Jake Davis'],
            target_child_id: childMap['Emma Johnson'],
            status: 'pending',
            message: 'Jake would love to join Emma for soccer practice!'
        },
        {
            requester_id: userMap['wong@example.com'],
            target_parent_id: userMap['johnson@example.com'],
            child_id: childMap['Ryan Wong'],
            target_child_id: childMap['Alex Johnson'],
            status: 'pending',
            message: 'Ryan and Alex could be great basketball partners!'
        },
        {
            requester_id: userMap['thompson@example.com'],
            target_parent_id: userMap['johnson@example.com'],
            child_id: childMap['Sophie Thompson'],
            target_child_id: childMap['Emma Johnson'],
            status: 'accepted',
            message: 'Sophie is excited to join Emma for swimming!'
        },
        {
            requester_id: userMap['wong@example.com'],
            target_parent_id: userMap['johnson@example.com'],
            child_id: childMap['Mia Wong'],
            target_child_id: childMap['Emma Johnson'],
            status: 'declined',
            message: 'Mia was hoping to join Emma for art class, but the timing didn\'t work out.'
        }
    ];

    for (const request of demoConnectionRequests) {
        if (request.requester_id && request.target_parent_id && request.child_id && request.target_child_id) {
            const requestExists = await client.query(`
                SELECT id FROM connection_requests 
                WHERE requester_id = $1 AND target_parent_id = $2 AND child_id = $3 AND target_child_id = $4
            `, [request.requester_id, request.target_parent_id, request.child_id, request.target_child_id]);
            
            if (requestExists.rows.length === 0) {
                try {
                    await client.query(`
                        INSERT INTO connection_requests (requester_id, target_parent_id, child_id, target_child_id, status, message)
                        VALUES ($1, $2, $3, $4, $5, $6)
                    `, [request.requester_id, request.target_parent_id, request.child_id, request.target_child_id, request.status, request.message]);
                    console.log(`✅ Created original demo connection request`);
                } catch (error) {
                    console.error(`Error creating connection request:`, error.message);
                }
            }
        }
    }

    // Add more connections so families can invite each other
    const establishedConnections = [
        [childMap['Sophie Thompson'], childMap['Emma Johnson']],
        [childMap['Jake Davis'], childMap['Emma Johnson']],
        [childMap['Mia Wong'], childMap['Emma Johnson']],
        [childMap['Ryan Wong'], childMap['Alex Johnson']]
    ];

    for (const [child1_id, child2_id] of establishedConnections) {
        if (child1_id && child2_id) {
            const connectionExists = await client.query(`
                SELECT id FROM connections 
                WHERE (child1_id = $1 AND child2_id = $2) OR (child1_id = $2 AND child2_id = $1)
            `, [child1_id, child2_id]);
            
            if (connectionExists.rows.length === 0) {
                try {
                    await client.query(`
                        INSERT INTO connections (child1_id, child2_id, status)
                        VALUES ($1, $2, 'active')
                    `, [child1_id, child2_id]);
                    console.log(`✅ Created original demo connection: ${child1_id} <-> ${child2_id}`);
                } catch (error) {
                    console.error(`Error creating connection ${child1_id} <-> ${child2_id}:`, error.message);
                }
            }
        }
    }

    // Create activity invitations with different statuses for testing
    // First, find the "Soccer Practice" activity by Emma
    const testActivity = await client.query(`
        SELECT a.id 
        FROM activities a 
        INNER JOIN children c ON a.child_id = c.id 
        WHERE a.name = 'Soccer Practice' AND c.name = 'Emma Johnson'
    `);

    if (testActivity.rows.length > 0) {
        const activityId = testActivity.rows[0].id;
        console.log(`🎯 Found Soccer Practice activity with ID: ${activityId}`);
        
        // Create invitations with different statuses
        const demoInvitations = [
            {
                activity_id: activityId,
                inviter_parent_id: userMap['johnson@example.com'], // Emma's parent
                invited_parent_id: userMap['davis@example.com'], // Jake's parent  
                child_id: childMap['Jake Davis'],
                status: 'pending',
                message: 'Would Jake like to join us for this activity?'
            },
            {
                activity_id: activityId,
                inviter_parent_id: userMap['johnson@example.com'], // Emma's parent
                invited_parent_id: userMap['wong@example.com'], // Mia's parent
                child_id: childMap['Mia Wong'], 
                status: 'pending',
                message: 'Would Mia like to join Emma for soccer practice?'
            },
            {
                activity_id: activityId,
                inviter_parent_id: userMap['johnson@example.com'], // Emma's parent
                invited_parent_id: userMap['thompson@example.com'], // Sophie's parent
                child_id: childMap['Sophie Thompson'],
                status: 'declined',  
                message: 'Sorry, Sophie has a conflict that day.'
            }
        ];

        console.log(`🔄 Processing ${demoInvitations.length} demo invitations...`);
        for (const invitation of demoInvitations) {
            console.log(`📝 Processing invitation:`, {
                activity_id: invitation.activity_id,
                inviter: Object.keys(userMap).find(k => userMap[k] === invitation.inviter_parent_id),
                invited: Object.keys(userMap).find(k => userMap[k] === invitation.invited_parent_id),
                child: Object.keys(childMap).find(k => childMap[k] === invitation.child_id),
                status: invitation.status
            });
            
            if (invitation.activity_id && invitation.inviter_parent_id && invitation.invited_parent_id && invitation.child_id) {
                const invitationExists = await client.query(`
                    SELECT id FROM activity_invitations 
                    WHERE activity_id = $1 AND invited_parent_id = $2 AND child_id = $3
                `, [invitation.activity_id, invitation.invited_parent_id, invitation.child_id]);
                
                if (invitationExists.rows.length === 0) {
                    try {
                        await client.query(`
                            INSERT INTO activity_invitations (activity_id, inviter_parent_id, invited_parent_id, invited_child_id, status, message)
                            VALUES ($1, $2, $3, $4, $5, $6)
                        `, [invitation.activity_id, invitation.inviter_parent_id, invitation.invited_parent_id, invitation.child_id, invitation.status, invitation.message]);
                        console.log(`✅ Created demo activity invitation: ${invitation.status}`);
                    } catch (error) {
                        console.error(`Error creating activity invitation:`, error.message);
                    }
                } else {
                    // Update existing invitation
                    try {
                        await client.query(`
                            UPDATE activity_invitations 
                            SET status = $1, message = $2, updated_at = CURRENT_TIMESTAMP
                            WHERE activity_id = $3 AND invited_parent_id = $4 AND child_id = $5
                        `, [invitation.status, invitation.message, invitation.activity_id, invitation.invited_parent_id, invitation.child_id]);
                        console.log(`✅ Updated demo activity invitation to: ${invitation.status}`);
                    } catch (error) {
                        console.error(`Error updating activity invitation:`, error.message);
                    }
                }
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
// Migration endpoint to fix existing activities
app.post('/api/admin/migrate-is-shared', async (req, res) => {
    try {
        const client = await pool.connect();
        
        // Update activities that have auto_notify_new_connections = true
        const autoNotifyResult = await client.query(`
            UPDATE activities 
            SET is_shared = true 
            WHERE auto_notify_new_connections = true AND (is_shared = false OR is_shared IS NULL)
        `);
        
        // Update activities that have pending invitations
        const pendingInvitesResult = await client.query(`
            UPDATE activities 
            SET is_shared = true 
            WHERE id IN (
                SELECT DISTINCT pai.activity_id 
                FROM pending_activity_invitations pai
            ) AND (is_shared = false OR is_shared IS NULL)
        `);
        
        // Update activities that have actual invitations
        const actualInvitesResult = await client.query(`
            UPDATE activities 
            SET is_shared = true 
            WHERE id IN (
                SELECT DISTINCT ai.activity_id 
                FROM activity_invitations ai
            ) AND (is_shared = false OR is_shared IS NULL)
        `);
        
        client.release();
        
        res.json({
            success: true,
            message: 'Migration completed',
            results: {
                auto_notify_activities: autoNotifyResult.rowCount,
                pending_invitations_activities: pendingInvitesResult.rowCount,
                actual_invitations_activities: actualInvitesResult.rowCount,
                total_updated: autoNotifyResult.rowCount + pendingInvitesResult.rowCount + actualInvitesResult.rowCount
            }
        });
    } catch (error) {
        console.error('Migration error:', error);
        res.status(500).json({ success: false, error: 'Migration failed' });
    }
});

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
        
        // Verify password against stored hash
        const isValidPassword = await bcrypt.compare(password, user.password_hash);

        if (!isValidPassword) {
            await logActivity('warn', `Failed login attempt for ${email}`, null, null, req);
            client.release();
            return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }

        // ✅ SECURITY: Use UUID in JWT instead of sequential ID
        const token = jwt.sign(
            { 
                id: user.id, // Keep sequential ID for backward compatibility in JWT
                uuid: user.uuid, // Add UUID for future use
                email: user.email, 
                role: user.role,
                username: user.username 
            },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );

        await logActivity('info', `User logged in: ${email}`, user.id, null, req);
        client.release();

        // ✅ SECURITY: Only return UUID in response, not sequential ID
        res.json({
            success: true,
            token,
            user: {
                uuid: user.uuid,
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

        // Check if phone number already exists (if provided)
        if (phone) {
            const existingPhone = await client.query('SELECT id FROM users WHERE phone = $1', [phone]);
            if (existingPhone.rows.length > 0) {
                client.release();
                return res.status(400).json({ success: false, error: 'An account with this phone number already exists' });
            }
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
                id: newUser.id, // Keep for backward compatibility during migration
                uuid: newUser.uuid, // Add UUID for secure authorization
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
app.get('/api/auth/verify', authenticateToken, async (req, res) => {
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT id, username, email, phone, role, family_name FROM users WHERE id = $1 AND is_active = true', [req.user.id]);
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
app.post('/api/auth/forgot-password', async (req, res) => {
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

// Profile management endpoints
// Get current user profile
app.get('/api/users/profile', authenticateToken, async (req, res) => {
    try {
        const client = await pool.connect();
        const result = await client.query(
            'SELECT id, username, email, phone, created_at, updated_at FROM users WHERE id = $1',
            [req.user.id]
        );
        client.release();

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ error: 'Failed to get profile' });
    }
});

// Update user profile
app.put('/api/users/profile', authenticateToken, async (req, res) => {
    try {
        const { username, email, phone } = req.body;

        // Validate input
        if (!username || !email || !phone) {
            return res.status(400).json({ error: 'Username, email, and phone are required' });
        }

        const client = await pool.connect();
        
        // Check if email or username already exists for another user
        const existingUser = await client.query(
            'SELECT id FROM users WHERE (email = $1 OR username = $2) AND id != $3',
            [email, username, req.user.id]
        );

        if (existingUser.rows.length > 0) {
            client.release();
            return res.status(409).json({ error: 'Email or username already exists' });
        }

        // Update user
        await client.query(
            'UPDATE users SET username = $1, email = $2, phone = $3, updated_at = NOW() WHERE id = $4',
            [username, email, phone, req.user.id]
        );

        // Get updated user data
        const updatedUser = await client.query(
            'SELECT id, username, email, phone, created_at, updated_at FROM users WHERE id = $1',
            [req.user.id]
        );
        
        client.release();

        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: updatedUser.rows[0]
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// Change password endpoint  
app.put('/api/users/change-password', authenticateToken, async (req, res) => {
    console.log('🔒 Change password endpoint hit');
    try {
        const { currentPassword, newPassword } = req.body;

        // Validate input
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Current password and new password are required' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'New password must be at least 6 characters long' });
        }

        const client = await pool.connect();
        
        // Get current user with password hash
        const userResult = await client.query(
            'SELECT id, password_hash FROM users WHERE id = $1',
            [req.user.id]
        );

        if (userResult.rows.length === 0) {
            client.release();
            return res.status(404).json({ error: 'User not found' });
        }

        const user = userResult.rows[0];

        // Verify current password
        console.log('🔒 Verifying current password for user:', req.user.id);
        const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
        console.log('🔒 Current password valid:', isCurrentPasswordValid);
        
        if (!isCurrentPasswordValid) {
            client.release();
            return res.status(400).json({ error: 'Current password is incorrect' });
        }

        // Hash new password
        console.log('🔒 Hashing new password');
        const saltRounds = 10;
        const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);
        console.log('🔒 New password hash generated');

        // Update password
        console.log('🔒 Updating password in database for user:', req.user.id);
        const updateResult = await client.query(
            'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
            [newPasswordHash, req.user.id]
        );
        console.log('🔒 Password update result:', updateResult.rowCount, 'rows affected');

        // Verify the update worked
        const verifyResult = await client.query(
            'SELECT password_hash FROM users WHERE id = $1',
            [req.user.id]
        );
        console.log('🔒 Password was actually updated:', verifyResult.rows[0].password_hash !== user.password_hash);
        
        client.release();

        res.json({
            success: true,
            message: 'Password changed successfully'
        });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ error: 'Failed to change password' });
    }
});

// Children endpoints
app.get('/api/children', authenticateToken, async (req, res) => {
    try {
        const client = await pool.connect();
        // ✅ SECURITY: Return both UUID and ID for backward compatibility during transition
        const result = await client.query(
            `SELECT id, uuid, name, first_name, last_name, age, grade, school, interests, created_at, updated_at,
             CASE 
                WHEN first_name IS NOT NULL AND last_name IS NOT NULL AND last_name != '' 
                THEN CONCAT(first_name, ' ', last_name)
                WHEN first_name IS NOT NULL 
                THEN first_name
                ELSE name 
             END as display_name
             FROM children c JOIN users u ON c.parent_id = u.id WHERE u.uuid = $1 ORDER BY c.created_at DESC`,
            [req.user.uuid]
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
        const { name, first_name, last_name, age, grade, school, interests } = req.body;

        // Handle both old (name) and new (first_name/last_name) formats
        let firstName, lastName, fullName;
        
        if (first_name || last_name) {
            firstName = first_name?.trim() || '';
            lastName = last_name?.trim() || '';
            fullName = `${firstName} ${lastName}`.trim();
        } else if (name) {
            // Legacy support: split name into first and last
            const nameParts = name.trim().split(' ');
            firstName = nameParts[0] || '';
            lastName = nameParts.slice(1).join(' ') || '';
            fullName = name.trim();
        } else {
            return res.status(400).json({ success: false, error: 'Child name is required' });
        }

        if (!firstName) {
            return res.status(400).json({ success: false, error: 'First name is required' });
        }

        const client = await pool.connect();
        // ✅ SECURITY: Only return necessary fields with UUID
        const result = await client.query(
            'INSERT INTO children (name, first_name, last_name, parent_id, age, grade, school, interests) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING uuid, name, first_name, last_name, age, grade, school, interests, created_at, updated_at',
            [fullName, firstName, lastName, req.user.id, age, grade, school, interests]
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
        const childUuid = req.params.id; // Now expecting UUID instead of sequential ID
        
        const client = await pool.connect();
        
        // ✅ SECURITY: Check if the child belongs to this user using UUID
        const child = await client.query(
            'SELECT id FROM children WHERE uuid = $1 AND parent_id = $2',
            [childUuid, req.user.id]
        );

        if (child.rows.length === 0) {
            client.release();
            return res.status(404).json({ success: false, error: 'Child not found' });
        }

        // ✅ SECURITY: Delete child using UUID (activities will be deleted by CASCADE)
        await client.query('DELETE FROM children WHERE uuid = $1', [childUuid]);
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
        // ✅ SECURITY: Expect UUID instead of sequential ID
        const childUuid = req.params.childId;
        
        console.log('🔍 GET /api/activities/:childId Debug:', {
            childUuid,
            userId: req.user.id,
            userEmail: req.user.email,
            timestamp: new Date().toISOString()
        });
        
        // Query activities with invitation status from database
        const client = await pool.connect();
        
        try {
            // ✅ SECURITY: First get the child's sequential ID from UUID for authorization using parent UUID
            const childResult = await client.query(
                'SELECT c.id FROM children c JOIN users u ON c.parent_id = u.id WHERE c.uuid = $1 AND u.uuid = $2',
                [childUuid, req.user.uuid]
            );
            
            if (childResult.rows.length === 0) {
                client.release();
                return res.status(404).json({ success: false, error: 'Child not found' });
            }
            
            const childId = childResult.rows[0].id;
            
            // Get activities for the child with invitation status
            const query = `
                SELECT 
                    -- ✅ SECURITY: Return UUID instead of sequential ID
                    a.uuid as activity_uuid,
                    a.name,
                    a.description,
                    a.start_date,
                    a.end_date,
                    a.start_time,
                    a.end_time,
                    a.location,
                    a.website_url,
                    a.cost,
                    a.max_participants,
                    a.auto_notify_new_connections,
                    a.created_at,
                    a.updated_at,
                    ai.status as invitation_status,
                    ai.inviter_parent_id,
                    a.is_shared,
                    CASE 
                        WHEN ai.invited_parent_id = $2 THEN false 
                        ELSE true 
                    END as is_host,
                    false as is_cancelled,
                    -- Simple status change notification count
                    COALESCE((SELECT COUNT(*) FROM activity_invitations ai_status 
                     WHERE ai_status.activity_id = a.id 
                     AND ai_status.inviter_parent_id = $2 
                     AND ai_status.status IN ('accepted', 'declined')
                     AND ai_status.status_viewed_at IS NULL 
                     AND ai_status.updated_at > ai_status.created_at), 0) as unviewed_status_changes,
                    -- Get distinct statuses for unviewed changes
                    (SELECT string_agg(DISTINCT ai_status.status, ',') FROM activity_invitations ai_status 
                     WHERE ai_status.activity_id = a.id 
                     AND ai_status.inviter_parent_id = $2 
                     AND ai_status.status IN ('accepted', 'declined')
                     AND ai_status.status_viewed_at IS NULL 
                     AND ai_status.updated_at > ai_status.created_at) as unviewed_statuses
                FROM activities a
                LEFT JOIN activity_invitations ai ON a.id = ai.activity_id 
                    AND ai.invited_parent_id = $2
                WHERE a.child_id = $1
                ORDER BY a.start_date, a.start_time
            `;
            
            const result = await client.query(query, [childId, req.user.id]);
            
            // Process activities to add proper invitation status
            const activities = result.rows.map(activity => ({
                ...activity,
                invitation_status: activity.invitation_status || 'none',
                is_shared: activity.is_shared, // Use the value from the query
                is_host: activity.is_host, // Use the value from the query
                is_cancelled: false
            }));
            
            console.log('🎯 Retrieved activities from database:', activities.length);
            
            res.json({
                success: true,
                data: activities
            });
            
        } finally {
            client.release();
        }
        
    } catch (error) {
        console.error('Get activities error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch activities' });
    }
});

function getDateForWeekday(currentDate, targetDay) {
    // targetDay: 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const current = new Date(currentDate);
    const currentDay = current.getDay();
    const daysUntilTarget = targetDay - currentDay;
    
    // If the target day is in the past this week, get next week's occurrence
    const adjustedDays = daysUntilTarget < 0 ? daysUntilTarget + 7 : daysUntilTarget;
    
    current.setDate(current.getDate() + adjustedDays);
    return current;
}

app.post('/api/activities/:childId', authenticateToken, async (req, res) => {
    try {
        // ✅ SECURITY: Expect UUID instead of sequential ID
        const childUuid = req.params.childId;
        const { name, description, start_date, end_date, start_time, end_time, location, website_url, cost, max_participants, auto_notify_new_connections, is_shared } = req.body;

        if (!name || !name.trim() || !start_date) {
            return res.status(400).json({ success: false, error: 'Activity name and start date are required' });
        }

        console.log('🔔 Creating activity with auto-notify:', auto_notify_new_connections);

        const client = await pool.connect();
        
        // ✅ SECURITY: Verify the child belongs to this user using UUIDs
        const child = await client.query(
            'SELECT c.id FROM children c JOIN users u ON c.parent_id = u.id WHERE c.uuid = $1 AND u.uuid = $2',
            [childUuid, req.user.uuid]
        );

        if (child.rows.length === 0) {
            client.release();
            return res.status(404).json({ success: false, error: 'Child not found' });
        }
        
        const childId = child.rows[0].id;

        // Convert empty strings to null for time fields
        const processedStartTime = start_time && start_time.trim() ? start_time.trim() : null;
        const processedEndTime = end_time && end_time.trim() ? end_time.trim() : null;
        const processedEndDate = end_date && end_date.trim() ? end_date.trim() : null;
        const processedCost = cost && cost.trim() ? parseFloat(cost.trim()) : null;
        const processedMaxParticipants = max_participants && max_participants.toString().trim() ? parseInt(max_participants) : null;

        // Determine if activity should be marked as shared
        // Activities are shared if explicitly marked as shared OR if they have auto_notify_new_connections enabled
        const isShared = is_shared || auto_notify_new_connections || false;

        // ✅ SECURITY: Only return necessary fields with UUID
        const result = await client.query(
            'INSERT INTO activities (child_id, name, description, start_date, end_date, start_time, end_time, location, website_url, cost, max_participants, auto_notify_new_connections, is_shared) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING uuid, name, description, start_date, end_date, start_time, end_time, location, website_url, cost, max_participants, auto_notify_new_connections, is_shared, created_at, updated_at',
            [childId, name.trim(), description || null, start_date, processedEndDate, processedStartTime, processedEndTime, location || null, website_url || null, processedCost, processedMaxParticipants, auto_notify_new_connections || false, isShared]
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
            SELECT DISTINCT
                -- ✅ SECURITY: Use UUIDs instead of sequential IDs
                a.uuid as activity_uuid,
                a.name, 
                a.description,
                a.start_date,
                a.end_date, 
                a.start_time,
                a.end_time,
                a.location,
                a.website_url,
                a.cost,
                a.max_participants,
                a.auto_notify_new_connections,
                a.created_at,
                a.updated_at,
                c.name as child_name,
                -- ✅ SECURITY: Use child UUID instead of ID for activity owner
                c.uuid as child_uuid,
                -- Use stored is_shared value
                a.is_shared,
                -- Determine if user is host (owns the activity)
                CASE WHEN c.parent_id = $1 THEN true ELSE false END as is_host,
                -- Activity invitation status for this user's children
                COALESCE(ai.status, 'none') as invitation_status,
                -- ✅ SECURITY: Use child UUID instead of ID for invited child
                c_invited.uuid as invited_child_uuid,
                -- Debug fields to see what each condition evaluates to
                a.auto_notify_new_connections as debug_auto_notify,
                (SELECT COUNT(*) FROM activity_invitations ai WHERE ai.activity_uuid = a.uuid) as debug_total_invitations,
                (SELECT COUNT(*) FROM activity_invitations ai WHERE ai.activity_uuid = a.uuid AND ai.invited_parent_id = $1 AND ai.status = 'accepted') as debug_user_accepted_invitations,
                -- Status change notification count (only for host's own activities)
                CASE 
                    WHEN c.parent_id = $1 THEN 
                        COALESCE((SELECT COUNT(*) FROM activity_invitations ai_status 
                         WHERE ai_status.activity_uuid = a.uuid 
                         AND ai_status.inviter_parent_id = $1 
                         AND ai_status.status IN ('accepted', 'declined')
                         AND ai_status.status_viewed_at IS NULL 
                         AND ai_status.updated_at > ai_status.created_at), 0)
                    ELSE 0
                END as unviewed_status_changes,
                -- Get distinct statuses for unviewed changes (only for host's own activities)
                CASE 
                    WHEN c.parent_id = $1 THEN 
                        (SELECT string_agg(DISTINCT ai_status.status, ',') FROM activity_invitations ai_status 
                         WHERE ai_status.activity_uuid = a.uuid 
                         AND ai_status.inviter_parent_id = $1 
                         AND ai_status.status IN ('accepted', 'declined')
                         AND ai_status.status_viewed_at IS NULL 
                         AND ai_status.updated_at > ai_status.created_at)
                    ELSE NULL
                END as unviewed_statuses
            FROM activities a 
            JOIN children c ON a.child_id = c.id 
            LEFT JOIN activity_invitations ai ON a.id = ai.activity_id 
                AND ai.invited_parent_id = $1 
                AND ai.status IN ('pending', 'accepted')
            LEFT JOIN children c_invited ON ai.invited_child_id = c_invited.id
            WHERE (
                -- Include owned activities
                c.parent_id = $1 
                OR 
                -- Include activities where user's children are invited (pending or accepted)
                ai.id IS NOT NULL
            )
        `;
        let params = [req.user.id];

        if (start && end) {
            query += ' AND a.start_date BETWEEN $2 AND $3';
            params.push(start, end);
        }

        query += ' ORDER BY a.start_date, a.start_time';

        const result = await client.query(query, params);
        client.release();

        // Debug: Log ALL activities to see what's being returned
        console.log('🔍 Calendar Activities Debug:');
        console.log(`Found ${result.rows.length} activities for user ${req.user.id} (${req.user.email})`);
        result.rows.forEach((activity, index) => {
            console.log(`${index + 1}. Activity: "${activity.name}" (UUID: ${activity.activity_uuid})`);
            console.log(`   - is_shared: ${activity.is_shared}`);
            console.log(`   - debug_auto_notify: ${activity.debug_auto_notify}`);
            console.log(`   - debug_total_invitations: ${activity.debug_total_invitations}`);
            console.log(`   - debug_user_accepted_invitations: ${activity.debug_user_accepted_invitations}`);
            console.log(`   - child_name: ${activity.child_name}`);
        });
        
        console.log('🔍 DEBUG: First 3 activities child_uuid check:');
        result.rows.slice(0, 3).forEach((activity, index) => {
            console.log(`   ${index + 1}. "${activity.name}": child_uuid=${activity.child_uuid}, child_name=${activity.child_name}`);
        });

        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error('Get calendar activities error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch calendar activities' });
    }
});

// Update activity
app.put('/api/activities/update/:activityId', authenticateToken, async (req, res) => {
    try {
        const { activityId } = req.params;
        const { name, description, start_date, end_date, start_time, end_time, location, website_url, cost, max_participants } = req.body;
        
        const client = await pool.connect();
        
        // ✅ SECURITY: Verify the activity belongs to this user using UUID
        const activityCheck = await client.query(
            'SELECT a.id FROM activities a JOIN children c ON a.child_id = c.id WHERE a.uuid = $1 AND c.parent_id = $2',
            [activityId, req.user.id]
        );
        
        if (activityCheck.rows.length === 0) {
            client.release();
            return res.status(404).json({ success: false, error: 'Activity not found' });
        }
        
        // Convert empty strings to null for time fields  
        const processedStartTime = start_time && start_time.trim() ? start_time.trim() : null;
        const processedEndTime = end_time && end_time.trim() ? end_time.trim() : null;
        const processedEndDate = end_date && end_date.trim() ? end_date.trim() : null;
        const processedCost = cost && cost.trim() ? parseFloat(cost.trim()) : null;
        const processedMaxParticipants = max_participants && max_participants.toString().trim() ? parseInt(max_participants) : null;

        // ✅ SECURITY: Update using UUID and return minimal data
        const result = await client.query(
            `UPDATE activities SET 
                name = $1, description = $2, start_date = $3, end_date = $4, 
                start_time = $5, end_time = $6, location = $7, website_url = $8, 
                cost = $9, max_participants = $10, updated_at = NOW()
             WHERE uuid = $11 RETURNING uuid, name, description, start_date, end_date, start_time, end_time, location, website_url, cost, max_participants, updated_at`,
            [name.trim(), description || null, start_date, processedEndDate, processedStartTime, processedEndTime, location || null, website_url || null, processedCost, processedMaxParticipants, activityId]
        );
        
        client.release();
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Update activity error:', error);
        res.status(500).json({ success: false, error: 'Failed to update activity' });
    }
});

// Delete activity
app.delete('/api/activities/delete/:activityId', authenticateToken, async (req, res) => {
    try {
        const { activityId } = req.params;
        
        const client = await pool.connect();
        
        // ✅ SECURITY: Verify the activity belongs to this user using UUID
        const activityCheck = await client.query(
            'SELECT a.id FROM activities a JOIN children c ON a.child_id = c.id WHERE a.uuid = $1 AND c.parent_id = $2',
            [activityId, req.user.id]
        );
        
        if (activityCheck.rows.length === 0) {
            client.release();
            return res.status(404).json({ success: false, error: 'Activity not found' });
        }
        
        // ✅ SECURITY: Delete using UUID instead of sequential ID
        await client.query('DELETE FROM activities WHERE uuid = $1', [activityId]);
        client.release();
        
        res.json({ success: true });
    } catch (error) {
        console.error('Delete activity error:', error);
        res.status(500).json({ success: false, error: 'Failed to delete activity' });
    }
});

// Get connections
app.get('/api/connections', authenticateToken, async (req, res) => {
    try {
        const client = await pool.connect();
        
        // Debug: First check all connections for this user (including blocked ones)
        const allConnections = await client.query(
            `SELECT c.id, c.status, c.created_at,
                    u1.username as child1_parent_name, 
                    u2.username as child2_parent_name,
                    ch1.name as child1_name, ch2.name as child2_name
             FROM connections c
             JOIN children ch1 ON c.child1_id = ch1.id
             JOIN children ch2 ON c.child2_id = ch2.id  
             JOIN users u1 ON ch1.parent_id = u1.id
             JOIN users u2 ON ch2.parent_id = u2.id
             WHERE (ch1.parent_id = $1 OR ch2.parent_id = $1)
             ORDER BY c.created_at DESC`,
            [req.user.id]
        );
        console.log(`🔍 All connections for user ${req.user.id}:`, allConnections.rows.map(c => ({
            id: c.id,
            child1: c.child1_name,
            child2: c.child2_name,
            status: c.status
        })));
        
        // ✅ SECURITY: Only include child UUIDs for frontend matching, removed child IDs for security
        const result = await client.query(
            `SELECT c.uuid as connection_uuid,
                    c.status, 
                    c.created_at,
                    u1.username as child1_parent_name, 
                    u2.username as child2_parent_name,
                    u1.id as child1_parent_id,
                    u2.id as child2_parent_id,
                    u1.uuid as child1_parent_uuid,
                    u2.uuid as child2_parent_uuid,
                    ch1.name as child1_name, 
                    ch2.name as child2_name,
                    ch1.uuid as child1_uuid, 
                    ch2.uuid as child2_uuid
             FROM connections c
             JOIN children ch1 ON c.child1_id = ch1.id
             JOIN children ch2 ON c.child2_id = ch2.id  
             JOIN users u1 ON ch1.parent_id = u1.id
             JOIN users u2 ON ch2.parent_id = u2.id
             WHERE (ch1.parent_id = $1 OR ch2.parent_id = $1) AND c.status = 'active'
             ORDER BY c.created_at DESC`,
            [req.user.id]
        );
        
        console.log(`✅ Active connections for user ${req.user.id}:`, result.rows.map(c => ({
            id: c.id,
            child1: c.child1_name,
            child2: c.child2_name,
            status: c.status,
            child1_uuid: c.child1_uuid,
            child2_uuid: c.child2_uuid
        })));
        
        client.release();
        
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Get connections error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch connections' });
    }
});

// Connection endpoints
app.get('/api/connections/requests', authenticateToken, async (req, res) => {
    try {
        console.log(`🔍 GET /api/connections/requests - User ID: ${req.user.id}, Email: ${req.user.email}`);
        
        const client = await pool.connect();
        
        // First, check all connection requests for this user (debug)
        const allRequestsResult = await client.query(
            `SELECT cr.*, u.username as requester_name 
             FROM connection_requests cr 
             LEFT JOIN users u ON cr.requester_id = u.id 
             WHERE cr.target_parent_id = $1`,
            [req.user.id]
        );
        console.log(`📋 All connection requests for user ${req.user.id}:`, allRequestsResult.rows);
        
        // Check for any requests with NULL child_id
        const nullChildRequests = await client.query(
            `SELECT * FROM connection_requests WHERE target_parent_id = $1 AND child_id IS NULL`,
            [req.user.id]
        );
        console.log(`⚠️ Requests with NULL child_id:`, nullChildRequests.rows);
        
        // ✅ SECURITY: Only return necessary fields, NO email/phone/address exposure
        const result = await client.query(
            `SELECT cr.uuid as request_uuid,
                    cr.message,
                    cr.status,
                    cr.created_at,
                    u.username as requester_name,
                    u.family_name as requester_family_name,
                    c1.name as child_name,
                    c1.age as child_age,
                    c1.grade as child_grade,
                    c2.name as target_child_name,
                    c2.age as target_child_age,
                    c2.grade as target_child_grade
             FROM connection_requests cr
             JOIN users u ON cr.requester_id = u.id
             LEFT JOIN children c1 ON cr.child_id = c1.id
             LEFT JOIN children c2 ON cr.target_child_id = c2.id
             WHERE cr.target_parent_id = $1 AND cr.status = 'pending'
             ORDER BY cr.created_at DESC`,
            [req.user.id]
        );
        console.log(`✅ Final filtered results:`, result.rows);
        
        client.release();

        res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');
        
        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error('Get connection requests error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch connection requests' });
    }
});

// Get sent connection requests (for the requester to track their pending requests)
app.get('/api/connections/sent-requests', authenticateToken, async (req, res) => {
    try {
        console.log(`📤 GET /api/connections/sent-requests - User ID: ${req.user.id}, Email: ${req.user.email}`);
        
        const client = await pool.connect();
        // ✅ SECURITY: Only return necessary fields, NO email exposure  
        const result = await client.query(
            `SELECT cr.uuid as request_uuid,
                    cr.message,
                    cr.status,
                    cr.created_at,
                    u.username as target_parent_name,
                    u.family_name as target_family_name,
                    COALESCE(
                        CASE 
                            WHEN c1.first_name IS NOT NULL THEN 
                                CASE WHEN c1.last_name IS NOT NULL AND c1.last_name != '' 
                                     THEN c1.first_name || ' ' || c1.last_name
                                     ELSE c1.first_name
                                END
                            ELSE c1.name
                        END, 
                        c1.name
                    ) as child_name, 
                    c1.age as child_age, c1.grade as child_grade, c1.school as child_school,
                    COALESCE(
                        CASE 
                            WHEN c2.first_name IS NOT NULL THEN 
                                CASE WHEN c2.last_name IS NOT NULL AND c2.last_name != '' 
                                     THEN c2.first_name || ' ' || c2.last_name
                                     ELSE c2.first_name
                                END
                            ELSE c2.name
                        END, 
                        c2.name
                    ) as target_child_name,
                    c2.age as target_child_age,
                    c2.grade as target_child_grade
             FROM connection_requests cr
             JOIN users u ON cr.target_parent_id = u.id
             JOIN children c1 ON cr.child_id = c1.id
             LEFT JOIN children c2 ON cr.target_child_id = c2.id
             WHERE cr.requester_id = $1 AND cr.status = 'pending'
             ORDER BY cr.created_at DESC`,
            [req.user.id]
        );
        console.log(`📤 Found ${result.rows.length} sent requests:`, result.rows);
        
        client.release();

        res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');

        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error('Get sent connection requests error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch sent connection requests' });
    }
});

app.get('/api/connections/search', authenticateToken, async (req, res) => {
    try {
        const { q } = req.query;
        
        if (!q || q.length < 3) {
            return res.status(400).json({ success: false, error: 'Search query must be at least 3 characters' });
        }

        const client = await pool.connect();
        // ✅ SECURITY: Only return necessary fields for connection search, NO email/phone exposure
        const result = await client.query(
            `SELECT u.uuid as user_uuid,
                    u.username,
                    u.family_name,
                    json_agg(
                        CASE WHEN c.id IS NOT NULL 
                        THEN json_build_object(
                            'uuid', c.uuid, 
                            'name', c.name, 
                            'age', c.age,
                            'grade', c.grade
                        ) 
                        ELSE NULL END
                    ) FILTER (WHERE c.id IS NOT NULL) as children
             FROM users u
             LEFT JOIN children c ON u.id = c.parent_id
             WHERE u.id != $1 AND u.is_active = true AND (u.email ILIKE $2 OR u.phone ILIKE $2)
             GROUP BY u.uuid, u.username, u.family_name
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
        console.log('📝 POST /api/connections/request - Creating connection request:', {
            requester_id: req.user.id,
            requester_email: req.user.email,
            body: req.body
        });
        
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

        // ✅ SECURITY: Only return necessary fields, not RETURNING *
        const result = await client.query(
            'INSERT INTO connection_requests (requester_id, target_parent_id, child_id, target_child_id, message, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING uuid, message, status, created_at',
            [req.user.id, target_parent_id, child_id, target_child_id, message, 'pending']
        );
        
        console.log('✅ Connection request created successfully:', result.rows[0]);

        // ✅ SECURITY: Get response information without exposing emails
        const detailedRequest = await client.query(
            `SELECT cr.uuid as request_uuid,
                    cr.message,
                    cr.status,
                    cr.created_at,
                    u_req.username as requester_name,
                    u_target.username as target_parent_name,
                    c1.name as child_name,
                    c1.age as child_age,
                    c1.grade as child_grade,
                    c2.name as target_child_name,
                    c2.age as target_child_age,
                    c2.grade as target_child_grade
             FROM connection_requests cr
             JOIN users u_req ON cr.requester_id = u_req.id
             JOIN users u_target ON cr.target_parent_id = u_target.id
             JOIN children c1 ON cr.child_id = c1.id
             LEFT JOIN children c2 ON cr.target_child_id = c2.id
             WHERE cr.id = $1`,
            [result.rows[0].id]
        );
        client.release();

        res.json({
            success: true,
            data: detailedRequest.rows[0],
            message: 'Connection request sent successfully'
        });
    } catch (error) {
        console.error('Send connection request error:', error);
        res.status(500).json({ success: false, error: 'Failed to send connection request' });
    }
});

app.post('/api/connections/respond/:requestId', authenticateToken, async (req, res) => {
    try {
        console.log('🚨 ENDPOINT HIT: /api/connections/respond/:requestId');
        // ✅ SECURITY: Expect UUID instead of sequential ID
        const requestUuid = req.params.requestId;
        const { action } = req.body;

        console.log('📝 Connection request response:', { requestUuid, action, userId: req.user.id });

        if (!['accept', 'reject'].includes(action)) {
            return res.status(400).json({ success: false, error: 'Invalid action' });
        }

        const client = await pool.connect();
        
        // First, let's see all connection requests for this user
        const allRequests = await client.query(
            'SELECT * FROM connection_requests WHERE target_parent_id = $1',
            [req.user.id]
        );
        console.log('📋 All connection requests for user:', allRequests.rows);
        
        // ✅ SECURITY: Verify the request is for this user using UUID
        const request = await client.query(
            'SELECT * FROM connection_requests WHERE uuid = $1 AND target_parent_id = $2 AND status = $3',
            [requestUuid, req.user.id, 'pending']
        );

        console.log('🔍 Specific request found:', request.rows);

        if (request.rows.length === 0) {
            client.release();
            return res.status(404).json({ 
                success: false, 
                error: 'Connection request not found',
                debug: {
                    requestUuid,
                    userId: req.user.id,
                    allRequests: allRequests.rows
                }
            });
        }

        const status = action === 'accept' ? 'accepted' : 'declined';
        console.log('🔄 Updating request status to:', status);
        
        const updateResult = await client.query(
            'UPDATE connection_requests SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [status, requestId]
        );
        
        console.log('✅ Update result:', updateResult);

        // If accepted, create the connection
        if (action === 'accept') {
            const req_data = request.rows[0];
            console.log('🤝 Creating connection for accepted request:', req_data);
            console.log('🔍 DEBUGGING v2 - Auto-notification check - target_child_id:', req_data.target_child_id);
            
            if (req_data.target_child_id) {
                const connectionResult = await client.query(
                    'INSERT INTO connections (child1_id, child2_id, status) VALUES ($1, $2, $3)',
                    [req_data.child_id, req_data.target_child_id, 'active']
                );
                console.log('🔗 Connection created:', connectionResult);
                
                // 🔔 AUTO-NOTIFICATION: Send auto-notify activities from both users to each other
                console.log('🔔 STARTING auto-notification processing...');
                await processAutoNotifications(client, req_data.requester_id, req_data.target_parent_id, req_data.child_id, req_data.target_child_id);
                console.log('🔔 COMPLETED auto-notification processing');
            } else {
                // For general connection requests without specific target child,
                // we don't create a connection until a specific child is chosen
                console.log('❌ Connection request accepted but no specific target child - connection will be created when activity invitation is sent');
                console.log('❌ AUTO-NOTIFICATION SKIPPED - no target_child_id');
            }
        }

        client.release();

        res.json({ success: true, action, status });
    } catch (error) {
        console.error('❌ Respond to connection request error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to respond to connection request',
            debug: error.message 
        });
    }
});

// Delete connection endpoint
app.delete('/api/connections/:connectionId', authenticateToken, async (req, res) => {
    try {
        // ✅ SECURITY: Expect UUID instead of sequential ID
        const connectionUuid = req.params.connectionId;
        const userId = req.user.id;

        console.log('🗑️ DELETE connection request:', { connectionUuid, userId });

        // ✅ SECURITY: Validate UUID format instead of numeric check
        if (!connectionUuid || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(connectionUuid)) {
            return res.status(400).json({ success: false, error: 'Invalid connection UUID format' });
        }

        const client = await pool.connect();
        
        // First, let's see what connections exist for this user
        const allUserConnections = await client.query(`
            SELECT c.*, 
                   ch1.name as child1_name, ch1.parent_id as child1_parent_id,
                   ch2.name as child2_name, ch2.parent_id as child2_parent_id
            FROM connections c
            LEFT JOIN children ch1 ON c.child1_id = ch1.id
            LEFT JOIN children ch2 ON c.child2_id = ch2.id  
            WHERE (ch1.parent_id = $1 OR ch2.parent_id = $1)
        `, [userId]);
        
        console.log('📋 All connections for user:', allUserConnections.rows);
        
        // ✅ SECURITY: Find connection using UUID instead of sequential ID
        const connection = await client.query(`
            SELECT c.id, c.uuid,
                   ch1.name as child1_name, ch1.parent_id as child1_parent_id,
                   ch2.name as child2_name, ch2.parent_id as child2_parent_id
            FROM connections c
            JOIN children ch1 ON c.child1_id = ch1.id
            JOIN children ch2 ON c.child2_id = ch2.id  
            WHERE c.uuid = $1 
              AND (ch1.parent_id = $2 OR ch2.parent_id = $2) 
              AND c.status = 'active'
        `, [connectionUuid, userId]);

        console.log('🔍 Specific connection found:', connection.rows);

        if (connection.rows.length === 0) {
            client.release();
            return res.status(404).json({ 
                success: false, 
                error: 'Connection not found',
                debug: {
                    connectionUuid,
                    userId,
                    allUserConnections: allUserConnections.rows
                }
            });
        }

        const connData = connection.rows[0];
        console.log('✅ Connection to delete:', connData);

        // ✅ SECURITY: Update connection using UUID
        const updateResult = await client.query(
            'UPDATE connections SET status = $1 WHERE uuid = $2',
            ['blocked', connectionUuid]
        );

        console.log('🔄 Update result:', updateResult);

        client.release();

        res.json({
            success: true,
            message: 'Connection deleted successfully',
            deleted_connection: {
                id: connData.id,
                child1_name: connData.child1_name,
                child2_name: connData.child2_name
            }
        });
    } catch (error) {
        console.error('❌ Delete connection error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to delete connection',
            debug: error.message 
        });
    }
});

// Activity Invitation endpoint
app.post('/api/activities/:activityId/invite', authenticateToken, async (req, res) => {
    try {
        // ✅ SECURITY: Expect UUID instead of sequential ID
        const { activityId } = req.params; // Now expecting UUID
        const { invited_parent_uuid, invited_parent_id, child_uuid, message } = req.body;

        console.log('🎯 Activity invite debug:', {
            activityUuid: activityId,
            invited_parent_uuid,
            invited_parent_id,
            child_uuid,
            message,
            userId: req.user.id
        });

        // Accept either UUID or ID during migration period
        if (!invited_parent_uuid && !invited_parent_id) {
            return res.status(400).json({ success: false, error: 'Invited parent UUID or ID is required' });
        }
        
        // CRITICAL VALIDATION: child_uuid is required and must not be null
        if (!child_uuid) {
            return res.status(400).json({ success: false, error: 'Child UUID is required - cannot create invitation without specifying which child to invite' });
        }

        const client = await pool.connect();
        
        try {
            // Start transaction to ensure atomicity
            await client.query('BEGIN');

            // ✅ SECURITY: Verify the activity exists and belongs to this user's child using UUID
            const activityCheck = await client.query(
                'SELECT a.*, c.parent_id FROM activities a JOIN children c ON a.child_id = c.id WHERE a.uuid = $1',
                [activityId]
            );
            
            if (activityCheck.rows.length === 0) {
                await client.query('ROLLBACK');
                client.release();
                return res.status(404).json({ success: false, error: 'Activity not found' });
            }
            
            const activity = activityCheck.rows[0];
            if (activity.parent_id !== req.user.id) {
                await client.query('ROLLBACK');
                client.release();
                return res.status(403).json({ success: false, error: 'Not authorized to invite to this activity' });
            }

            // ✅ SECURITY: Verify that the child belongs to the invited parent using UUIDs
            const childCheck = await client.query(
                'SELECT c.id, c.name, c.parent_id, u.uuid as parent_uuid FROM children c JOIN users u ON c.parent_id = u.id WHERE c.uuid = $1',
                [child_uuid]
            );
            
            if (childCheck.rows.length === 0) {
                await client.query('ROLLBACK');
                client.release();
                return res.status(404).json({ success: false, error: 'Child not found' });
            }
            
            const child = childCheck.rows[0];
            let finalInvitedParentId;
            let finalInvitedParentUuid;
            
            // Handle both UUID and ID cases during migration
            if (invited_parent_uuid) {
                // UUID case - verify child belongs to this parent
                if (child.parent_uuid !== invited_parent_uuid) {
                    await client.query('ROLLBACK');
                    client.release();
                    return res.status(400).json({ 
                        success: false, 
                        error: `Child ${child.name} does not belong to the invited parent. Child belongs to parent UUID ${child.parent_uuid}, but invitation is for parent UUID ${invited_parent_uuid}` 
                    });
                }
                
                // Get the invited parent's sequential ID for database operations
                const invitedParentCheck = await client.query(
                    'SELECT id FROM users WHERE uuid = $1',
                    [invited_parent_uuid]
                );
                
                if (invitedParentCheck.rows.length === 0) {
                    await client.query('ROLLBACK');
                    client.release();
                    return res.status(404).json({ success: false, error: 'Invited parent not found' });
                }
                
                finalInvitedParentId = invitedParentCheck.rows[0].id;
                finalInvitedParentUuid = invited_parent_uuid;
            } else {
                // ID case - verify child belongs to this parent 
                if (child.parent_id !== invited_parent_id) {
                    await client.query('ROLLBACK');
                    client.release();
                    return res.status(400).json({ 
                        success: false, 
                        error: `Child ${child.name} does not belong to the invited parent. Child belongs to parent ID ${child.parent_id}, but invitation is for parent ID ${invited_parent_id}` 
                    });
                }
                
                finalInvitedParentId = invited_parent_id;
                finalInvitedParentUuid = child.parent_uuid; // Use the UUID from the child's parent
            }

            // FIRST: Clean up any corresponding pending invitation to avoid duplicates
            const pendingConnectionKey = `pending-${finalInvitedParentId}`;
            const cleanupResult = await client.query(
                `DELETE FROM pending_activity_invitations 
                 WHERE activity_id = $1 AND pending_connection_id = $2`,
                [activity.id, pendingConnectionKey]
            );
            
            if (cleanupResult.rowCount > 0) {
                console.log(`🧹 Cleaned up ${cleanupResult.rowCount} pending invitation(s) for activity ${activity.id}, user ${finalInvitedParentId}`);
            }

            // THEN: Create the activity invitation using UUIDs
            console.log('🔧 Attempting to insert invitation with values:', {
                activityUuid: activityId,
                activity_id: activity.id,
                inviter_parent_id: req.user.id,
                inviter_parent_uuid: req.user.uuid,
                invited_parent_id: finalInvitedParentId,
                invited_parent_uuid: finalInvitedParentUuid,
                child_uuid: child_uuid,
                child_id: child.id,
                message
            });

            const invitationResult = await client.query(
                `INSERT INTO activity_invitations 
                 (activity_id, activity_uuid, inviter_parent_id, inviter_parent_uuid, invited_parent_id, invited_parent_uuid, invited_child_id, invited_child_uuid, message, status) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending') 
                 RETURNING uuid`,
                [activity.id, activityId, req.user.id, req.user.uuid, finalInvitedParentId, finalInvitedParentUuid, child.id, child_uuid, message]
            );

            // Commit the transaction
            await client.query('COMMIT');
            client.release();

            res.json({
                success: true,
                data: { 
                    uuid: invitationResult.rows[0].uuid,
                    message: 'Activity invitation sent successfully'
                }
            });

        } catch (error) {
            // Rollback on any error
            await client.query('ROLLBACK');
            client.release();
            throw error;
        }
    } catch (error) {
        console.error('Send activity invitation error:', error);
        res.status(500).json({ success: false, error: 'Failed to send activity invitation' });
    }
});

// Create Pending Invitations endpoint
app.post('/api/activities/:activityId/pending-invitations', authenticateToken, async (req, res) => {
    try {
        // ✅ SECURITY: Expect UUID instead of sequential ID
        const activityUuid = req.params.activityId;
        const { pending_connections } = req.body;

        console.log('📝 Creating pending invitations:', {
            activityUuid,
            pending_connections,
            userId: req.user.id
        });

        if (!pending_connections || !Array.isArray(pending_connections) || pending_connections.length === 0) {
            return res.status(400).json({ success: false, error: 'Pending connections array is required' });
        }

        const client = await pool.connect();
        
        // ✅ SECURITY: Verify the activity exists and belongs to this user's child using UUID
        const activityCheck = await client.query(
            'SELECT a.*, c.parent_id FROM activities a JOIN children c ON a.child_id = c.id WHERE a.uuid = $1',
            [activityUuid]
        );
        
        if (activityCheck.rows.length === 0) {
            client.release();
            return res.status(404).json({ success: false, error: 'Activity not found' });
        }
        
        const activity = activityCheck.rows[0];
        if (activity.parent_id !== req.user.id) {
            client.release();
            return res.status(403).json({ success: false, error: 'Not authorized to create pending invitations for this activity' });
        }

        // Insert pending invitations
        const insertedRecords = [];
        for (const pendingConnectionId of pending_connections) {
            try {
                const result = await client.query(
                    `INSERT INTO pending_activity_invitations (activity_id, pending_connection_id) 
                     VALUES ($1, $2) 
                     ON CONFLICT (activity_id, pending_connection_id) DO NOTHING
                     RETURNING uuid`,
                    [activityId, pendingConnectionId]
                );
                
                if (result.rows.length > 0) {
                    insertedRecords.push({ uuid: result.rows[0].uuid, pending_connection_id: pendingConnectionId });
                }
            } catch (error) {
                console.error(`Failed to insert pending invitation for ${pendingConnectionId}:`, error);
            }
        }

        // Update the activity to mark it as shared since it now has pending invitations
        if (insertedRecords.length > 0) {
            await client.query(
                'UPDATE activities SET is_shared = true WHERE id = $1',
                [activityId]
            );
            console.log(`📝 Marked activity ${activityId} as shared (has pending invitations)`);
        }

        client.release();

        res.json({
            success: true,
            data: { 
                inserted_count: insertedRecords.length,
                pending_invitations: insertedRecords,
                message: `${insertedRecords.length} pending invitations created for activity`
            }
        });
    } catch (error) {
        console.error('Create pending invitations error:', error);
        res.status(500).json({ success: false, error: 'Failed to create pending invitations' });
    }
});

// Activity Duplication endpoint
app.post('/api/activities/:activityId/duplicate', authenticateToken, async (req, res) => {
    try {
        // ✅ SECURITY: Expect UUID instead of sequential ID
        const activityUuid = req.params.activityId;
        const { new_start_date, new_end_date } = req.body;

        if (!new_start_date) {
            return res.status(400).json({ success: false, error: 'New start date is required' });
        }

        const client = await pool.connect();
        
        // ✅ SECURITY: Get the original activity and verify ownership using UUID
        const originalActivity = await client.query(
            'SELECT a.*, c.parent_id FROM activities a JOIN children c ON a.child_id = c.id WHERE a.uuid = $1',
            [activityUuid]
        );
        
        if (originalActivity.rows.length === 0) {
            client.release();
            return res.status(404).json({ success: false, error: 'Activity not found' });
        }
        
        const activity = originalActivity.rows[0];
        if (activity.parent_id !== req.user.id) {
            client.release();
            return res.status(403).json({ success: false, error: 'Not authorized to duplicate this activity' });
        }

        // Create duplicate activity
        const duplicateResult = await client.query(
            `INSERT INTO activities 
             (child_id, name, description, start_date, end_date, start_time, end_time, location, website_url, cost, max_participants, is_shared) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) 
             RETURNING *`,
            [
                activity.child_id,
                activity.name,
                activity.description,
                new_start_date,
                new_end_date || activity.end_date,
                activity.start_time,
                activity.end_time,
                activity.location,
                activity.website_url,
                activity.cost,
                activity.max_participants,
                activity.is_shared
            ]
        );

        client.release();

        res.json({
            success: true,
            data: duplicateResult.rows[0]
        });
    } catch (error) {
        console.error('Duplicate activity error:', error);
        res.status(500).json({ success: false, error: 'Failed to duplicate activity' });
    }
});

// Connected Activities Calendar endpoint
app.get('/api/calendar/connected-activities', authenticateToken, async (req, res) => {
    try {
        const { start, end } = req.query;
        
        if (!start || !end) {
            return res.status(400).json({ success: false, error: 'Start and end dates are required' });
        }

        const client = await pool.connect();
        
        // Get activities from connected families
        const query = `
            SELECT DISTINCT
                a.uuid as activity_uuid,
                a.name,
                a.description,
                a.start_date,
                a.end_date,
                a.start_time,
                a.end_time,
                a.location,
                a.website_url,
                a.cost,
                a.max_participants,
                a.created_at,
                a.updated_at,
                c.name as child_name,
                u.username as parent_name,
                true as is_connected_activity,
                false as is_host
            FROM activities a
            JOIN children c ON a.child_id = c.id
            JOIN users u ON c.parent_id = u.id
            JOIN connections conn ON (
                (conn.child1_id = c.id AND conn.child2_id IN (
                    SELECT id FROM children WHERE parent_id = $1
                )) OR
                (conn.child2_id = c.id AND conn.child1_id IN (
                    SELECT id FROM children WHERE parent_id = $1
                ))
            )
            WHERE conn.status = 'active'
            AND a.start_date >= $2
            AND a.start_date <= $3
            AND c.parent_id != $1
            ORDER BY a.start_date, a.start_time
        `;
        
        const result = await client.query(query, [req.user.id, start, end]);
        client.release();

        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Get connected activities error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch connected activities' });
    }
});

// Activity Counts endpoint
app.get('/api/calendar/activity-counts', authenticateToken, async (req, res) => {
    try {
        const { start, end, include_connected } = req.query;
        
        if (!start || !end) {
            return res.status(400).json({ success: false, error: 'Start and end dates are required' });
        }

        const client = await pool.connect();
        
        let query = `
            SELECT 
                a.start_date::date as date,
                COUNT(*) as count,
                'own' as type
            FROM activities a
            JOIN children c ON a.child_id = c.id
            WHERE c.parent_id = $1
            AND a.start_date >= $2
            AND a.start_date <= $3
            GROUP BY a.start_date::date
        `;
        
        const params = [req.user.id, start, end];
        
        // If include_connected is true, add connected activities
        if (include_connected === 'true') {
            query = `
                ${query}
                UNION ALL
                SELECT 
                    a.start_date::date as date,
                    COUNT(*) as count,
                    'connected' as type
                FROM activities a
                JOIN children c ON a.child_id = c.id
                JOIN connections conn ON (
                    (conn.child1_id = c.id AND conn.child2_id IN (
                        SELECT id FROM children WHERE parent_id = $1
                    )) OR
                    (conn.child2_id = c.id AND conn.child1_id IN (
                        SELECT id FROM children WHERE parent_id = $1
                    ))
                )
                WHERE conn.status = 'active'
                AND a.start_date >= $2
                AND a.start_date <= $3
                AND c.parent_id != $1
                GROUP BY a.start_date::date
            `;
        }
        
        query += ' ORDER BY date';
        
        const result = await client.query(query, params);
        client.release();

        // Process results to combine counts by date
        const countsByDate = {};
        result.rows.forEach(row => {
            const dateStr = row.date.toISOString().split('T')[0];
            if (!countsByDate[dateStr]) {
                countsByDate[dateStr] = { date: dateStr, own: 0, connected: 0, total: 0 };
            }
            countsByDate[dateStr][row.type] = parseInt(row.count);
            countsByDate[dateStr].total += parseInt(row.count);
        });

        res.json({ success: true, data: Object.values(countsByDate) });
    } catch (error) {
        console.error('Get activity counts error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch activity counts' });
    }
});

// Get Activity Invitations endpoint
app.get('/api/activity-invitations', authenticateToken, async (req, res) => {
    try {
        const client = await pool.connect();
        
        const query = `
            SELECT 
                ai.*,
                a.name as activity_name,
                a.description as activity_description,
                a.start_date,
                a.end_date,
                a.start_time,
                a.end_time,
                a.location,
                c_host.name as host_child_name,
                u_host.family_name as host_family_name,
                u_host.username as host_parent_name,
                c_invited.name as invited_child_name
            FROM activity_invitations ai
            JOIN activities a ON ai.activity_uuid = a.uuid
            JOIN children c_host ON a.child_id = c_host.id
            JOIN users u_host ON c_host.parent_id = u_host.id
            LEFT JOIN children c_invited ON ai.invited_child_uuid = c_invited.uuid
            WHERE ai.invited_parent_id = $1
            AND ai.status = 'pending'
            AND ai.viewed_at IS NULL
            ORDER BY ai.created_at DESC
        `;
        
        console.log(`🔍 Activity invitations query for user ${req.user.id} (pending only)`);
        const result = await client.query(query, [req.user.id]);
        console.log(`📊 Found ${result.rows.length} pending activity invitations`);
        
        client.release();

        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Get activity invitations error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch activity invitations' });
    }
});

// Mark Activity Invitation as viewed endpoint
app.post('/api/activity-invitations/:invitationId/view', authenticateToken, async (req, res) => {
    try {
        // ✅ SECURITY: Expect UUID instead of sequential ID
        const invitationUuid = req.params.invitationId;
        
        // ✅ SECURITY: Validate UUID format instead of numeric check
        if (!invitationUuid || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(invitationUuid)) {
            return res.status(400).json({ success: false, error: 'Invalid invitation UUID format' });
        }

        const client = await pool.connect();
        
        // ✅ SECURITY: Verify the invitation exists and belongs to the user using UUID
        const invitation = await client.query(
            'SELECT * FROM activity_invitations WHERE uuid = $1 AND invited_parent_id = $2',
            [invitationUuid, req.user.id]
        );
        
        if (invitation.rows.length === 0) {
            client.release();
            return res.status(404).json({ success: false, error: 'Activity invitation not found' });
        }

        // Mark as viewed if not already viewed
        if (!invitation.rows[0].viewed_at) {
            await client.query(
                'UPDATE activity_invitations SET viewed_at = NOW() WHERE id = $1',
                [invitationId]
            );
        }

        client.release();
        res.json({ success: true, message: 'Invitation marked as viewed' });
    } catch (error) {
        console.error('Mark invitation as viewed error:', error);
        res.status(500).json({ success: false, error: 'Failed to mark invitation as viewed' });
    }
});

// Mark Activity Invitation status change as viewed endpoint (for host notifications)
app.post('/api/activity-invitations/:invitationId/mark-status-viewed', authenticateToken, async (req, res) => {
    try {
        // ✅ SECURITY: Expect UUID instead of sequential ID
        const invitationUuid = req.params.invitationId;
        
        // ✅ SECURITY: Validate UUID format instead of numeric check
        if (!invitationUuid || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(invitationUuid)) {
            return res.status(400).json({ success: false, error: 'Invalid invitation UUID format' });
        }

        const client = await pool.connect();
        
        // ✅ SECURITY: Verify the invitation exists and belongs to this user (as the host) using UUID
        const invitation = await client.query(
            'SELECT * FROM activity_invitations WHERE uuid = $1',
            [invitationUuid]
        );
        
        if (invitation.rows.length === 0) {
            client.release();
            return res.status(404).json({ success: false, error: 'Invitation not found' });
        }

        // Verify user is the host (inviter) of this invitation
        if (invitation.rows[0].inviter_parent_id !== req.user.id) {
            client.release();
            return res.status(403).json({ success: false, error: 'You can only mark your own invitations as viewed' });
        }

        // Mark status change as viewed if not already viewed
        if (!invitation.rows[0].status_viewed_at) {
            await client.query(
                'UPDATE activity_invitations SET status_viewed_at = NOW() WHERE id = $1',
                [invitationId]
            );
        }

        client.release();
        res.json({ success: true, message: 'Status change notification marked as viewed' });
    } catch (error) {
        console.error('Mark status change as viewed error:', error);
        res.status(500).json({ success: false, error: 'Failed to mark status change as viewed' });
    }
});

// Respond to Activity Invitation endpoint
app.post('/api/activity-invitations/:invitationId/respond', authenticateToken, async (req, res) => {
    try {
        // ✅ SECURITY: Expect UUID instead of sequential ID
        const invitationUuid = req.params.invitationId;
        const { action } = req.body;

        if (!action || !['accept', 'reject'].includes(action)) {
            return res.status(400).json({ success: false, error: 'Valid action (accept/reject) is required' });
        }

        // ✅ SECURITY: Validate UUID format
        if (!invitationUuid || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(invitationUuid)) {
            return res.status(400).json({ success: false, error: 'Invalid invitation UUID format' });
        }

        const client = await pool.connect();
        
        // ✅ SECURITY: Verify the invitation exists and belongs to this user using UUID
        // Allow responding to pending invitations and changing accepted invitations to declined
        const invitation = await client.query(
            'SELECT * FROM activity_invitations WHERE uuid = $1 AND invited_parent_id = $2 AND (status = $3 OR status = $4)',
            [invitationUuid, req.user.id, 'pending', 'accepted']
        );

        if (invitation.rows.length === 0) {
            client.release();
            return res.status(404).json({ success: false, error: 'Activity invitation not found or cannot be modified' });
        }

        // Don't allow accepting an already accepted invitation
        const currentStatus = invitation.rows[0].status;
        if (currentStatus === 'accepted' && action === 'accept') {
            client.release();
            return res.status(400).json({ success: false, error: 'Invitation is already accepted' });
        }

        const status = action === 'accept' ? 'accepted' : 'declined';
        
        await client.query(
            'UPDATE activity_invitations SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [status, invitationId]
        );

        // If invitation was accepted, create a connection between the children if one doesn't exist
        if (action === 'accept') {
            const invitationData = invitation.rows[0];
            console.log(`🔗 Processing accepted invitation:`, {
                invitationId,
                activityId: invitationData.activity_id,
                invitedParentId: invitationData.invited_parent_id,
                invitedChildId: invitationData.invited_child_id,
                inviterParentId: invitationData.inviter_parent_id
            });
            
            // Get the activity's child_id to connect with the invited child
            const activityResult = await client.query(
                'SELECT child_id FROM activities WHERE id = $1',
                [invitationData.activity_id]
            );
            
            if (activityResult.rows.length > 0) {
                const hostChildId = activityResult.rows[0].child_id;
                const invitedChildId = invitationData.invited_child_id;
                
                console.log(`🔍 Checking connection between host child ${hostChildId} and invited child ${invitedChildId}`);
                
                // Check if connection already exists (in either direction)
                const existingConnection = await client.query(
                    `SELECT id FROM connections 
                     WHERE ((child1_id = $1 AND child2_id = $2) OR (child1_id = $2 AND child2_id = $1))
                     AND status = 'active'`,
                    [hostChildId, invitedChildId]
                );
                
                console.log(`📊 Existing connections found: ${existingConnection.rows.length}`);
                
                // Create connection if it doesn't exist
                if (existingConnection.rows.length === 0) {
                    const connectionResult = await client.query(
                        `INSERT INTO connections (child1_id, child2_id, status, created_at) 
                         VALUES ($1, $2, 'active', CURRENT_TIMESTAMP)
                         RETURNING uuid`,
                        [hostChildId, invitedChildId]
                    );
                    console.log(`✅ Created connection ${connectionResult.rows[0].uuid} between children ${hostChildId} and ${invitedChildId} after accepting activity invitation`);
                } else {
                    console.log(`ℹ️ Connection already exists between children ${hostChildId} and ${invitedChildId}:`, existingConnection.rows[0]);
                }
            } else {
                console.error(`❌ Could not find activity ${invitationData.activity_id} when processing accepted invitation`);
            }
        }

        client.release();

        res.json({ success: true, message: `Activity invitation ${status}` });
    } catch (error) {
        console.error('Respond to activity invitation error:', error);
        res.status(500).json({ success: false, error: 'Failed to respond to activity invitation' });
    }
});

// REMOVED: Replaced with unified /api/calendar/invitations endpoint
// - /api/calendar/invited-activities (accepted)
// - /api/calendar/pending-invitations (pending)  
// - /api/calendar/declined-invitations (declined)

// Unified calendar endpoint for all invitations (pending, accepted, declined)
app.get('/api/calendar/invitations', authenticateToken, async (req, res) => {
    try {
        const { start, end } = req.query;
        
        if (!start || !end) {
            return res.status(400).json({ success: false, error: 'Start and end dates are required' });
        }
        
        const client = await pool.connect();
        
        const query = `
            SELECT DISTINCT a.id, a.name as activity_name, a.start_date, a.end_date, a.start_time, a.end_time, 
                    a.website_url, a.created_at, a.updated_at, a.description as activity_description, 
                    a.location, a.cost,
                    c.name as child_name, c.id as child_id,
                    u.username as host_parent_username,
                    ai.message as invitation_message,
                    ai.id as invitation_id,
                    ai.status,
                    ai.viewed_at,
                    c_invited.name as invited_child_name
            FROM activities a
            INNER JOIN children c ON a.child_id = c.id
            INNER JOIN users u ON c.parent_id = u.id
            INNER JOIN activity_invitations ai ON a.id = ai.activity_id
            LEFT JOIN children c_invited ON ai.invited_child_id = c_invited.id
            WHERE (ai.invited_parent_id = $1 OR ai.inviter_parent_id = $1)
              AND a.start_date <= $3
              AND (a.end_date IS NULL OR a.end_date >= $2)
            ORDER BY a.start_date, a.start_time, ai.status
        `;
        
        console.log(`🔍 Calendar invitations query for user ${req.user.id} (${start} to ${end})`);
        
        // Debug: Check ALL activity invitations for this user (no date filter)
        const debugQuery = await client.query(
            'SELECT ai.*, a.name as activity_name FROM activity_invitations ai JOIN activities a ON ai.activity_id = a.id WHERE ai.invited_parent_id = $1 OR ai.inviter_parent_id = $1',
            [req.user.id]
        );
        console.log(`🔍 DEBUG: Found ${debugQuery.rows.length} total activity invitations for user ${req.user.id} (any date):`, 
            debugQuery.rows.map(r => ({
                activity: r.activity_name,
                status: r.status,
                start_date: r.start_date,
                invitation_id: r.id
            }))
        );
        
        const result = await client.query(query, [req.user.id, start, end]);
        console.log(`📊 Found ${result.rows.length} total invitations:`, result.rows.map(r => ({
            activity: r.activity_name,
            date: r.start_date,
            child: r.invited_child_name,
            status: r.status,
            invitation_id: r.invitation_id
        })));
        
        const acceptedInvitations = result.rows.filter(r => r.status === 'accepted');
        console.log(`✅ Found ${acceptedInvitations.length} ACCEPTED invitations:`, acceptedInvitations.map(r => ({
            activity: r.activity_name,
            child: r.invited_child_name,
            invitation_id: r.invitation_id
        })));
        
        client.release();
        
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Get invitations error:', error);
        res.status(500).json({ success: false, error: 'Failed to get invitations' });
    }
});

// Test endpoint for debugging
app.get('/api/activities/:activityId/test', (req, res) => {
    console.log(`🧪 TEST ENDPOINT HIT: ActivityID ${req.params.activityId}`);
    res.json({ success: true, message: 'Test endpoint working', activityId: req.params.activityId });
});

// Get activity participants (all invitees and their status)
app.get('/api/activities/:activityId/participants', authenticateToken, async (req, res) => {
    try {
        // ✅ SECURITY: Expect UUID instead of sequential ID
        const activityUuid = req.params.activityId;
        console.log(`🔍 Getting participants for activity ${activityUuid}, user ${req.user.id}`);
        
        const client = await pool.connect();
        
        // ✅ SECURITY: Check if activity exists using UUID
        console.log(`🔍 Checking if activity ${activityUuid} exists`);
        const activityExists = await client.query('SELECT id, name FROM activities WHERE uuid = $1', [activityUuid]);
        console.log(`📊 Activity ${activityUuid} exists:`, activityExists.rows.length > 0, activityExists.rows);
        
        if (activityExists.rows.length === 0) {
            client.release();
            return res.status(404).json({ success: false, error: 'Activity not found' });
        }
        
        const activityId = activityExists.rows[0].id; // Get sequential ID for internal queries
        
        // First verify that the user has permission to view this activity (either host, invited, or pending invitation)
        const permissionCheck = await client.query(`
            SELECT 1 FROM activities a
            INNER JOIN children c ON a.child_id = c.id
            WHERE a.id = $1 AND c.parent_id = $2
            UNION
            SELECT 1 FROM activity_invitations ai
            WHERE ai.activity_id = $1 AND ai.invited_parent_id = $2
            UNION
            SELECT 1 FROM pending_activity_invitations pai
            WHERE pai.activity_id = $1 AND pai.pending_connection_id LIKE 'pending-%' 
            AND pai.pending_connection_id = CONCAT('pending-', $2)
        `, [activityId, req.user.id]);
        
        if (permissionCheck.rows.length === 0) {
            client.release();
            return res.status(403).json({ success: false, error: 'Permission denied' });
        }
        
        // Get the activity host information (child and parent details)
        const hostQuery = await client.query(`
            SELECT u.username as host_parent_name, 
                   u.id as host_parent_id, 
                   c.name as host_child_name,
                   c.id as host_child_id,
                   a.name as activity_name
            FROM activities a
            INNER JOIN children c ON a.child_id = c.id
            INNER JOIN users u ON c.parent_id = u.id
            WHERE a.id = $1
        `, [activityId]);
        
        // Get all invitees for this activity (actual invitations)
        const participantsQuery = await client.query(`
            SELECT ai.uuid as invitation_uuid,
                   ai.status,
                   ai.message,
                   ai.created_at as invited_at,
                   ai.updated_at as responded_at,
                   ai.viewed_at,
                   u.username as parent_name,
                   c_invited.name as child_name,
                   c_invited.uuid as child_uuid,
                   'sent' as invitation_type
            FROM activity_invitations ai
            INNER JOIN users u ON ai.invited_parent_id = u.id
            INNER JOIN children c_invited ON ai.invited_child_uuid = c_invited.uuid
            WHERE ai.activity_uuid = $1
            ORDER BY ai.created_at DESC
        `, [activityUuid]);

        // Get host's child ID to check for connections
        const hostChildQuery = await client.query(`
            SELECT c.id as host_child_id 
            FROM activities a 
            INNER JOIN children c ON a.child_id = c.id 
            WHERE a.id = $1
        `, [activityId]);
        const hostChildId = hostChildQuery.rows[0]?.host_child_id;

        // Also get pending invitations that haven't been sent yet, with connection status
        const pendingInvitationsQuery = await client.query(`
            SELECT pai.uuid as pending_uuid,
                   'pending' as status,
                   CASE 
                       WHEN conn.id IS NOT NULL THEN 'Connected - invitation will be sent automatically'
                       ELSE 'Pending connection - invitation will be sent when connection is accepted'
                   END as message,
                   pai.created_at as invited_at,
                   null as responded_at,
                   null as viewed_at,
                   u.username as parent_name,
                   c.name as child_name,
                   CASE 
                       WHEN conn.id IS NOT NULL THEN 'connected_pending_invite'
                       ELSE 'pending_connection'
                   END as invitation_type,
                   conn.status as connection_status
            FROM pending_activity_invitations pai
            INNER JOIN users u ON CAST(REPLACE(pai.pending_connection_id, 'pending-', '') AS INTEGER) = u.id
            LEFT JOIN children c ON c.parent_id = u.id
            LEFT JOIN connections conn ON (
                (conn.child1_id = $2 AND conn.child2_id = c.id) OR 
                (conn.child2_id = $2 AND conn.child1_id = c.id)
            ) AND conn.status = 'active'
            WHERE pai.activity_id = $1
            ORDER BY pai.created_at DESC
        `, [activityId, hostChildId]);
        
        client.release();
        
        // Combine actual participants and pending invitations
        const allParticipants = [
            ...participantsQuery.rows,
            ...pendingInvitationsQuery.rows
        ];
        
        const result = {
            host: hostQuery.rows[0] || null,
            participants: allParticipants
        };
        
        console.log(`📊 Found ${participantsQuery.rows.length} sent invitations + ${pendingInvitationsQuery.rows.length} pending invitations = ${allParticipants.length} total for activity ${activityId}`);
        console.log(`🏠 Host:`, result.host);
        console.log(`👥 All Participants:`, result.participants);
        
        const acceptedParticipants = result.participants.filter(p => p.status === 'accepted');
        console.log(`✅ ACCEPTED participants (${acceptedParticipants.length}):`, acceptedParticipants.map(p => ({
            child_name: p.child_name,
            child_id: p.child_id,
            parent_name: p.parent_name,
            status: p.status,
            invitation_id: p.invitation_id
        })));
        
        const pendingParticipants = result.participants.filter(p => p.status === 'pending');
        console.log(`⏳ PENDING participants (${pendingParticipants.length}):`, pendingParticipants.map(p => ({
            child_name: p.child_name,
            child_id: p.child_id,
            parent_name: p.parent_name,
            status: p.status
        })));
        
        res.json({ success: true, data: result });
    } catch (error) {
        console.error('🚨 Get activity participants error:', error);
        console.error('🔍 Error details:', {
            message: error.message,
            stack: error.stack,
            code: error.code,
            detail: error.detail,
            activityId: req.params.activityId,
            userId: req.user.id
        });
        res.status(500).json({ success: false, error: 'Failed to get activity participants' });
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
            console.log('  GET  /api/auth/verify - Token verification');
            console.log('  POST /api/auth/forgot-password - Password reset request');
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

// 🔔 AUTO-NOTIFICATION: Bidirectional auto-notify function
async function processAutoNotifications(client, requesterId, targetParentId, requesterChildId, targetChildId) {
    console.log('🔔 Processing bidirectional auto-notifications:', {
        requesterId,
        targetParentId,
        requesterChildId,
        targetChildId
    });

    try {
        const today = new Date().toISOString().split('T')[0];
        const oneYearLater = new Date();
        oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
        const endDate = oneYearLater.toISOString().split('T')[0];

        // Direction 1: Get requester's auto-notify activities and send to target parent
        console.log('🔄 Direction 1: Requester → Target');
        const requesterActivities = await client.query(`
            SELECT a.*, c.name as child_name FROM activities a
            JOIN children c ON a.child_id = c.id
            WHERE c.parent_id = $1 
              AND a.start_date >= $2
              AND a.start_date <= $3
              AND a.auto_notify_new_connections = true
        `, [requesterId, today, endDate]);

        console.log(`📋 Found ${requesterActivities.rows.length} auto-notify activities from requester`);

        for (const activity of requesterActivities.rows) {
            try {
                console.log(`📧 Sending invitation for "${activity.name}" to target parent ${targetParentId}`);
                await client.query(`
                    INSERT INTO activity_invitations (activity_id, inviter_parent_id, invited_parent_id, invited_child_id, message, status)
                    VALUES ($1, $2, $3, $4, $5, $6)
                `, [
                    activity.id,
                    requesterId,
                    targetParentId,
                    targetChildId,
                    `Welcome to our connection! ${activity.child_name || 'Your child'} would like to invite your child to join: ${activity.name}`,
                    'pending'
                ]);
                console.log(`✅ Invitation sent for "${activity.name}"`);
            } catch (inviteError) {
                console.error(`❌ Failed to send invitation for "${activity.name}":`, inviteError);
            }
        }

        // Direction 2: Get target parent's auto-notify activities and send to requester
        console.log('🔄 Direction 2: Target → Requester');
        const targetActivities = await client.query(`
            SELECT a.*, c.name as child_name FROM activities a
            JOIN children c ON a.child_id = c.id
            WHERE c.parent_id = $1 
              AND a.start_date >= $2
              AND a.start_date <= $3
              AND a.auto_notify_new_connections = true
        `, [targetParentId, today, endDate]);

        console.log(`📋 Found ${targetActivities.rows.length} auto-notify activities from target parent`);

        for (const activity of targetActivities.rows) {
            try {
                console.log(`📧 Sending invitation for "${activity.name}" to requester ${requesterId}`);
                await client.query(`
                    INSERT INTO activity_invitations (activity_id, inviter_parent_id, invited_parent_id, invited_child_id, message, status)
                    VALUES ($1, $2, $3, $4, $5, $6)
                `, [
                    activity.id,
                    targetParentId,
                    requesterId,
                    requesterChildId,
                    `Welcome to our connection! ${activity.child_name || 'Your child'} would like to invite your child to join: ${activity.name}`,
                    'pending'
                ]);
                console.log(`✅ Invitation sent for "${activity.name}"`);
            } catch (inviteError) {
                console.error(`❌ Failed to send invitation for "${activity.name}":`, inviteError);
            }
        }

        // Direction 3: Process pending invitations for both users
        console.log('🔄 Direction 3: Processing pending invitations');
        console.log(`🔍 Looking for pending invitations between:`, {
            requesterParentId: requesterId,
            targetParentId: targetParentId,
            requesterChildId: requesterChildId,
            targetChildId: targetChildId
        });
        
        // Get the new connection ID to map pending connection IDs
        const connectionResult = await client.query(`
            SELECT id FROM connections 
            WHERE (child1_id = $1 AND child2_id = $2) OR (child1_id = $2 AND child2_id = $1)
            ORDER BY created_at DESC 
            LIMIT 1
        `, [requesterChildId, targetChildId]);
        
        if (connectionResult.rows.length > 0) {
            
            // Process pending invitations for requester (activities where target was selected as pending)
            const requesterPendingKey = `pending-${targetParentId}`;
            const requesterPendingInvitations = await client.query(`
                SELECT pai.*, a.*, c.name as child_name FROM pending_activity_invitations pai
                JOIN activities a ON pai.activity_id = a.id
                JOIN children c ON a.child_id = c.id
                WHERE c.parent_id = $1 
                  AND pai.pending_connection_id = $2
                  AND a.start_date >= $3
            `, [requesterId, requesterPendingKey, today]);
            
            console.log(`📋 Found ${requesterPendingInvitations.rows.length} pending invitations from requester for key: ${requesterPendingKey}`);
            if (requesterPendingInvitations.rows.length > 0) {
                console.log(`🔍 Pending invitations details:`, requesterPendingInvitations.rows.map(p => ({
                    activity: p.name,
                    activity_id: p.activity_id,
                    pending_connection_id: p.pending_connection_id,
                    child_name: p.child_name
                })));
            }
            
            for (const pendingInvite of requesterPendingInvitations.rows) {
                try {
                    console.log(`📧 Sending pending invitation for "${pendingInvite.name}" to target parent ${targetParentId}`);
                    await client.query(`
                        INSERT INTO activity_invitations (activity_id, inviter_parent_id, invited_parent_id, invited_child_id, message, status)
                        VALUES ($1, $2, $3, $4, $5, $6)
                    `, [
                        pendingInvite.activity_id,
                        requesterId,
                        targetParentId,
                        targetChildId,
                        `${pendingInvite.child_name || 'Your child'} would like to invite your child to join: ${pendingInvite.name}`,
                        'pending'
                    ]);
                    
                    // Remove the pending invitation since it's now been sent
                    await client.query(`
                        DELETE FROM pending_activity_invitations WHERE id = $1
                    `, [pendingInvite.id]);
                    
                    console.log(`✅ Pending invitation sent and removed for "${pendingInvite.name}"`);
                } catch (inviteError) {
                    console.error(`❌ Failed to send pending invitation for "${pendingInvite.name}":`, inviteError);
                }
            }
            
            // Process pending invitations for target (activities where requester was selected as pending)
            const targetPendingKey = `pending-${requesterId}`;
            const targetPendingInvitations = await client.query(`
                SELECT pai.*, a.*, c.name as child_name FROM pending_activity_invitations pai
                JOIN activities a ON pai.activity_id = a.id
                JOIN children c ON a.child_id = c.id
                WHERE c.parent_id = $1 
                  AND pai.pending_connection_id = $2
                  AND a.start_date >= $3
            `, [targetParentId, targetPendingKey, today]);
            
            console.log(`📋 Found ${targetPendingInvitations.rows.length} pending invitations from target parent for key: ${targetPendingKey}`);
            if (targetPendingInvitations.rows.length > 0) {
                console.log(`🔍 Target pending invitations details:`, targetPendingInvitations.rows.map(p => ({
                    activity: p.name,
                    activity_id: p.activity_id,
                    pending_connection_id: p.pending_connection_id,
                    child_name: p.child_name
                })));
            }
            
            for (const pendingInvite of targetPendingInvitations.rows) {
                try {
                    console.log(`📧 Sending pending invitation for "${pendingInvite.name}" to requester ${requesterId}`);
                    await client.query(`
                        INSERT INTO activity_invitations (activity_id, inviter_parent_id, invited_parent_id, invited_child_id, message, status)
                        VALUES ($1, $2, $3, $4, $5, $6)
                    `, [
                        pendingInvite.activity_id,
                        targetParentId,
                        requesterId,
                        requesterChildId,
                        `${pendingInvite.child_name || 'Your child'} would like to invite your child to join: ${pendingInvite.name}`,
                        'pending'
                    ]);
                    
                    // Remove the pending invitation since it's now been sent
                    await client.query(`
                        DELETE FROM pending_activity_invitations WHERE id = $1
                    `, [pendingInvite.id]);
                    
                    console.log(`✅ Pending invitation sent and removed for "${pendingInvite.name}"`);
                } catch (inviteError) {
                    console.error(`❌ Failed to send pending invitation for "${pendingInvite.name}":`, inviteError);
                }
            }
        }

        console.log('🎉 Bidirectional auto-notifications and pending invitations complete');
    } catch (error) {
        console.error('❌ Auto-notification processing failed:', error);
    }
}

// Admin endpoint to cleanup duplicate pending invitations
app.post('/api/admin/cleanup-pending-invitations', authenticateToken, async (req, res) => {
    try {
        console.log('🧹 Admin cleanup: removing duplicate pending invitations');
        
        const client = await pool.connect();
        
        // Find pending invitations that have corresponding activity invitations
        const duplicatesQuery = await client.query(`
            SELECT pai.id as pending_id, pai.activity_id, pai.pending_connection_id,
                   ai.id as actual_invitation_id, ai.invited_parent_id
            FROM pending_activity_invitations pai
            JOIN activity_invitations ai ON pai.activity_id = ai.activity_id
            WHERE CAST(REPLACE(pai.pending_connection_id, 'pending-', '') AS INTEGER) = ai.invited_parent_id
        `);
        
        console.log(`🔍 Found ${duplicatesQuery.rows.length} duplicate pending invitations`);
        
        if (duplicatesQuery.rows.length > 0) {
            // Delete the duplicate pending invitations
            const pendingIdsToDelete = duplicatesQuery.rows.map(row => row.pending_id);
            
            const deleteResult = await client.query(`
                DELETE FROM pending_activity_invitations 
                WHERE id = ANY($1)
                RETURNING id, activity_id, pending_connection_id
            `, [pendingIdsToDelete]);
            
            console.log(`✅ Deleted ${deleteResult.rows.length} duplicate pending invitations`);
            
            client.release();
            
            res.json({
                success: true,
                message: `Cleaned up ${deleteResult.rows.length} duplicate pending invitations`,
                deletedRecords: deleteResult.rows
            });
        } else {
            client.release();
            res.json({
                success: true,
                message: 'No duplicate pending invitations found'
            });
        }
        
    } catch (error) {
        console.error('❌ Cleanup failed:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to cleanup pending invitations',
            details: error.message 
        });
    }
});

startServer();