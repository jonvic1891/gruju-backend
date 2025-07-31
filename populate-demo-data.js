const sql = require('mssql');

async function populateDemoData() {
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
        
        console.log('📝 Inserting demo users...');
        
        // Insert demo users
        await pool.request().query(`
            INSERT INTO users (username, email, phone, password_hash, role, is_active, family_name, created_at, updated_at) VALUES
            ('admin', 'admin@parentactivityapp.com', '+1555000001', '$2a$12$dummy.hash.for.demo.purposes', 'super_admin', 1, NULL, '2024-01-01T00:00:00', '2024-01-01T00:00:00'),
            ('manager', 'manager@parentactivityapp.com', '+1555000002', '$2a$12$dummy.hash.for.demo.purposes', 'admin', 1, NULL, '2024-01-01T00:00:00', '2024-01-01T00:00:00'),
            ('john', 'john@example.com', '+1555000003', '$2a$12$dummy.hash.for.demo.purposes', 'user', 1, 'Johnson Family', '2024-01-01T00:00:00', '2024-01-01T00:00:00'),
            ('jane', 'jane@example.com', '+1555000004', '$2a$12$dummy.hash.for.demo.purposes', 'user', 1, 'Smith Family', '2024-01-01T00:00:00', '2024-01-01T00:00:00'),
            ('mike', 'mike@example.com', '+1555000005', '$2a$12$dummy.hash.for.demo.purposes', 'user', 1, 'Miller Family', '2024-01-01T00:00:00', '2024-01-01T00:00:00'),
            ('sarah', 'sarah@example.com', '+1555000006', '$2a$12$dummy.hash.for.demo.purposes', 'user', 1, 'Davis Family', '2024-01-01T00:00:00', '2024-01-01T00:00:00'),
            ('david', 'david@example.com', '+1555000007', '$2a$12$dummy.hash.for.demo.purposes', 'user', 1, 'Wilson Family', '2024-01-01T00:00:00', '2024-01-01T00:00:00')
        `);
        
        console.log('👶 Inserting demo children...');
        
        // Get user IDs
        const userIds = await pool.request().query(`
            SELECT id, email FROM users WHERE role = 'user'
        `);
        
        const userIdMap = {};
        userIds.recordset.forEach(user => {
            userIdMap[user.email] = user.id;
        });
        
        // Insert children
        await pool.request().query(`
            INSERT INTO children (parent_id, name, created_at, updated_at) VALUES
            (${userIdMap['john@example.com']}, 'Emma Johnson', '2024-01-01T00:00:00', '2024-01-01T00:00:00'),
            (${userIdMap['john@example.com']}, 'Alex Johnson', '2024-01-01T00:00:00', '2024-01-01T00:00:00'),
            (${userIdMap['jane@example.com']}, 'Sophia Smith', '2024-01-01T00:00:00', '2024-01-01T00:00:00'),
            (${userIdMap['jane@example.com']}, 'Lucas Smith', '2024-01-01T00:00:00', '2024-01-01T00:00:00'),
            (${userIdMap['mike@example.com']}, 'Olivia Miller', '2024-01-01T00:00:00', '2024-01-01T00:00:00'),
            (${userIdMap['mike@example.com']}, 'Mason Miller', '2024-01-01T00:00:00', '2024-01-01T00:00:00'),
            (${userIdMap['mike@example.com']}, 'Theodore Miller', '2024-01-01T00:00:00', '2024-01-01T00:00:00'),
            (${userIdMap['sarah@example.com']}, 'Isabella Davis', '2024-01-01T00:00:00', '2024-01-01T00:00:00'),
            (${userIdMap['sarah@example.com']}, 'Ethan Davis', '2024-01-01T00:00:00', '2024-01-01T00:00:00'),
            (${userIdMap['david@example.com']}, 'Ava Wilson', '2024-01-01T00:00:00', '2024-01-01T00:00:00')
        `);
        
        console.log('🎯 Inserting demo activities...');
        
        // Get child IDs
        const children = await pool.request().query(`
            SELECT id, name FROM children
        `);
        
        const childIdMap = {};
        children.recordset.forEach(child => {
            childIdMap[child.name] = child.id;
        });
        
        // Insert activities with dates relative to today
        const today = new Date();
        const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
        const dayAfterTomorrow = new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000);
        const threeDaysLater = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000);
        
        const formatDate = (date) => date.toISOString().split('T')[0];
        
        await pool.request().query(`
            INSERT INTO activities (child_id, name, start_date, end_date, start_time, end_time, website_url, created_at, updated_at) VALUES
            -- Emma's activities
            (${childIdMap['Emma Johnson']}, 'Soccer Practice', '${formatDate(tomorrow)}', NULL, '16:00:00', '17:30:00', NULL, GETDATE(), GETDATE()),
            (${childIdMap['Emma Johnson']}, 'Piano Lesson', '${formatDate(threeDaysLater)}', NULL, '15:00:00', '16:00:00', NULL, GETDATE(), GETDATE()),
            -- Alex's activities  
            (${childIdMap['Alex Johnson']}, 'Basketball Training', '${formatDate(dayAfterTomorrow)}', NULL, '17:00:00', '18:30:00', NULL, GETDATE(), GETDATE()),
            -- Sophia's activities
            (${childIdMap['Sophia Smith']}, 'Swimming Lessons', '${formatDate(tomorrow)}', NULL, '14:00:00', '15:00:00', 'https://swimclub.com', GETDATE(), GETDATE()),
            -- Lucas's activities
            (${childIdMap['Lucas Smith']}, 'Guitar Lessons', '${formatDate(dayAfterTomorrow)}', NULL, '16:00:00', '17:00:00', NULL, GETDATE(), GETDATE()),
            -- Olivia's activities
            (${childIdMap['Olivia Miller']}, 'Ballet Class', '${formatDate(threeDaysLater)}', NULL, '16:00:00', '17:00:00', 'https://ballet.com', GETDATE(), GETDATE()),
            -- Mason's activities
            (${childIdMap['Mason Miller']}, 'Football Practice', '${formatDate(tomorrow)}', NULL, '17:30:00', '19:00:00', NULL, GETDATE(), GETDATE()),
            -- Theodore's activities
            (${childIdMap['Theodore Miller']}, 'Robotics Club', '${formatDate(dayAfterTomorrow)}', NULL, '16:00:00', '18:00:00', 'https://robotics.edu', GETDATE(), GETDATE()),
            -- Isabella's activities
            (${childIdMap['Isabella Davis']}, 'Gymnastics', '${formatDate(threeDaysLater)}', NULL, '17:00:00', '18:30:00', 'https://gymnastics.com', GETDATE(), GETDATE()),
            -- Ethan's activities
            (${childIdMap['Ethan Davis']}, 'Karate Class', '${formatDate(tomorrow)}', NULL, '18:00:00', '19:00:00', NULL, GETDATE(), GETDATE()),
            -- Ava's activities
            (${childIdMap['Ava Wilson']}, 'Violin Lessons', '${formatDate(dayAfterTomorrow)}', NULL, '15:30:00', '16:30:00', NULL, GETDATE(), GETDATE())
        `);
        
        console.log('🤝 Inserting demo connections...');
        
        // Insert some demo connection requests
        await pool.request().query(`
            INSERT INTO connection_requests (requester_id, target_parent_id, child_id, target_child_id, status, message, created_at, updated_at) VALUES
            (${userIdMap['jane@example.com']}, ${userIdMap['john@example.com']}, ${childIdMap['Sophia Smith']}, ${childIdMap['Emma Johnson']}, 'pending', 'Hi! Our daughters are the same age and both love soccer. Would love to arrange a playdate!', DATEADD(hour, -2, GETDATE()), DATEADD(hour, -2, GETDATE())),
            (${userIdMap['mike@example.com']}, ${userIdMap['john@example.com']}, ${childIdMap['Theodore Miller']}, ${childIdMap['Alex Johnson']}, 'pending', 'Theodore and Alex are both into sports. Maybe they could be friends?', DATEADD(hour, -1, GETDATE()), DATEADD(hour, -1, GETDATE()))
        `);
        
        // Insert some demo connections
        await pool.request().query(`
            INSERT INTO connections (child1_id, child2_id, status, created_at) VALUES
            (${childIdMap['Emma Johnson']}, ${childIdMap['Olivia Miller']}, 'active', DATEADD(day, -2, GETDATE())),
            (${childIdMap['Alex Johnson']}, ${childIdMap['Lucas Smith']}, 'active', DATEADD(day, -3, GETDATE()))
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
        
        console.log('✅ Database setup completed successfully!');
        console.log('📊 Your gruju_test database now contains:');
        console.log(`   - ${counts.users} demo users (including admin accounts)`);
        console.log(`   - ${counts.children} demo children from different families`);
        console.log(`   - ${counts.activities} demo activities scheduled for upcoming days`);
        console.log(`   - ${counts.requests} connection requests between families`);
        console.log(`   - ${counts.connections} established connections`);
        console.log('');
        console.log('🎮 You can now use the Parent Activity App with live data!');
        console.log('🔗 Demo App: http://localhost:8080/demo');
        console.log('');
        console.log('👨‍👩‍👧‍👦 Try logging in as:');
        console.log('   - admin@parentactivityapp.com / demo123 (Super Admin)');
        console.log('   - john@example.com / demo123 (Johnson Family - 2 children)');
        console.log('   - jane@example.com / demo123 (Smith Family - 2 children)');
        console.log('   - mike@example.com / demo123 (Miller Family - 3 children)');
        console.log('   - sarah@example.com / demo123 (Davis Family - 2 children)');
        console.log('   - david@example.com / demo123 (Wilson Family - 1 child)');
        
        await pool.close();
        
    } catch (error) {
        console.error('❌ Database setup failed:', error.message);
        if (error.originalError) {
            console.error('Original error:', error.originalError.message);
        }
        process.exit(1);
    }
}

populateDemoData();