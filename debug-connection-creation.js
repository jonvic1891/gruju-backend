const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function debugConnectionCreation() {
    const client = await pool.connect();
    
    try {
        console.log('🔍 Debugging connection request creation flow...');
        
        // Find roberts11 and roberts10 users
        const users = await client.query(`
            SELECT id, email, username, uuid
            FROM users 
            WHERE email IN ('roberts11@example.com', 'roberts10@example.com')
        `);
        
        console.log('👥 Found users:');
        users.rows.forEach(user => {
            console.log(`   ${user.email}: ID=${user.id}, UUID=${user.uuid}`);
        });
        
        // Find their children
        const children = await client.query(`
            SELECT c.id, c.uuid, c.name, c.parent_id, u.email as parent_email
            FROM children c
            JOIN users u ON c.parent_id = u.id
            WHERE u.email IN ('roberts11@example.com', 'roberts10@example.com')
            ORDER BY u.email, c.name
        `);
        
        console.log('\n👶 Found children:');
        children.rows.forEach(child => {
            console.log(`   ${child.parent_email}: ${child.name} (ID=${child.id}, UUID=${child.uuid})`);
        });
        
        // Check recent connection requests
        const recentRequests = await client.query(`
            SELECT cr.id, cr.uuid, cr.status, cr.child_uuid, cr.target_child_uuid,
                   cr.requester_id, cr.target_parent_id, cr.created_at,
                   u1.email as requester_email,
                   u2.email as target_email,
                   c1.name as child_name,
                   c2.name as target_child_name
            FROM connection_requests cr
            LEFT JOIN users u1 ON cr.requester_id = u1.id
            LEFT JOIN users u2 ON cr.target_parent_id = u2.id
            LEFT JOIN children c1 ON cr.child_uuid = c1.uuid
            LEFT JOIN children c2 ON cr.target_child_uuid = c2.uuid
            WHERE cr.created_at > NOW() - INTERVAL '1 hour'
            ORDER BY cr.created_at DESC
        `);
        
        console.log(`\n📋 Recent connection requests (last hour): ${recentRequests.rows.length}`);
        recentRequests.rows.forEach((req, index) => {
            console.log(`\n${index + 1}. Request ${req.uuid}:`);
            console.log(`   From: ${req.requester_email} → ${req.target_email}`);
            console.log(`   Child: ${req.child_name || 'NULL'} (UUID: ${req.child_uuid || 'NULL'})`);
            console.log(`   Target Child: ${req.target_child_name || 'NULL'} (UUID: ${req.target_child_uuid || 'NULL'})`);
            console.log(`   Status: ${req.status}`);
            console.log(`   Created: ${req.created_at}`);
            
            if (!req.child_name) {
                console.log(`   ❌ ISSUE: child_uuid ${req.child_uuid} doesn't match any child`);
            }
            if (req.target_child_uuid && !req.target_child_name) {
                console.log(`   ❌ ISSUE: target_child_uuid ${req.target_child_uuid} doesn't match any child`);
            }
        });
        
        // Check if there are any children with the UUIDs from the connection requests
        if (recentRequests.rows.length > 0) {
            console.log('\n🔍 Checking if child UUIDs exist in database...');
            for (const req of recentRequests.rows) {
                if (req.child_uuid) {
                    const childCheck = await client.query(
                        'SELECT name, parent_id FROM children WHERE uuid = $1',
                        [req.child_uuid]
                    );
                    console.log(`   child_uuid ${req.child_uuid}: ${childCheck.rows.length > 0 ? childCheck.rows[0].name : 'NOT FOUND'}`);
                }
                
                if (req.target_child_uuid) {
                    const targetChildCheck = await client.query(
                        'SELECT name, parent_id FROM children WHERE uuid = $1',
                        [req.target_child_uuid]
                    );
                    console.log(`   target_child_uuid ${req.target_child_uuid}: ${targetChildCheck.rows.length > 0 ? targetChildCheck.rows[0].name : 'NOT FOUND'}`);
                }
            }
        }
        
    } catch (error) {
        console.error('❌ Debug error:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

debugConnectionCreation();