const sql = require('mssql');

// Database configuration
const config = {
    server: 'gruju.database.windows.net',
    database: 'gruju_test',
    user: 'jonathan.roberts',
    password: 'Gruju1891',
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

async function addTestActivities() {
    try {
        console.log('🔄 Connecting to Azure SQL Database...');
        const pool = await sql.connect(config);
        console.log('✅ Connected to database');

        // Get existing user and child data
        const usersResult = await pool.request().query(`
            SELECT TOP 3 id, username, email FROM users ORDER BY id DESC
        `);
        
        if (usersResult.recordset.length === 0) {
            console.log('❌ No users found. Please run the main populate script first.');
            return;
        }

        const users = usersResult.recordset;
        console.log(`📋 Found ${users.length} users`);

        // Get children for these users
        const childrenResult = await pool.request().query(`
            SELECT id, name, parent_id FROM children WHERE parent_id IN (${users.map(u => u.id).join(',')})
        `);
        
        const children = childrenResult.recordset;
        console.log(`📋 Found ${children.length} children`);

        if (children.length === 0) {
            console.log('❌ No children found. Cannot create activities.');
            return;
        }

        // Create activities for this week
        const now = new Date();
        const activities = [
            // Monday
            {
                child_id: children[0]?.id,
                name: 'Soccer Practice',
                description: 'Weekly soccer training session',
                start_date: getDateForWeekday(now, 1), // Monday
                start_time: '16:00',
                end_time: '17:30',
                location: 'Community Sports Center',
                cost: 25
            },
            // Tuesday
            {
                child_id: children[1]?.id || children[0]?.id,
                name: 'Piano Lessons',
                description: 'Individual piano instruction',
                start_date: getDateForWeekday(now, 2), // Tuesday
                start_time: '15:00',
                end_time: '15:45',
                location: 'Music Academy',
                cost: 50
            },
            // Wednesday
            {
                child_id: children[0]?.id,
                name: 'Art Class',
                description: 'Creative painting and drawing session',
                start_date: getDateForWeekday(now, 3), // Wednesday
                start_time: '14:00',
                end_time: '15:30',
                location: 'Art Studio Downtown',
                cost: 35
            },
            // Thursday
            {
                child_id: children[2]?.id || children[0]?.id,
                name: 'Swimming Lessons',
                description: 'Beginner swimming class',
                start_date: getDateForWeekday(now, 4), // Thursday
                start_time: '10:00',
                end_time: '11:00',
                location: 'Aquatic Center',
                cost: 45
            },
            // Friday
            {
                child_id: children[1]?.id || children[0]?.id,
                name: 'Dance Class',
                description: 'Hip-hop dance for kids',
                start_date: getDateForWeekday(now, 5), // Friday
                start_time: '17:00',
                end_time: '18:00',
                location: 'Dance Studio Plus',
                cost: 40
            },
            // Saturday
            {
                child_id: children[0]?.id,
                name: 'Basketball Game',
                description: 'Youth league basketball match',
                start_date: getDateForWeekday(now, 6), // Saturday
                start_time: '09:00',
                end_time: '11:00',
                location: 'Recreation Center',
                cost: 0
            },
            // Sunday
            {
                child_id: children[2]?.id || children[0]?.id,
                name: 'Family Picnic',
                description: 'Community family gathering at the park',
                start_date: getDateForWeekday(now, 0), // Sunday
                start_time: '12:00',
                end_time: '16:00',
                location: 'Central Park',
                cost: 15
            }
        ];

        const activityIds = [];
        for (const activity of activities) {
            if (!activity.child_id) continue; // Skip if no child available
            
            // Check if activity already exists
            const existing = await pool.request()
                .input('child_id', sql.Int, activity.child_id)
                .input('name', sql.NVarChar, activity.name)
                .input('start_date', sql.Date, activity.start_date)
                .query('SELECT id FROM activities WHERE child_id = @child_id AND name = @name AND start_date = @start_date');
            
            if (existing.recordset.length === 0) {
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
                console.log(`✅ Created activity: ${activity.name} on ${activity.start_date.toDateString()}`);
            } else {
                console.log(`📋 Activity exists: ${activity.name}`);
            }
        }

        console.log('\n🎉 Activities created successfully!');
        console.log('\n📋 Login with one of these test accounts to see the activities:');
        users.forEach(user => {
            console.log(`- ${user.email} / password123`);
        });
        
        console.log('\n🎨 The activities will show as:');
        console.log('- 🔵 Dark Blue: Private activities (your own activities)');
        console.log('- 🔷 Light Blue: Shared activities (when invitations are added)');
        console.log('- 🟢 Green: New invitations (when someone invites you)');
        console.log('- ⚫ Grey: Declined/cancelled activities');

    } catch (error) {
        console.error('❌ Error adding activities:', error);
    } finally {
        await sql.close();
    }
}

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

addTestActivities();