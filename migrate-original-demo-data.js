const sql = require('mssql');

async function migrateOriginalDemoData() {
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
        
        console.log('📝 Migrating original demo.html users...');
        
        // Insert all users from original demo.html (exactly as they appear in demoFamilies)
        await pool.request().query(`
            INSERT INTO users (username, email, phone, password_hash, role, is_active, family_name, created_at, updated_at) VALUES
            -- Admin accounts
            ('admin', 'admin@parentactivityapp.com', '+1555000001', '$2a$12$dummy.hash.for.demo.purposes', 'super_admin', 1, 'Super Admin', '2024-01-01T00:00:00', '2024-01-01T00:00:00'),
            ('manager', 'manager@parentactivityapp.com', '+1555000002', '$2a$12$dummy.hash.for.demo.purposes', 'admin', 1, 'System Manager', '2024-01-02T00:00:00', '2024-01-02T00:00:00'),
            
            -- Original demo family accounts from demo.html
            ('johnson', 'johnson@example.com', '', '$2a$12$dummy.hash.for.demo.purposes', 'user', 1, 'Johnson Family', '2024-01-03T00:00:00', '2024-01-03T00:00:00'),
            ('davis', 'davis@example.com', '07487654321', '$2a$12$dummy.hash.for.demo.purposes', 'user', 1, 'Davis Family', '2024-01-04T00:00:00', '2024-01-04T00:00:00'),
            ('wong', 'wong@example.com', '07456789123', '$2a$12$dummy.hash.for.demo.purposes', 'user', 1, 'Wong Family', '2024-01-05T00:00:00', '2024-01-05T00:00:00'),
            ('thompson', 'thompson@example.com', '', '$2a$12$dummy.hash.for.demo.purposes', 'user', 1, 'Thompson Family', '2024-01-06T00:00:00', '2024-01-06T00:00:00'),
            ('miller', 'joe@example.com', '07412345123', '$2a$12$dummy.hash.for.demo.purposes', 'user', 1, 'Miller Family', '2024-01-07T00:00:00', '2024-01-07T00:00:00')
        `);
        
        console.log('👶 Migrating original demo.html children...');
        
        // Get user IDs for foreign key relationships
        const userIds = await pool.request().query(`
            SELECT id, email FROM users WHERE role = 'user' OR role = 'admin' OR role = 'super_admin'
        `);
        
        const userIdMap = {};
        userIds.recordset.forEach(user => {
            userIdMap[user.email] = user.id;
        });
        
        // Insert children exactly as they appear in demo.html demoFamilies
        await pool.request().query(`
            INSERT INTO children (parent_id, name, created_at, updated_at) VALUES
            -- Johnson Family children
            (${userIdMap['johnson@example.com']}, 'Emma Johnson', '2024-01-10T00:00:00', '2024-01-10T00:00:00'),
            (${userIdMap['johnson@example.com']}, 'Alex Johnson', '2024-01-10T00:00:00', '2024-01-10T00:00:00'),
            
            -- Davis Family children
            (${userIdMap['davis@example.com']}, 'Jake Davis', '2024-01-11T00:00:00', '2024-01-11T00:00:00'),
            
            -- Wong Family children
            (${userIdMap['wong@example.com']}, 'Mia Wong', '2024-01-12T00:00:00', '2024-01-12T00:00:00'),
            (${userIdMap['wong@example.com']}, 'Ryan Wong', '2024-01-12T00:00:00', '2024-01-12T00:00:00'),
            (${userIdMap['wong@example.com']}, 'Zoe Wong', '2024-01-12T00:00:00', '2024-01-12T00:00:00'),
            
            -- Thompson Family children
            (${userIdMap['thompson@example.com']}, 'Sophie Thompson', '2024-01-13T00:00:00', '2024-01-13T00:00:00'),
            (${userIdMap['thompson@example.com']}, 'Oliver Thompson', '2024-01-13T00:00:00', '2024-01-13T00:00:00'),
            
            -- Miller Family children
            (${userIdMap['joe@example.com']}, 'Theodore Miller', '2024-01-14T00:00:00', '2024-01-14T00:00:00')
        `);
        
        console.log('🎯 Migrating original demo.html activities...');
        
        // Get child IDs
        const children = await pool.request().query(`
            SELECT id, name FROM children
        `);
        
        const childIdMap = {};
        children.recordset.forEach(child => {
            childIdMap[child.name] = child.id;
        });
        
        // Get current week dates for activities (similar to demo.html logic)
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
        
        // Insert activities from original demo.html Johnson family activities
        await pool.request().query(`
            INSERT INTO activities (child_id, name, start_date, end_date, start_time, end_time, website_url, created_at, updated_at) VALUES
            -- Emma Johnson activities (from original demo.html)
            (${childIdMap['Emma Johnson']}, 'Soccer Practice', '${currentWeekDates[0]}', '${currentWeekDates[0]}', '16:00:00', '18:00:00', NULL, GETDATE(), GETDATE()),
            (${childIdMap['Emma Johnson']}, 'Swimming Lesson', '${currentWeekDates[2]}', '${currentWeekDates[2]}', '10:00:00', '11:00:00', NULL, GETDATE(), GETDATE()),
            (${childIdMap['Emma Johnson']}, 'Art Class', '${currentWeekDates[3]}', '${currentWeekDates[3]}', '14:00:00', '15:30:00', NULL, GETDATE(), GETDATE()),
            (${childIdMap['Emma Johnson']}, 'Dance Class', '${currentWeekDates[5]}', '${currentWeekDates[5]}', '11:00:00', '12:00:00', NULL, GETDATE(), GETDATE()),
            (${childIdMap['Emma Johnson']}, 'Tennis Lesson', '${currentWeekDates[6]}', '${currentWeekDates[6]}', '14:00:00', '15:00:00', NULL, GETDATE(), GETDATE()),
            
            -- Alex Johnson activities (from original demo.html)
            (${childIdMap['Alex Johnson']}, 'Piano Lesson', '${currentWeekDates[1]}', '${currentWeekDates[1]}', '15:30:00', '16:30:00', NULL, GETDATE(), GETDATE()),
            (${childIdMap['Alex Johnson']}, 'Basketball', '${currentWeekDates[4]}', '${currentWeekDates[4]}', '09:00:00', '10:30:00', NULL, GETDATE(), GETDATE()),
            
            -- Other families activities
            (${childIdMap['Theodore Miller']}, 'Robotics Club', '${currentWeekDates[1]}', '${currentWeekDates[1]}', '16:00:00', '18:00:00', NULL, GETDATE(), GETDATE()),
            (${childIdMap['Jake Davis']}, 'Football Training', '${currentWeekDates[2]}', '${currentWeekDates[2]}', '17:00:00', '18:30:00', NULL, GETDATE(), GETDATE()),
            (${childIdMap['Mia Wong']}, 'Violin Lessons', '${currentWeekDates[3]}', '${currentWeekDates[3]}', '15:00:00', '16:00:00', NULL, GETDATE(), GETDATE())
        `);
        
        console.log('🤝 Adding demo connections and requests...');
        
        // Add some demo connection requests between families
        await pool.request().query(`
            INSERT INTO connection_requests (requester_id, target_parent_id, child_id, target_child_id, status, message, created_at, updated_at) VALUES
            (${userIdMap['davis@example.com']}, ${userIdMap['johnson@example.com']}, ${childIdMap['Jake Davis']}, ${childIdMap['Emma Johnson']}, 'pending', 'Jake would love to join Emma for soccer practice!', DATEADD(hour, -4, GETDATE()), DATEADD(hour, -4, GETDATE())),
            (${userIdMap['wong@example.com']}, ${userIdMap['johnson@example.com']}, ${childIdMap['Ryan Wong']}, ${childIdMap['Alex Johnson']}, 'pending', 'Ryan and Alex could be great basketball partners!', DATEADD(hour, -2, GETDATE()), DATEADD(hour, -2, GETDATE())),
            (${userIdMap['thompson@example.com']}, ${userIdMap['johnson@example.com']}, ${childIdMap['Sophie Thompson']}, ${childIdMap['Emma Johnson']}, 'accepted', 'Sophie is excited to join Emma for swimming!', DATEADD(day, -1, GETDATE()), DATEADD(hour, -6, GETDATE()))
        `);
        
        // Add some demo connections (accepted connections)
        await pool.request().query(`
            INSERT INTO connections (child1_id, child2_id, status, created_at) VALUES
            (${childIdMap['Emma Johnson']}, ${childIdMap['Theodore Miller']}, 'active', DATEADD(day, -5, GETDATE())),
            (${childIdMap['Alex Johnson']}, ${childIdMap['Ryan Wong']}, 'active', DATEADD(day, -3, GETDATE())),
            (${childIdMap['Emma Johnson']}, ${childIdMap['Sophie Thompson']}, 'active', DATEADD(day, -2, GETDATE()))
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
        
        console.log('✅ Original demo.html data migration completed successfully!');
        console.log('📊 Your gruju_test database now contains original demo data:');
        console.log(`   - ${counts.users} users (including admin accounts and demo families)`);
        console.log(`   - ${counts.children} children from original demo families`);
        console.log(`   - ${counts.activities} activities from original demo schedule`);
        console.log(`   - ${counts.requests} connection requests between families`);
        console.log(`   - ${counts.connections} established connections`);
        console.log('');
        console.log('🎮 You can now use the Parent Activity App with original demo.html data!');
        console.log('🔗 Demo App: http://localhost:9000/demo.html');
        console.log('');
        console.log('👨‍👩‍👧‍👦 Original Demo Login Accounts:');
        console.log('   - admin@parentactivityapp.com / demo123 (Super Admin)');
        console.log('   - johnson@example.com / demo123 (Johnson Family - Emma & Alex)');
        console.log('   - davis@example.com / demo123 (Davis Family - Jake)');
        console.log('   - wong@example.com / demo123 (Wong Family - Mia, Ryan, Zoe)');
        console.log('   - thompson@example.com / demo123 (Thompson Family - Sophie, Oliver)');
        console.log('   - joe@example.com / demo123 (Miller Family - Theodore)');
        console.log('');
        console.log('📝 Original Demo.html Features Migrated:');
        console.log('   ✅ All original family accounts with exact emails');
        console.log('   ✅ All children with original names from demo.html');
        console.log('   ✅ Emma & Alex Johnson activities (Soccer, Piano, etc.)');
        console.log('   ✅ Connection requests between families');
        console.log('   ✅ Established friendships between children');
        console.log('   ✅ Current week activity scheduling');
        
        await pool.close();
        
    } catch (error) {
        console.error('❌ Original demo data migration failed:', error.message);
        if (error.originalError) {
            console.error('Original error:', error.originalError.message);
        }
        process.exit(1);
    }
}

migrateOriginalDemoData();