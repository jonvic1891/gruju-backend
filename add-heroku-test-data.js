const { Pool } = require('pg');

// Use Heroku PostgreSQL connection string
const DATABASE_URL = process.env.DATABASE_URL || 'postgres://u4a6su3t5n0fn6:p5f4a04c5bab918014522e2eeb051dfb5c13f62872bf11e829c1ef3168d21c637@cfcojm7sp9tfip.cluster-czz5s0kz4scl.eu-west-1.rds.amazonaws.com:5432/d9qg97gb6fqhoe';

const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function addTestDataToHeroku() {
    const client = await pool.connect();
    try {
        console.log('🔄 Connecting to Heroku PostgreSQL Database...');
        console.log('✅ Connected to Heroku PostgreSQL Database!');

        // First, let's check if we have any existing users
        const existingUsers = await client.query('SELECT id, username, email FROM users LIMIT 5');
        console.log('📋 Existing users:', existingUsers.rows);

        if (existingUsers.rows.length === 0) {
            console.log('❌ No users found. Please register a user first through the app.');
            return;
        }

        // Use the first existing user
        const testUser = existingUsers.rows[0];
        console.log(`👤 Using test user: ${testUser.username} (${testUser.email})`);

        // Check for existing children
        const existingChildren = await client.query('SELECT id, name FROM children WHERE parent_id = $1', [testUser.id]);
        console.log('👶 Existing children:', existingChildren.rows);

        let childId;
        if (existingChildren.rows.length === 0) {
            // Create a test child
            const result = await client.query(`
                INSERT INTO children (name, parent_id)
                VALUES ($1, $2)
                RETURNING id
            `, ['Emma Johnson', testUser.id]);
            childId = result.rows[0].id;
            console.log(`✅ Created test child: Emma Johnson (ID: ${childId})`);
        } else {
            childId = existingChildren.rows[0].id;
            console.log(`📋 Using existing child: ${existingChildren.rows[0].name} (ID: ${childId})`);
        }

        // Create test activities for this week with different statuses
        console.log('\n🎯 Creating test activities with color coding...');
        const now = new Date();
        const activities = [
            // Monday - Private activity (Dark Blue)
            {
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
                name: 'Piano Lessons',
                description: 'Individual piano instruction',
                start_date: getDateForWeekday(now, 2),
                start_time: '15:00',
                end_time: '15:45',
                location: 'Music Academy',
                cost: 50
            },
            // Wednesday - Will become shared activity (Light Blue)
            {
                name: 'Art Class',
                description: 'Creative painting and drawing session',
                start_date: getDateForWeekday(now, 3),
                start_time: '14:00',
                end_time: '15:30',
                location: 'Art Studio Downtown',
                cost: 35
            },
            // Thursday - Will have pending invitation (Green)
            {
                name: 'Birthday Party',
                description: 'Sophia\'s 9th birthday celebration!',
                start_date: getDateForWeekday(now, 4),
                start_time: '15:00',
                end_time: '18:00',
                location: 'Fun Zone Entertainment',
                cost: 30
            },
            // Friday - Will be declined (Grey)
            {
                name: 'Baseball Game',
                description: 'Youth league baseball match',
                start_date: getDateForWeekday(now, 5),
                start_time: '09:00',
                end_time: '12:00',
                location: 'Sports Complex',
                cost: 0
            },
            // Saturday - Private activity (Dark Blue)
            {
                name: 'Swimming Lessons',
                description: 'Beginner swimming class',
                start_date: getDateForWeekday(now, 6),
                start_time: '10:00',
                end_time: '11:00',
                location: 'Aquatic Center',
                cost: 45
            },
            // Sunday - Will become shared (Light Blue)
            {
                name: 'Dance Class',
                description: 'Hip-hop dance for kids',
                start_date: getDateForWeekday(now, 0),
                start_time: '17:00',
                end_time: '18:00',
                location: 'Dance Studio Plus',
                cost: 40
            }
        ];

        const activityIds = [];
        for (const activity of activities) {
            // Check if activity already exists
            const existing = await client.query(`
                SELECT id FROM activities 
                WHERE child_id = $1 AND name = $2 AND start_date = $3
            `, [childId, activity.name, activity.start_date]);
            
            if (existing.rows.length === 0) {
                const result = await client.query(`
                    INSERT INTO activities (child_id, name, description, start_date, start_time, end_time, location, cost)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    RETURNING id
                `, [
                    childId, activity.name, activity.description, 
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

        // Create a second test user for invitations
        let inviterUserId;
        const inviterUser = await client.query('SELECT id FROM users WHERE email = $1', ['testparent@example.com']);
        if (inviterUser.rows.length === 0) {
            const result = await client.query(`
                INSERT INTO users (username, email, phone, password_hash, role)
                VALUES ($1, $2, $3, $4, 'user')
                RETURNING id
            `, ['testparent', 'testparent@example.com', '+1234567899', 'hashedpassword']);
            inviterUserId = result.rows[0].id;
            console.log('✅ Created second test user for invitations');
        } else {
            inviterUserId = inviterUser.rows[0].id;
            console.log('📋 Using existing second user for invitations');
        }

        // Create activity invitations for color testing
        console.log('\n📧 Creating activity invitations for color testing...');
        const invitations = [
            // Art Class - accepted (Light Blue)
            {
                activity_id: activityIds[2],
                inviter_parent_id: inviterUserId,
                invited_parent_id: testUser.id,
                child_id: childId,
                status: 'accepted',
                message: 'Would love to join the art class!'
            },
            // Birthday Party - pending (Green)
            {
                activity_id: activityIds[3],
                inviter_parent_id: inviterUserId,
                invited_parent_id: testUser.id,
                child_id: childId,
                status: 'pending',
                message: 'Hi! Would Emma like to come to the birthday party?'
            },
            // Baseball Game - rejected (Grey)
            {
                activity_id: activityIds[4],
                inviter_parent_id: inviterUserId,
                invited_parent_id: testUser.id,
                child_id: childId,
                status: 'rejected',
                message: 'Thanks but we have a conflict that day.'
            },
            // Dance Class - accepted (Light Blue)
            {
                activity_id: activityIds[6],
                inviter_parent_id: inviterUserId,
                invited_parent_id: testUser.id,
                child_id: childId,
                status: 'accepted',
                message: 'Emma would love to dance!'
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

        console.log('\n🎉 Test data added to Heroku PostgreSQL successfully!');
        console.log('\n📋 Login with this account to see colored activities:');
        console.log(`- Email: ${testUser.email}`);
        console.log('- Use any password (backend accepts any password for demo)');
        
        console.log('\n🎨 Activity Colors You Should See:');
        console.log('- 🔵 Dark Blue: Soccer Practice, Piano Lessons, Swimming Lessons (private)');
        console.log('- 🔷 Light Blue: Art Class, Dance Class (accepted invitations)');
        console.log('- 🟢 Green: Birthday Party (pending invitation)');
        console.log('- ⚫ Grey: Baseball Game (rejected invitation)');

    } catch (error) {
        console.error('❌ Error adding test data to Heroku:', error);
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

addTestDataToHeroku();