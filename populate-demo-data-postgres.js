require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

// PostgreSQL Database Configuration
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false } // Always use SSL for Heroku PostgreSQL
});

async function populateDemoData() {
    const client = await pool.connect();
    
    try {
        console.log('🚀 Starting demo data population...');
        
        // Demo families data
        const families = [
            {
                username: 'johnson_family',
                email: 'johnson@example.com',
                phone: '+1555000101',
                family_name: 'Johnson Family',
                children: [
                    { name: 'Emma Johnson', age: 8, grade: '3rd Grade', school: 'Maple Elementary', interests: 'Soccer, Art, Reading' },
                    { name: 'Alex Johnson', age: 10, grade: '5th Grade', school: 'Maple Elementary', interests: 'Basketball, Science, Video Games' }
                ]
            },
            {
                username: 'davis_family',
                email: 'davis@example.com',
                phone: '+1555000102',
                family_name: 'Davis Family',
                children: [
                    { name: 'Jake Davis', age: 9, grade: '4th Grade', school: 'Oak Elementary', interests: 'Baseball, Math, Swimming' }
                ]
            },
            {
                username: 'wong_family',
                email: 'wong@example.com',
                phone: '+1555000103',
                family_name: 'Wong Family',
                children: [
                    { name: 'Mia Wong', age: 7, grade: '2nd Grade', school: 'Pine Elementary', interests: 'Dance, Music, Drawing' },
                    { name: 'Ryan Wong', age: 11, grade: '6th Grade', school: 'Pine Elementary', interests: 'Robotics, Chess, Coding' },
                    { name: 'Zoe Wong', age: 5, grade: 'Kindergarten', school: 'Pine Elementary', interests: 'Painting, Stories, Animals' }
                ]
            },
            {
                username: 'thompson_family',
                email: 'thompson@example.com',
                phone: '+1555000104',
                family_name: 'Thompson Family',
                children: [
                    { name: 'Sophie Thompson', age: 12, grade: '7th Grade', school: 'Cedar Middle School', interests: 'Volleyball, Photography, Writing' },
                    { name: 'Oliver Thompson', age: 6, grade: '1st Grade', school: 'Cedar Elementary', interests: 'Legos, Dinosaurs, Soccer' }
                ]
            },
            {
                username: 'miller_family',
                email: 'joe@example.com',
                phone: '+1555000105',
                family_name: 'Miller Family',
                children: [
                    { name: 'Theodore Miller', age: 13, grade: '8th Grade', school: 'Birch Middle School', interests: 'Guitar, Gaming, Track & Field' }
                ]
            }
        ];

        // Hash password for demo accounts
        const hashedPassword = await bcrypt.hash('demo123', 12);
        
        console.log('👥 Creating demo family accounts...');
        
        const userIds = [];
        
        // Create users
        for (const family of families) {
            const userResult = await client.query(`
                INSERT INTO users (username, email, phone, password_hash, family_name, role)
                VALUES ($1, $2, $3, $4, $5, 'user')
                ON CONFLICT (email) DO UPDATE SET
                    username = EXCLUDED.username,
                    phone = EXCLUDED.phone,
                    family_name = EXCLUDED.family_name
                RETURNING id
            `, [family.username, family.email, family.phone, hashedPassword, family.family_name]);
            
            const userId = userResult.rows[0].id;
            userIds.push(userId);
            
            console.log(`✅ Created/Updated user: ${family.family_name} (ID: ${userId})`);
            
            // Create children for this family
            for (const child of family.children) {
                const childResult = await client.query(`
                    INSERT INTO children (name, parent_id, age, grade, school, interests)
                    VALUES ($1, $2, $3, $4, $5, $6)
                    ON CONFLICT DO NOTHING
                    RETURNING id
                `, [child.name, userId, child.age, child.grade, child.school, child.interests]);
                
                if (childResult.rows.length > 0) {
                    console.log(`  👶 Added child: ${child.name}`);
                }
            }
        }
        
        console.log('🎯 Creating sample activities...');
        
        // Get all children to create activities
        const childrenResult = await client.query(`
            SELECT c.id, c.name, c.parent_id, u.family_name 
            FROM children c 
            JOIN users u ON c.parent_id = u.id
        `);
        
        const sampleActivities = [
            { name: 'Soccer Practice', description: 'Weekly soccer training for kids', days_from_now: 1, duration_days: 90, time: '16:00', location: 'Community Sports Center' },
            { name: 'Art Class', description: 'Creative art lessons for children', days_from_now: 3, duration_days: 60, time: '14:00', location: 'Local Art Studio' },
            { name: 'Swimming Lessons', description: 'Learn to swim with certified instructors', days_from_now: 5, duration_days: 45, time: '10:00', location: 'Aquatic Center' },
            { name: 'Music Lessons', description: 'Piano and guitar lessons for beginners', days_from_now: 7, duration_days: 120, time: '15:30', location: 'Music Academy' },
            { name: 'Basketball Camp', description: 'Summer basketball skills camp', days_from_now: 2, duration_days: 30, time: '09:00', location: 'School Gymnasium' },
            { name: 'Dance Classes', description: 'Ballet and modern dance for kids', days_from_now: 4, duration_days: 75, time: '17:00', location: 'Dance Studio Downtown' },
            { name: 'Science Club', description: 'Fun experiments and STEM activities', days_from_now: 6, duration_days: 90, time: '15:00', location: 'Science Museum' },
            { name: 'Chess Tournament', description: 'Youth chess competition', days_from_now: 14, duration_days: 1, time: '13:00', location: 'Community Center' }
        ];
        
        // Add activities for each child
        for (const child of childrenResult.rows) {
            // Add 2-3 random activities per child
            const numActivities = Math.floor(Math.random() * 2) + 2; // 2-3 activities
            const shuffledActivities = [...sampleActivities].sort(() => 0.5 - Math.random());
            
            for (let i = 0; i < numActivities; i++) {
                const activity = shuffledActivities[i];
                const startDate = new Date();
                startDate.setDate(startDate.getDate() + activity.days_from_now);
                
                const endDate = new Date(startDate);
                endDate.setDate(endDate.getDate() + activity.duration_days);
                
                await client.query(`
                    INSERT INTO activities (child_id, name, description, start_date, end_date, start_time, location, cost)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    ON CONFLICT DO NOTHING
                `, [
                    child.id,
                    activity.name,
                    activity.description,
                    startDate.toISOString().split('T')[0],
                    endDate.toISOString().split('T')[0],
                    activity.time,
                    activity.location,
                    Math.floor(Math.random() * 100) + 20 // Random cost between $20-$120
                ]);
            }
            
            console.log(`  🎪 Added activities for ${child.name}`);
        }
        
        console.log('🤝 Creating sample connections...');
        
        // Create some sample connections between families
        const connections = [
            [userIds[0], userIds[1]], // Johnson <-> Davis
            [userIds[1], userIds[2]], // Davis <-> Wong
            [userIds[2], userIds[3]], // Wong <-> Thompson
            [userIds[0], userIds[4]], // Johnson <-> Miller
        ];
        
        for (const [parent1, parent2] of connections) {
            if (parent1 && parent2) {
                await client.query(`
                    INSERT INTO connections (parent1_id, parent2_id, status)
                    VALUES ($1, $2, 'active')
                    ON CONFLICT (parent1_id, parent2_id) DO NOTHING
                `, [parent1, parent2]);
                
                console.log(`  🔗 Connected families (${parent1} <-> ${parent2})`);
            }
        }
        
        // Get final counts
        const counts = await client.query(`
            SELECT 
                (SELECT COUNT(*) FROM users) as users,
                (SELECT COUNT(*) FROM children) as children,
                (SELECT COUNT(*) FROM activities) as activities,
                (SELECT COUNT(*) FROM connections) as connections
        `);
        
        console.log('\n🎉 Demo data population completed!');
        console.log('📊 Final counts:');
        console.log(`   👥 Users: ${counts.rows[0].users}`);
        console.log(`   👶 Children: ${counts.rows[0].children}`);
        console.log(`   🎪 Activities: ${counts.rows[0].activities}`);
        console.log(`   🤝 Connections: ${counts.rows[0].connections}`);
        
        console.log('\n🔑 Demo Login Accounts:');
        console.log('   johnson@example.com - password: demo123');
        console.log('   davis@example.com - password: demo123');
        console.log('   wong@example.com - password: demo123');
        console.log('   thompson@example.com - password: demo123');
        console.log('   joe@example.com - password: demo123');
        
    } catch (error) {
        console.error('❌ Error populating demo data:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

// Run the population script
populateDemoData()
    .then(() => {
        console.log('✅ Demo data population completed successfully!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Demo data population failed:', error);
        process.exit(1);
    });