const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || 'postgres://u4a6su3t5n0fn6:p5f4a04c5bab918014522e2eeb051dfb5c13f62872bf11e829c1ef3168d21c637@cfcojm7sp9tfip.cluster-czz5s0kz4scl.eu-west-1.rds.amazonaws.com:5432/d9qg97gb6fqhoe';

const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkAllAutoNotifyActivities() {
    const client = await pool.connect();
    
    try {
        console.log('🔍 Checking ALL activities with auto_notify_new_connections enabled...');
        
        // Get ALL activities with auto_notify enabled (including past ones)
        const allAutoNotifyResult = await client.query(`
            SELECT a.uuid, a.name, a.start_date, a.auto_notify_new_connections, a.created_at,
                   c.name as child_name, u.username as parent_name
            FROM activities a
            LEFT JOIN children c ON a.child_id = c.id
            LEFT JOIN users u ON c.parent_id = u.id
            WHERE a.auto_notify_new_connections = true
            ORDER BY a.created_at DESC
        `);
        
        console.log(`📋 Found ${allAutoNotifyResult.rows.length} total activities with auto-notify enabled:`);
        allAutoNotifyResult.rows.forEach((activity, i) => {
            const isFuture = new Date(activity.start_date) >= new Date();
            console.log(`${i + 1}. "${activity.name}" (${activity.uuid}) ${isFuture ? '🟢 FUTURE' : '🔴 PAST'}`);
            console.log(`   Host: ${activity.parent_name} - ${activity.child_name}`);
            console.log(`   Date: ${activity.start_date}`);
            console.log(`   Created: ${activity.created_at}`);
        });
        
        // Check specifically for "pend40" 
        console.log('\n🔍 Checking "pend40" activity specifically...');
        const pend40Result = await client.query(`
            SELECT a.uuid, a.name, a.start_date, a.auto_notify_new_connections, a.created_at,
                   c.name as child_name, u.username as parent_name
            FROM activities a
            LEFT JOIN children c ON a.child_id = c.id
            LEFT JOIN users u ON c.parent_id = u.id
            WHERE a.name = 'pend40'
        `);
        
        if (pend40Result.rows.length > 0) {
            const pend40 = pend40Result.rows[0];
            console.log('📋 pend40 activity details:');
            console.log(`   UUID: ${pend40.uuid}`);
            console.log(`   Auto-notify: ${pend40.auto_notify_new_connections}`);
            console.log(`   Host: ${pend40.parent_name} - ${pend40.child_name}`);
            console.log(`   Date: ${pend40.start_date}`);
            console.log(`   Created: ${pend40.created_at}`);
            
            if (pend40.auto_notify_new_connections) {
                console.log('🎯 pend40 has auto-notify enabled - this explains the notification!');
            } else {
                console.log('❓ pend40 has auto-notify disabled - something else is going on');
            }
        } else {
            console.log('❌ pend40 activity not found');
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

checkAllAutoNotifyActivities().catch(console.error);