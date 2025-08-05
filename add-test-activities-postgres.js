require('dotenv').config();
const { Pool } = require('pg');

// PostgreSQL connection using the same config as the backend
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/parent_activity_app',
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function addTestData() {
    const client = await pool.connect();
    try {
        console.log('🔄 Connecting to PostgreSQL Database...');
        console.log('✅ Connected to PostgreSQL Database!');

        // Create test users if they don't exist
        console.log('\n👥 Creating test users...');
        const testUsers = [
            { username: 'parent1', email: 'parent1@test.com', phone: '+1234567890', password: 'password123' },
            { username: 'parent2', email: 'parent2@test.com', phone: '+1234567891', password: 'password123' },
            { username: 'parent3', email: 'parent3@test.com', phone: '+1234567892', password: 'password123' }
        ];

        const userIds = [];
        for (const user of testUsers) {
            const existingUser = await client.query('SELECT id FROM users WHERE email = $1', [user.email]);
            
            if (existingUser.rows.length === 0) {
                const result = await client.query(`
                    INSERT INTO users (username, email, phone, password_hash, role)
                    VALUES ($1, $2, $3, $4, 'user')
                    RETURNING id
                `, [user.username, user.email, user.phone, user.password]); // In real app, password would be hashed
                userIds.push(result.rows[0].id);
                console.log(`✅ Created user: ${user.username} (${user.email})`);
            } else {
                userIds.push(existingUser.rows[0].id);
                console.log(`📋 User exists: ${user.username} (ID: ${existingUser.rows[0].id})`);
            }
        }

        // Create test children
        console.log('\n👶 Creating test children...');
        const testChildren = [
            { name: 'Emma Johnson', parent_id: userIds[0] },
            { name: 'Liam Johnson', parent_id: userIds[0] },
            { name: 'Sophia Smith', parent_id: userIds[1] },
            { name: 'Noah Williams', parent_id: userIds[2] }
        ];

        const childIds = [];
        for (const child of testChildren) {
            const existingChild = await client.query(
                'SELECT id FROM children WHERE name = $1 AND parent_id = $2', 
                [child.name, child.parent_id]
            );
            
            if (existingChild.rows.length === 0) {
                const result = await client.query(`
                    INSERT INTO children (name, parent_id)
                    VALUES ($1, $2)
                    RETURNING id
                `, [child.name, child.parent_id]);
                childIds.push(result.rows[0].id);
                console.log(`✅ Created child: ${child.name}`);
            } else {
                childIds.push(existingChild.rows[0].id);
                console.log(`📋 Child exists: ${child.name} (ID: ${existingChild.rows[0].id})`);
            }
        }

        // Create connections between families
        console.log('\n🔗 Creating family connections...');
        const connections = [
            { parent1_id: userIds[0], parent2_id: userIds[1] }, // Johnson <-> Smith
            { parent1_id: userIds[0], parent2_id: userIds[2] }, // Johnson <-> Williams
        ];

        for (const conn of connections) {
            const existingConn = await client.query(`
                SELECT id FROM connections 
                WHERE (parent1_id = $1 AND parent2_id = $2)
                OR (parent1_id = $2 AND parent2_id = $1)
            `, [conn.parent1_id, conn.parent2_id]);
            
            if (existingConn.rows.length === 0) {
                await client.query(`
                    INSERT INTO connections (parent1_id, parent2_id, status)
                    VALUES ($1, $2, 'active')
                `, [conn.parent1_id, conn.parent2_id]);
                console.log(`✅ Created connection between parent ${conn.parent1_id} and ${conn.parent2_id}`);
            } else {
                console.log(`📋 Connection exists between parent ${conn.parent1_id} and ${conn.parent2_id}`);
            }
        }

        // Create activities for this week with different colors
        console.log('\n🎯 Creating weekly activities...');
        const now = new Date();
        const activities = [
            // Monday - Private activity (Dark Blue)
            {
                child_id: childIds[0],
                name: 'Soccer Practice',
                description: 'Weekly soccer training session',
                start_date: getDateForWeekday(now, 1),
                start_time: '16:00',
                end_time: '17:30',
                location: 'Community Sports Center',
                cost: 25
            },
            // Tuesday - Private activity (Dark Blue)
            {
                child_id: childIds[1] || childIds[0],
                name: 'Piano Lessons',
                description: 'Individual piano instruction',
                start_date: getDateForWeekday(now, 2),
                start_time: '15:00',
                end_time: '15:45',
                location: 'Music Academy',
                cost: 50
            },
            // Wednesday - Private activity (Dark Blue)
            {
                child_id: childIds[0],
                name: 'Art Class',
                description: 'Creative painting and drawing session',
                start_date: getDateForWeekday(now, 3),
                start_time: '14:00',
                end_time: '15:30',
                location: 'Art Studio Downtown',
                cost: 35
            },
            // Thursday - Private activity (Dark Blue)
            {
                child_id: childIds[2] || childIds[0],
                name: 'Swimming Lessons',
                description: 'Beginner swimming class',
                start_date: getDateForWeekday(now, 4),
                start_time: '10:00',
                end_time: '11:00',
                location: 'Aquatic Center',
                cost: 45
            },
            // Friday - Will become shared (Light Blue)
            {
                child_id: childIds[1] || childIds[0],
                name: 'Dance Class',
                description: 'Hip-hop dance for kids',
                start_date: getDateForWeekday(now, 5),
                start_time: '17:00',
                end_time: '18:00',
                location: 'Dance Studio Plus',
                cost: 40
            },
            // Saturday - Will have pending invitation (Green for invitee)
            {
                child_id: childIds[2] || childIds[0],
                name: 'Birthday Party',
                description: 'Sophia\'s 9th birthday celebration!',
                start_date: getDateForWeekday(now, 6),
                start_time: '15:00',
                end_time: '18:00',
                location: 'Fun Zone Entertainment',
                cost: 30
            },
            // Sunday - Will be declined (Grey)
            {
                child_id: childIds[0],
                name: 'Baseball Game',
                description: 'Youth league baseball match',
                start_date: getDateForWeekday(now, 0),
                start_time: '09:00',
                end_time: '12:00',
                location: 'Sports Complex',
                cost: 0
            }
        ];

        const activityIds = [];
        for (const activity of activities) {
            if (!activity.child_id) continue;
            
            const existing = await client.query(`
                SELECT id FROM activities 
                WHERE child_id = $1 AND name = $2 AND start_date = $3
            `, [activity.child_id, activity.name, activity.start_date]);
            
            if (existing.rows.length === 0) {
                const result = await client.query(`
                    INSERT INTO activities (child_id, name, description, start_date, start_time, end_time, location, cost)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    RETURNING id
                `, [
                    activity.child_id, activity.name, activity.description, 
                    activity.start_date, activity.start_time, activity.end_time, 
                    activity.location, activity.cost
                ]);
                activityIds.push(result.rows[0].id);
                console.log(`✅ Created activity: ${activity.name} on ${activity.start_date.toDateString()}`);
            } else {
                activityIds.push(existing.rows[0].id);
                console.log(`📋 Activity exists: ${activity.name}`);
            }
        }

        // Create activity invitations to demonstrate different colors
        console.log('\n📧 Creating activity invitations...');
        const invitations = [
            // Accepted invitation (Light Blue) - Dance Class
            {
                activity_id: activityIds[4], // Dance Class
                inviter_parent_id: userIds[0], // Emma's parent invites
                invited_parent_id: userIds[1], // Sophia's parent
                child_id: childIds[2], // Sophia
                status: 'accepted',
                message: 'Sophia would love to join Emma for dance class!'
            },
            // Pending invitation (Green) - Birthday Party
            {
                activity_id: activityIds[5], // Birthday Party
                inviter_parent_id: userIds[2], // Noah's parent invites
                invited_parent_id: userIds[0], // Emma's parent
                child_id: childIds[0], // Emma
                status: 'pending',
                message: 'Hi! Would Emma like to come to the birthday party? It\'s going to be lots of fun!'
            },
            // Rejected invitation (Grey) - Baseball Game
            {
                activity_id: activityIds[6], // Baseball Game
                inviter_parent_id: userIds[0], // Emma's parent invites
                invited_parent_id: userIds[1], // Sophia's parent
                child_id: childIds[2], // Sophia
                status: 'rejected',
                message: 'Thanks for the invite, but Sophia has a conflict that day.'
            }
        ];

        for (const invitation of invitations) {
            if (!invitation.activity_id) continue;
            
            const existing = await client.query(`
                SELECT id FROM activity_invitations 
                WHERE activity_id = $1 AND invited_parent_id = $2
            `, [invitation.activity_id, invitation.invited_parent_id]);
            
            if (existing.rows.length === 0) {
                await client.query(`
                    INSERT INTO activity_invitations (activity_id, inviter_parent_id, invited_parent_id, child_id, status, message)
                    VALUES ($1, $2, $3, $4, $5, $6)
                `, [
                    invitation.activity_id, invitation.inviter_parent_id, 
                    invitation.invited_parent_id, invitation.child_id, 
                    invitation.status, invitation.message
                ]);
                console.log(`✅ Created ${invitation.status} invitation for activity ${invitation.activity_id}`);
            } else {
                console.log(`📋 Invitation exists for activity ${invitation.activity_id}`);
            }
        }

        console.log('\n🎉 Test data created successfully!');
        console.log('\n📋 Test Accounts (password: password123):');
        testUsers.forEach(user => {
            console.log(`- ${user.email}`);
        });
        
        console.log('\n🎨 Activity Color Guide:');
        console.log('- 🔵 Dark Blue: Private activities (Soccer, Piano, Art, Swimming)');
        console.log('- 🔷 Light Blue: Shared/Accepted activities (Dance Class - accepted invitation)');
        console.log('- 🟢 Green: New invitations (Birthday Party - pending invitation)');
        console.log('- ⚫ Grey: Declined activities (Baseball Game - rejected invitation)');
        
        console.log('\n💡 Login as different parents to see different colored activities!');

    } catch (error) {
        console.error('❌ Error creating test data:', error);
    } finally {
        client.release();
        await pool.end();
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

addTestData();