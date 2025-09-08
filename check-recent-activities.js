const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkRecentActivities() {
    try {
        console.log('🔍 Checking recent activities with website URLs...');
        
        // Get recent activities that have website_url but check if activity_type is missing
        const result = await pool.query(`
            SELECT 
                a.id,
                a.uuid,
                a.name,
                a.website_url,
                a.activity_type,
                a.created_at,
                c.name as child_name,
                p.email
            FROM activities a
            JOIN children c ON a.child_id = c.id
            JOIN parents p ON c.parent_id = p.id
            WHERE a.website_url IS NOT NULL
            AND a.website_url != ''
            AND a.created_at >= NOW() - INTERVAL '24 hours'
            ORDER BY a.created_at DESC
            LIMIT 10
        `);
        
        console.log(`📊 Found ${result.rows.length} recent activities with website URLs:\n`);
        
        result.rows.forEach((activity, index) => {
            console.log(`${index + 1}. "${activity.name}" (${activity.child_name})`);
            console.log(`   🌐 Website: ${activity.website_url}`);
            console.log(`   🎯 Activity Type: ${activity.activity_type || 'NOT SET'}`);
            console.log(`   📧 Parent: ${activity.email}`);
            console.log(`   ⏰ Created: ${new Date(activity.created_at).toLocaleString()}`);
            
            if (!activity.activity_type || activity.activity_type.trim() === '') {
                console.log(`   ❌ PROBLEM: Missing activity_type - club logic won't run!`);
            } else {
                console.log(`   ✅ OK: Has activity_type`);
            }
            console.log('');
        });
        
        // Check if any clubs were created/updated recently
        console.log('🏢 Checking recent club updates...');
        const clubUpdates = await pool.query(`
            SELECT 
                name,
                website_url,
                activity_type,
                usage_count,
                last_used_date,
                updated_at
            FROM clubs 
            WHERE updated_at >= NOW() - INTERVAL '24 hours'
            ORDER BY updated_at DESC
        `);
        
        console.log(`📊 Found ${clubUpdates.rows.length} club updates in last 24 hours:`);
        clubUpdates.rows.forEach((club, index) => {
            console.log(`${index + 1}. ${club.name} (${club.activity_type})`);
            console.log(`   🌐 ${club.website_url}`);
            console.log(`   📈 Usage count: ${club.usage_count}`);
            console.log(`   📅 Last used: ${club.last_used_date}`);
            console.log(`   ⏰ Updated: ${new Date(club.updated_at).toLocaleString()}`);
            console.log('');
        });
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await pool.end();
    }
}

checkRecentActivities();