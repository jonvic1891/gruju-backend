const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || 'postgres://u4a6su3t5n0fn6:p5f4a04c5bab918014522e2eeb051dfb5c13f62872bf11e829c1ef3168d21c637@cfcojm7sp9tfip.cluster-czz5s0kz4scl.eu-west-1.rds.amazonaws.com:5432/d9qg97gb6fqhoe';

const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function createJon13AutoNotifyActivity() {
    const client = await pool.connect();
    
    try {
        console.log('🔍 Creating auto-notify activity for jon 13...');
        
        // Get jon 13 and their child
        const jon13Result = await client.query("SELECT id, uuid, username FROM users WHERE username = 'jon 13'");
        if (jon13Result.rows.length === 0) {
            console.log('❌ Jon 13 not found');
            return;
        }
        
        const jon13 = jon13Result.rows[0];
        const childResult = await client.query('SELECT id, uuid, name FROM children WHERE parent_id = $1 LIMIT 1', [jon13.id]);
        if (childResult.rows.length === 0) {
            console.log('❌ No children found for jon 13');
            return;
        }
        
        const child = childResult.rows[0];
        console.log(`👤 Jon 13 (${jon13.uuid})`);
        console.log(`👶 Child: ${child.name} (${child.uuid})`);
        
        // Insert activity directly into database with auto_notify_new_connections: true
        const activityName = `Jon13 Auto Notify ${Date.now()}`;
        const insertResult = await client.query(`
            INSERT INTO activities (
                uuid, child_id, name, description, start_date, end_date, 
                start_time, end_time, location, auto_notify_new_connections, 
                is_shared, created_at, updated_at
            ) VALUES (
                gen_random_uuid(), $1, $2, $3, $4, $5, 
                $6, $7, $8, $9, 
                $10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
            ) RETURNING uuid, name, auto_notify_new_connections
        `, [
            child.id,
            activityName,
            'Testing auto notifications for new connections',
            '2025-08-27', // Tomorrow
            '2025-08-27',
            '15:00',
            '17:00', 
            'Jon13 Test Location',
            true, // auto_notify_new_connections
            true   // is_shared
        ]);
        
        const newActivity = insertResult.rows[0];
        console.log('✅ Created activity for jon 13:');
        console.log(`   Name: ${newActivity.name}`);
        console.log(`   UUID: ${newActivity.uuid}`);
        console.log(`   Auto-notify: ${newActivity.auto_notify_new_connections}`);
        console.log(`   Host: ${jon13.username} - ${child.name}`);
        
        console.log('\n🎯 Now when jon 14 accepts jon 13\'s connection request, they should receive:');
        console.log(`   "jon 13 invited you to "${newActivity.name}" on 27/08/2025 at 15:00:00-17:00:00"`);
        console.log('   Instead of old activities like "pend40"');
        
        return newActivity;
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

createJon13AutoNotifyActivity().catch(console.error);