const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || 'postgres://u4a6su3t5n0fn6:p5f4a04c5bab918014522e2eeb051dfb5c13f62872bf11e829c1ef3168d21c637@cfcojm7sp9tfip.cluster-czz5s0kz4scl.eu-west-1.rds.amazonaws.com:5432/d9qg97gb6fqhoe';

const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkAutoNotifyActivities() {
    const client = await pool.connect();
    
    try {
        console.log('🔍 Checking activities with auto_notify_new_connections enabled...');
        
        // Get all activities with auto_notify enabled
        const activitiesResult = await client.query(`
            SELECT a.uuid, a.name, a.start_date, a.auto_notify_new_connections,
                   c.name as child_name, u.username as parent_name
            FROM activities a
            LEFT JOIN children c ON a.child_id = c.id
            LEFT JOIN users u ON c.parent_id = u.id
            WHERE a.auto_notify_new_connections = true
            AND a.start_date >= CURRENT_DATE
            ORDER BY a.start_date ASC, a.created_at DESC
        `);
        
        console.log(`📋 Found ${activitiesResult.rows.length} future activities with auto-notify enabled:`);
        activitiesResult.rows.forEach((activity, i) => {
            console.log(`${i + 1}. "${activity.name}" (${activity.uuid})`);
            console.log(`   Host: ${activity.parent_name} - ${activity.child_name}`);
            console.log(`   Date: ${activity.start_date}`);
            console.log(`   Auto-notify: ${activity.auto_notify_new_connections}`);
        });
        
        if (activitiesResult.rows.length === 0) {
            console.log('\n❌ No future activities have auto_notify_new_connections enabled');
            console.log('💡 This explains why only old activities are being sent in notifications');
        }
        
        // Also check recent activities created by davis or jon 13/14
        console.log('\n🔍 Checking recent activities from davis, jon 13, and jon 14...');
        const recentActivities = await client.query(`
            SELECT a.uuid, a.name, a.start_date, a.auto_notify_new_connections, a.created_at,
                   c.name as child_name, u.username as parent_name
            FROM activities a
            LEFT JOIN children c ON a.child_id = c.id
            LEFT JOIN users u ON c.parent_id = u.id
            WHERE u.username IN ('davis', 'jon 13', 'jon 14')
            AND a.created_at >= CURRENT_DATE - INTERVAL '1 day'
            ORDER BY a.created_at DESC
        `);
        
        console.log(`📋 Found ${recentActivities.rows.length} recent activities:`);
        recentActivities.rows.forEach((activity, i) => {
            console.log(`${i + 1}. "${activity.name}" (${activity.uuid})`);
            console.log(`   Host: ${activity.parent_name} - ${activity.child_name}`);
            console.log(`   Date: ${activity.start_date}`);
            console.log(`   Auto-notify: ${activity.auto_notify_new_connections}`);
            console.log(`   Created: ${activity.created_at}`);
        });
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

checkAutoNotifyActivities().catch(console.error);