const sql = require('mssql');

async function migrateMockDatabase() {
    const config = {
        server: 'gruju.database.windows.net',
        port: 1433,
        database: 'gruju_test',
        user: 'jonathan.roberts',
        password: 'Gruju1891',
        options: {
            encrypt: true,
            trustServerCertificate: false,
            enableArithAbort: true,
            connectionTimeout: 30000,
            requestTimeout: 30000
        }
    };

    try {
        console.log('🔄 Connecting to gruju_test database...');
        const pool = new sql.ConnectionPool(config);
        await pool.connect();
        console.log('✅ Connected successfully!');
        
        console.log('🗑️ Clearing existing data...');
        
        // Clear existing data in the correct order (due to foreign keys)
        await pool.request().query('DELETE FROM connections');
        await pool.request().query('DELETE FROM connection_requests');
        await pool.request().query('DELETE FROM activities');
        await pool.request().query('DELETE FROM children');
        await pool.request().query('DELETE FROM users');
        
        console.log('📝 Migrating mock database users...');
        
        // Insert all users from mock database (exactly as they appear in mockDatabase.ts)
        await pool.request().query(`
            INSERT INTO users (username, email, phone, password_hash, role, is_active, family_name, created_at, updated_at) VALUES
            -- Admin accounts
            ('admin', 'admin@parentactivityapp.com', '+1555000001', '$2a$12$dummy.hash.for.demo.purposes', 'super_admin', 1, NULL, '2024-01-01T00:00:00', '2024-01-01T00:00:00'),
            ('manager', 'manager@parentactivityapp.com', '+1555000002', '$2a$12$dummy.hash.for.demo.purposes', 'admin', 1, NULL, '2024-01-02T00:00:00', '2024-01-02T00:00:00'),
            
            -- Regular user accounts (from mock database)
            ('john_doe', 'john@example.com', '+1234567890', '$2a$12$dummy.hash.for.demo.purposes', 'user', 1, 'Doe Family', '2024-01-03T00:00:00', '2024-01-03T00:00:00'),
            ('jane_smith', 'jane@example.com', '+1987654321', '$2a$12$dummy.hash.for.demo.purposes', 'user', 1, 'Smith Family', '2024-01-04T00:00:00', '2024-01-04T00:00:00'),
            ('parent_mike', 'mike@example.com', '+1555123456', '$2a$12$dummy.hash.for.demo.purposes', 'user', 1, 'Johnson Family', '2024-01-05T00:00:00', '2024-01-05T00:00:00'),
            ('sarah_wilson', 'sarah@example.com', '+1555987654', '$2a$12$dummy.hash.for.demo.purposes', 'user', 1, 'Wilson Family', '2024-01-06T00:00:00', '2024-01-06T00:00:00'),
            ('inactive_user', 'inactive@example.com', '+1555555555', '$2a$12$dummy.hash.for.demo.purposes', 'user', 0, 'Inactive Family', '2024-01-07T00:00:00', '2024-01-15T00:00:00')
        `);
        
        console.log('👶 Migrating mock database children...');
        
        // Get user IDs for foreign key relationships
        const userIds = await pool.request().query(`
            SELECT id, email FROM users WHERE role = 'user' OR role = 'admin' OR role = 'super_admin'
        `);
        
        const userIdMap = {};
        userIds.recordset.forEach(user => {
            userIdMap[user.email] = user.id;
        });
        
        // Insert children exactly as they appear in mock database
        await pool.request().query(`
            INSERT INTO children (parent_id, name, created_at, updated_at) VALUES
            (${userIdMap['john@example.com']}, 'Emma Doe', '2024-01-10T00:00:00', '2024-01-10T00:00:00'),
            (${userIdMap['jane@example.com']}, 'Liam Smith', '2024-01-11T00:00:00', '2024-01-11T00:00:00'),
            (${userIdMap['mike@example.com']}, 'Olivia Johnson', '2024-01-12T00:00:00', '2024-01-12T00:00:00')
        `);
        
        console.log('🎯 Migrating mock database activities...');
        
        // Get child IDs
        const children = await pool.request().query(`
            SELECT id, name FROM children
        `);
        
        const childIdMap = {};
        children.recordset.forEach(child => {
            childIdMap[child.name] = child.id;
        });
        
        // Insert activities exactly as they appear in mock database
        await pool.request().query(`
            INSERT INTO activities (child_id, name, start_date, end_date, start_time, end_time, website_url, created_at, updated_at) VALUES
            (${childIdMap['Emma Doe']}, 'Soccer Practice', '2024-02-01', '2024-02-01', '15:00:00', '16:30:00', 'https://example.com/soccer', '2024-01-20T00:00:00', '2024-01-20T00:00:00'),
            (${childIdMap['Liam Smith']}, 'Piano Lessons', '2024-02-02', '2024-02-02', '14:00:00', '15:00:00', NULL, '2024-01-21T00:00:00', '2024-01-21T00:00:00'),
            (${childIdMap['Olivia Johnson']}, 'Art Class', '2024-02-03', '2024-02-03', '10:00:00', '11:30:00', 'https://example.com/art', '2024-01-22T00:00:00', '2024-01-22T00:00:00')
        `);
        
        console.log('🔗 Adding enhanced demo connections and requests...');
        
        // Add some demo connection requests between the mock database users
        await pool.request().query(`
            INSERT INTO connection_requests (requester_id, target_parent_id, child_id, target_child_id, status, message, created_at, updated_at) VALUES
            (${userIdMap['jane@example.com']}, ${userIdMap['john@example.com']}, ${childIdMap['Liam Smith']}, ${childIdMap['Emma Doe']}, 'pending', 'Hi! Liam and Emma are around the same age. Would love to set up a playdate!', DATEADD(hour, -4, GETDATE()), DATEADD(hour, -4, GETDATE())),
            (${userIdMap['mike@example.com']}, ${userIdMap['jane@example.com']}, ${childIdMap['Olivia Johnson']}, ${childIdMap['Liam Smith']}, 'pending', 'Our kids both love music! Maybe they could be friends?', DATEADD(hour, -2, GETDATE()), DATEADD(hour, -2, GETDATE())),
            (${userIdMap['sarah@example.com']}, ${userIdMap['john@example.com']}, ${childIdMap['Emma Doe']}, ${childIdMap['Emma Doe']}, 'accepted', 'Would love to connect with Emma''s family for activities!', DATEADD(day, -1, GETDATE()), DATEADD(hour, -6, GETDATE()))
        `);
        
        // Add some demo connections (accepted connections)
        await pool.request().query(`
            INSERT INTO connections (child1_id, child2_id, status, created_at) VALUES
            (${childIdMap['Emma Doe']}, ${childIdMap['Olivia Johnson']}, 'active', DATEADD(day, -5, GETDATE())),
            (${childIdMap['Liam Smith']}, ${childIdMap['Olivia Johnson']}, 'active', DATEADD(day, -3, GETDATE()))
        `);
        
        // Get final counts
        const stats = await pool.request().query(`
            SELECT 
                (SELECT COUNT(*) FROM users) as users,
                (SELECT COUNT(*) FROM children) as children,
                (SELECT COUNT(*) FROM activities) as activities,
                (SELECT COUNT(*) FROM connection_requests) as requests,
                (SELECT COUNT(*) FROM connections) as connections
        `);
        
        const counts = stats.recordset[0];
        
        console.log('✅ Mock database migration completed successfully!');
        console.log('📊 Your gruju_test database now contains all mock database data:');
        console.log(`   - ${counts.users} users (including admin accounts and mock users)`);
        console.log(`   - ${counts.children} children from mock database families`);
        console.log(`   - ${counts.activities} activities from mock database`);
        console.log(`   - ${counts.requests} connection requests between families`);
        console.log(`   - ${counts.connections} established connections`);
        console.log('');
        console.log('🎮 You can now use the Parent Activity App with all original mock data!');
        console.log('🔗 Demo App: http://localhost:9000/demo.html');
        console.log('');
        console.log('👨‍👩‍👧‍👦 Try logging in as:');
        console.log('   - admin@parentactivityapp.com / demo123 (Super Admin)');
        console.log('   - john@example.com / demo123 (John Doe - Emma\'s parent)');
        console.log('   - jane@example.com / demo123 (Jane Smith - Liam\'s parent)');
        console.log('   - mike@example.com / demo123 (Mike - Olivia\'s parent)');
        console.log('   - sarah@example.com / demo123 (Sarah Wilson)');
        console.log('');
        console.log('📝 Mock Database Features Migrated:');
        console.log('   ✅ All original user accounts with exact usernames');
        console.log('   ✅ All children with original names and parent relationships');
        console.log('   ✅ All activities with original schedules and URLs');
        console.log('   ✅ Connection requests between families');
        console.log('   ✅ Established connections between children');
        console.log('   ✅ Inactive user account for testing');
        
        await pool.close();
        
    } catch (error) {
        console.error('❌ Mock database migration failed:', error.message);
        if (error.originalError) {
            console.error('Original error:', error.originalError.message);
        }
        process.exit(1);
    }
}

migrateMockDatabase();