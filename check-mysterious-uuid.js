const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || 'postgres://u4a6su3t5n0fn6:p5f4a04c5bab918014522e2eeb051dfb5c13f62872bf11e829c1ef3168d21c637@cfcojm7sp9tfip.cluster-czz5s0kz4scl.eu-west-1.rds.amazonaws.com:5432/d9qg97gb6fqhoe';

const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkUuid() {
    const client = await pool.connect();
    
    try {
        const mysteriousUuid = '26ead642-0c1e-47e5-8d1f-0ad7dbf3c3b7';
        console.log('🔍 Checking where UUID exists:', mysteriousUuid);
        
        // Check in children table
        const childResult = await client.query('SELECT uuid, name, parent_id FROM children WHERE uuid = $1', [mysteriousUuid]);
        console.log('👶 Children table:', childResult.rows);
        
        // Check in users table
        const userResult = await client.query('SELECT uuid, username, email FROM users WHERE uuid = $1', [mysteriousUuid]);
        console.log('👤 Users table:', userResult.rows);
        
        // Check in connection_requests table
        const connReqResult = await client.query(`
            SELECT uuid, child_uuid, target_child_uuid, target_parent_id, status 
            FROM connection_requests 
            WHERE child_uuid = $1 OR target_child_uuid = $1
        `, [mysteriousUuid]);
        console.log('🔗 Connection requests table:', connReqResult.rows);
        
        // Check all connection requests that might be relevant
        const allConnReqs = await client.query(`
            SELECT cr.uuid, cr.child_uuid, cr.target_child_uuid, cr.status,
                   c1.name as child_name, c2.name as target_child_name,
                   u_requester.username as requester_name,
                   u_target.username as target_parent_name
            FROM connection_requests cr
            LEFT JOIN children c1 ON cr.child_uuid = c1.uuid
            LEFT JOIN children c2 ON cr.target_child_uuid = c2.uuid
            LEFT JOIN users u_requester ON cr.requester_id = u_requester.id
            LEFT JOIN users u_target ON cr.target_parent_id = u_target.id
            WHERE cr.status = 'pending'
            ORDER BY cr.created_at DESC
            LIMIT 5
        `);
        
        console.log('\n📋 Recent pending connection requests:');
        allConnReqs.rows.forEach((req, i) => {
            console.log(`Request ${i + 1}:`);
            console.log(`  requester: ${req.requester_name}`);
            console.log(`  child: ${req.child_name} (${req.child_uuid})`);
            console.log(`  target parent: ${req.target_parent_name}`);
            console.log(`  target child: ${req.target_child_name} (${req.target_child_uuid})`);
            console.log(`  status: ${req.status}`);
        });
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

checkUuid().catch(console.error);