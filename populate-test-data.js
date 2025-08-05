const sql = require('mssql');

// Database configuration from environment variables
const config = {
    server: process.env.AZURE_SQL_SERVER || 'gruju.database.windows.net',
    database: process.env.AZURE_SQL_DATABASE || 'gruju_test',
    user: process.env.AZURE_SQL_USER || 'jonathan.roberts',
    password: process.env.AZURE_SQL_PASSWORD || 'Gruju1891',
    options: {
        encrypt: true,
        trustServerCertificate: false
    },
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    },
    requestTimeout: 30000,
    connectionTimeout: 30000
};

async function populateTestData() {
    try {
        console.log('🔄 Connecting to Azure SQL Database...');
        const pool = await sql.connect(config);
        console.log('✅ Connected to database');

        // Check if test data already exists
        const existingUsers = await pool.request().query(`
            SELECT COUNT(*) as count FROM users WHERE email LIKE '%test%'
        `);
        
        if (existingUsers.recordset[0].count > 0) {
            console.log('⚠️  Test data already exists. Adding more activities...');
        }

        // Create test users if they don't exist
        const testUsers = [
            { username: 'parent1', email: 'parent1@test.com', phone: '+1234567890', password: 'password123' },
            { username: 'parent2', email: 'parent2@test.com', phone: '+1234567891', password: 'password123' },
            { username: 'parent3', email: 'parent3@test.com', phone: '+1234567892', password: 'password123' }
        ];

        const userIds = [];
        for (const user of testUsers) {
            const existingUser = await pool.request()
                .input('email', sql.NVarChar, user.email)
                .query('SELECT id FROM users WHERE email = @email');
            
            if (existingUser.recordset.length === 0) {
                const result = await pool.request()
                    .input('username', sql.NVarChar, user.username)
                    .input('email', sql.NVarChar, user.email)
                    .input('phone', sql.NVarChar, user.phone)
                    .input('password', sql.NVarChar, user.password) // In real app, this would be hashed
                    .query(`
                        INSERT INTO users (username, email, phone, password_hash, role)
                        VALUES (@username, @email, @phone, @password, 'user');
                        SELECT SCOPE_IDENTITY() as id;
                    `);
                userIds.push(result.recordset[0].id);
                console.log(`✅ Created user: ${user.username}`);
            } else {
                userIds.push(existingUser.recordset[0].id);
                console.log(`📋 User exists: ${user.username} (ID: ${existingUser.recordset[0].id})`);
            }
        }

        // Create test children
        const testChildren = [
            { name: 'Emma Johnson', parent_id: userIds[0] },
            { name: 'Liam Johnson', parent_id: userIds[0] },
            { name: 'Sophia Smith', parent_id: userIds[1] },
            { name: 'Noah Williams', parent_id: userIds[2] }
        ];

        const childIds = [];
        for (const child of testChildren) {
            const existingChild = await pool.request()
                .input('name', sql.NVarChar, child.name)
                .input('parent_id', sql.Int, child.parent_id)
                .query('SELECT id FROM children WHERE name = @name AND parent_id = @parent_id');
            
            if (existingChild.recordset.length === 0) {
                const result = await pool.request()
                    .input('name', sql.NVarChar, child.name)
                    .input('parent_id', sql.Int, child.parent_id)
                    .query(`
                        INSERT INTO children (name, parent_id)
                        VALUES (@name, @parent_id);
                        SELECT SCOPE_IDENTITY() as id;
                    `);
                childIds.push(result.recordset[0].id);
                console.log(`✅ Created child: ${child.name}`);
            } else {
                childIds.push(existingChild.recordset[0].id);
                console.log(`📋 Child exists: ${child.name} (ID: ${existingChild.recordset[0].id})`);
            }
        }

        // Create connections between families
        const connections = [
            { parent1_id: userIds[0], parent2_id: userIds[1] }, // Johnson <-> Smith
            { parent1_id: userIds[0], parent2_id: userIds[2] }, // Johnson <-> Williams
        ];

        for (const conn of connections) {
            const existingConn = await pool.request()
                .input('parent1_id', sql.Int, conn.parent1_id)
                .input('parent2_id', sql.Int, conn.parent2_id)
                .query(`
                    SELECT id FROM connections 
                    WHERE (parent1_id = @parent1_id AND parent2_id = @parent2_id)
                    OR (parent1_id = @parent2_id AND parent2_id = @parent1_id)
                `);
            
            if (existingConn.recordset.length === 0) {
                await pool.request()
                    .input('parent1_id', sql.Int, conn.parent1_id)
                    .input('parent2_id', sql.Int, conn.parent2_id)
                    .query(`
                        INSERT INTO connections (parent1_id, parent2_id, status)
                        VALUES (@parent1_id, @parent2_id, 'active')
                    `);
                console.log(`✅ Created connection between parent ${conn.parent1_id} and ${conn.parent2_id}`);
            }
        }

        // Create test activities with different statuses
        const now = new Date();
        const activities = [
            // Emma's activities (userIds[0], childIds[0])
            {
                child_id: childIds[0],
                name: 'Soccer Practice',
                description: 'Weekly soccer training at the community center',
                start_date: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000), // Tomorrow
                start_time: '16:00',
                end_time: '17:30',
                location: 'Community Sports Center',
                cost: 25
            },
            {
                child_id: childIds[0],
                name: 'Art Class',
                description: 'Creative painting and drawing session',
                start_date: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
                start_time: '14:00',
                end_time: '15:30',
                location: 'Art Studio Downtown',
                cost: 35
            },
            {
                child_id: childIds[0],
                name: 'Swimming Lessons',
                description: 'Beginner swimming class',
                start_date: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
                start_time: '10:00',
                end_time: '11:00',
                location: 'Aquatic Center',
                cost: 45
            },
            // Liam's activities (userIds[0], childIds[1])
            {
                child_id: childIds[1],
                name: 'Piano Lessons',
                description: 'Individual piano instruction',
                start_date: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
                start_time: '15:00',
                end_time: '15:45',
                location: 'Music Academy',
                cost: 50
            },
            {
                child_id: childIds[1],
                name: 'Playground Meetup',
                description: 'Casual playdate with neighborhood kids',
                start_date: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000), // 4 days from now
                start_time: '11:00',
                end_time: '13:00',
                location: 'Central Park Playground',
                cost: 0
            },
            // Sophia's activities (userIds[1], childIds[2]) - will be used for invitations
            {
                child_id: childIds[2],
                name: 'Birthday Party',
                description: 'Sophia\'s 9th birthday celebration!',
                start_date: new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000), // 6 days from now
                start_time: '15:00',
                end_time: '18:00',
                location: 'Fun Zone Entertainment',
                cost: 30
            },
            {
                child_id: childIds[2],
                name: 'Dance Class',
                description: 'Hip-hop dance for kids',
                start_date: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000), // Tomorrow
                start_time: '17:00',
                end_time: '18:00',
                location: 'Dance Studio Plus',
                cost: 40
            }
        ];

        const activityIds = [];
        for (const activity of activities) {
            const result = await pool.request()
                .input('child_id', sql.Int, activity.child_id)
                .input('name', sql.NVarChar, activity.name)
                .input('description', sql.NVarChar, activity.description)
                .input('start_date', sql.Date, activity.start_date)
                .input('start_time', sql.Time, activity.start_time)
                .input('end_time', sql.Time, activity.end_time)
                .input('location', sql.NVarChar, activity.location)
                .input('cost', sql.Decimal(10,2), activity.cost)
                .query(`
                    INSERT INTO activities (child_id, name, description, start_date, start_time, end_time, location, cost)
                    VALUES (@child_id, @name, @description, @start_date, @start_time, @end_time, @location, @cost);
                    SELECT SCOPE_IDENTITY() as id;
                `);
            activityIds.push(result.recordset[0].id);
            console.log(`✅ Created activity: ${activity.name}`);
        }

        // Create activity invitations to test different statuses
        const invitations = [
            // Birthday party invitation from Sophia's parent to Emma's parent
            {
                activity_id: activityIds[5], // Birthday Party
                inviter_parent_id: userIds[1], // Sophia's parent
                invited_parent_id: userIds[0], // Emma's parent
                child_id: childIds[0], // Emma
                status: 'pending',
                message: 'Hi! Would Emma like to come to Sophia\'s birthday party? It\'s going to be lots of fun!'
            },
            // Dance class invitation
            {
                activity_id: activityIds[6], // Dance Class
                inviter_parent_id: userIds[1], // Sophia's parent
                invited_parent_id: userIds[0], // Emma's parent
                child_id: childIds[0], // Emma
                status: 'accepted',
                message: 'Emma would love to try the dance class with Sophia!'
            },
            // Soccer practice invitation (declined)
            {
                activity_id: activityIds[0], // Soccer Practice
                inviter_parent_id: userIds[0], // Emma's parent
                invited_parent_id: userIds[2], // Noah's parent
                child_id: childIds[3], // Noah
                status: 'rejected',
                message: 'Thanks for the invite, but Noah has conflicting activities.'
            }
        ];

        for (const invitation of invitations) {
            const existing = await pool.request()
                .input('activity_id', sql.Int, invitation.activity_id)
                .input('invited_parent_id', sql.Int, invitation.invited_parent_id)
                .query('SELECT id FROM activity_invitations WHERE activity_id = @activity_id AND invited_parent_id = @invited_parent_id');
            
            if (existing.recordset.length === 0) {
                await pool.request()
                    .input('activity_id', sql.Int, invitation.activity_id)
                    .input('inviter_parent_id', sql.Int, invitation.inviter_parent_id)
                    .input('invited_parent_id', sql.Int, invitation.invited_parent_id)
                    .input('child_id', sql.Int, invitation.child_id)
                    .input('status', sql.NVarChar, invitation.status)
                    .input('message', sql.NVarChar, invitation.message)
                    .query(`
                        INSERT INTO activity_invitations (activity_id, inviter_parent_id, invited_parent_id, child_id, status, message)
                        VALUES (@activity_id, @inviter_parent_id, @invited_parent_id, @child_id, @status, @message)
                    `);
                console.log(`✅ Created invitation: ${invitation.status} for activity ${invitation.activity_id}`);
            }
        }

        console.log('\n🎉 Test data populated successfully!');
        console.log('\n📋 Test Accounts:');
        console.log('- parent1@test.com / password123');
        console.log('- parent2@test.com / password123');
        console.log('- parent3@test.com / password123');
        console.log('\n🎨 Activity Color Testing:');
        console.log('- Dark Blue: Private activities (Soccer, Art, Swimming, Piano, Playground)');
        console.log('- Light Blue: Accepted activities (Dance Class - shared)');
        console.log('- Green: Pending invitations (Birthday Party)');
        console.log('- Grey: Declined invitations (Soccer for Noah)');

    } catch (error) {
        console.error('❌ Error populating test data:', error);
    } finally {
        await sql.close();
    }
}

populateTestData();