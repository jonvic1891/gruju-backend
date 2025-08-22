const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || 'postgres://u4a6su3t5n0fn6:p5f4a04c5bab918014522e2eeb051dfb5c13f62872bf11e829c1ef3168d21c637@cfcojm7sp9tfip.cluster-czz5s0kz4scl.eu-west-1.rds.amazonaws.com:5432/d9qg97gb6fqhoe';

const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkJon13Requests() {
    const client = await pool.connect();
    
    try {
        // Find jon 13 user
        const jon13 = await client.query("SELECT id, uuid, username FROM users WHERE username = 'jon 13'");
        console.log('👤 Jon 13:', jon13.rows[0]);
        
        if (jon13.rows.length === 0) {
            console.log('❌ Jon 13 not found');
            return;
        }
        
        const jon13Id = jon13.rows[0].id;
        const jon13Uuid = jon13.rows[0].uuid;
        
        // Get connection requests as they would appear to jon 13 (both sent and received)
        console.log('\n📤 Connection requests sent by jon 13:');
        const sentRequests = await client.query(`
            SELECT cr.uuid as request_uuid,
                   cr.child_uuid,
                   cr.target_child_uuid,
                   cr.target_parent_id,
                   c_child.name as child_name,
                   c_target.name as target_child_name,
                   u_target.uuid as target_parent_uuid,
                   u_target.username as target_parent_name,
                   cr.status,
                   cr.created_at
            FROM connection_requests cr
            LEFT JOIN children c_child ON cr.child_uuid = c_child.uuid
            LEFT JOIN children c_target ON cr.target_child_uuid = c_target.uuid
            LEFT JOIN users u_target ON cr.target_parent_id = u_target.id
            WHERE cr.requester_id = $1
            ORDER BY cr.created_at DESC
        `, [jon13Id]);
        
        sentRequests.rows.forEach((req, i) => {
            console.log(`Sent Request ${i + 1}:`);
            console.log(`  request_uuid: ${req.request_uuid}`);
            console.log(`  child_uuid: ${req.child_uuid}`);
            console.log(`  child_name: ${req.child_name}`);
            console.log(`  target_child_uuid: ${req.target_child_uuid}`);
            console.log(`  target_child_name: ${req.target_child_name}`);
            console.log(`  target_parent_uuid: ${req.target_parent_uuid}`);
            console.log(`  target_parent_name: ${req.target_parent_name}`);
            console.log(`  status: ${req.status}`);
        });
        
        // Get connection requests received by jon 13
        console.log('\n📥 Connection requests received by jon 13:');
        const receivedRequests = await client.query(`
            SELECT cr.uuid as request_uuid,
                   cr.child_uuid,
                   cr.target_child_uuid,
                   cr.target_parent_id,
                   c_child.name as child_name,
                   c_target.name as target_child_name,
                   u_requester.uuid as requester_uuid,
                   u_requester.username as requester_name,
                   cr.status,
                   cr.created_at
            FROM connection_requests cr
            LEFT JOIN children c_child ON cr.child_uuid = c_child.uuid
            LEFT JOIN children c_target ON cr.target_child_uuid = c_target.uuid
            LEFT JOIN users u_requester ON cr.requester_id = u_requester.id
            WHERE cr.target_parent_id = $1
            ORDER BY cr.created_at DESC
        `, [jon13Id]);
        
        receivedRequests.rows.forEach((req, i) => {
            console.log(`Received Request ${i + 1}:`);
            console.log(`  request_uuid: ${req.request_uuid}`);
            console.log(`  child_uuid: ${req.child_uuid}`);
            console.log(`  child_name: ${req.child_name}`);
            console.log(`  target_child_uuid: ${req.target_child_uuid}`);
            console.log(`  target_child_name: ${req.target_child_name}`);
            console.log(`  requester_uuid: ${req.requester_uuid}`);
            console.log(`  requester_name: ${req.requester_name}`);
            console.log(`  status: ${req.status}`);
        });
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

checkJon13Requests().catch(console.error);