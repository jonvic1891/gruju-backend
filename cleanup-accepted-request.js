const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function cleanupAcceptedRequest() {
    const client = await pool.connect();
    
    try {
        console.log('🔍 Looking for recently accepted connection requests...');
        
        // Find roberts10 and roberts11 (or charlie)
        const users = await client.query(`
            SELECT id, email, username 
            FROM users 
            WHERE email IN ('roberts10@example.com', 'roberts11@example.com', 'charlie@example.com')
        `);
        
        console.log('👥 Found users:');
        users.rows.forEach(user => {
            console.log(`   ${user.email}: ID=${user.id}`);
        });
        
        // Find recent accepted connection requests between these users
        const acceptedRequests = await client.query(`
            SELECT cr.id, cr.uuid, cr.status, cr.child_uuid, cr.target_child_uuid,
                   cr.requester_id, cr.target_parent_id, cr.created_at, cr.updated_at,
                   u1.email as requester_email,
                   u2.email as target_email,
                   c1.name as child_name,
                   c2.name as target_child_name
            FROM connection_requests cr
            LEFT JOIN users u1 ON cr.requester_id = u1.id
            LEFT JOIN users u2 ON cr.target_parent_id = u2.id
            LEFT JOIN children c1 ON cr.child_uuid = c1.uuid
            LEFT JOIN children c2 ON cr.target_child_uuid = c2.uuid
            WHERE cr.status = 'accepted' 
            AND cr.updated_at > NOW() - INTERVAL '1 hour'
            ORDER BY cr.updated_at DESC
        `);
        
        console.log(`\n📋 Found ${acceptedRequests.rows.length} recently accepted requests:`);
        acceptedRequests.rows.forEach((req, index) => {
            console.log(`\n${index + 1}. Request ${req.uuid}:`);
            console.log(`   From: ${req.requester_email} → ${req.target_email}`);
            console.log(`   Child: ${req.child_name || 'NULL'} (UUID: ${req.child_uuid || 'NULL'})`);
            console.log(`   Target Child: ${req.target_child_name || 'NULL'} (UUID: ${req.target_child_uuid || 'NULL'})`);
            console.log(`   Status: ${req.status}`);
            console.log(`   Updated: ${req.updated_at}`);
        });
        
        // Delete the accepted requests
        if (acceptedRequests.rows.length > 0) {
            console.log(`\n🗑️ Deleting ${acceptedRequests.rows.length} accepted requests...`);
            
            for (const req of acceptedRequests.rows) {
                await client.query('DELETE FROM connection_requests WHERE id = $1', [req.id]);
                console.log(`   ✅ Deleted request ${req.uuid} (${req.requester_email} → ${req.target_email})`);
            }
        }
        
        // Also check for any active connections that might have been created
        const connections = await client.query(`
            SELECT c.id, c.uuid, c.status, c.created_at,
                   u1.email as parent1_email,
                   u2.email as parent2_email,
                   ch1.name as child1_name,
                   ch2.name as child2_name
            FROM connections c
            LEFT JOIN children ch1 ON c.child1_id = ch1.id
            LEFT JOIN children ch2 ON c.child2_id = ch2.id
            LEFT JOIN users u1 ON ch1.parent_id = u1.id
            LEFT JOIN users u2 ON ch2.parent_id = u2.id
            WHERE c.created_at > NOW() - INTERVAL '1 hour'
            AND c.status = 'active'
            ORDER BY c.created_at DESC
        `);
        
        console.log(`\n🔗 Found ${connections.rows.length} recent active connections:`);
        if (connections.rows.length > 0) {
            connections.rows.forEach((conn, index) => {
                console.log(`\n${index + 1}. Connection ${conn.uuid}:`);
                console.log(`   ${conn.parent1_email} (${conn.child1_name}) ↔ ${conn.parent2_email} (${conn.child2_name})`);
                console.log(`   Status: ${conn.status}`);
                console.log(`   Created: ${conn.created_at}`);
            });
            
            console.log(`\n🗑️ Deleting ${connections.rows.length} recent connections...`);
            for (const conn of connections.rows) {
                await client.query('DELETE FROM connections WHERE id = $1', [conn.id]);
                console.log(`   ✅ Deleted connection ${conn.uuid}`);
            }
        }
        
        console.log('\n🎉 Cleanup complete! You can now send fresh connection requests for testing.');
        
    } catch (error) {
        console.error('❌ Cleanup error:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

cleanupAcceptedRequest();