const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function checkConnections() {
    const client = await pool.connect();
    
    try {
        console.log('🔍 Checking for active connections and connection requests...');
        
        // Find the user IDs
        const users = await client.query(`
            SELECT id, email, username 
            FROM users 
            WHERE email IN ('roberts11@example.com', 'roberts10@example.com')
        `);
        
        const roberts11 = users.rows.find(u => u.email === 'roberts11@example.com');
        const roberts10 = users.rows.find(u => u.email === 'roberts10@example.com');
        
        if (!roberts11 || !roberts10) {
            console.log('❌ Could not find both users');
            return;
        }
        
        console.log(`📋 Roberts11 ID: ${roberts11.id}, Roberts10 ID: ${roberts10.id}`);
        
        // Check for any remaining connection requests
        const requests = await client.query(`
            SELECT cr.*, 
                   u1.email as requester_email,
                   u2.email as target_email
            FROM connection_requests cr
            LEFT JOIN users u1 ON cr.requester_id = u1.id
            LEFT JOIN users u2 ON cr.target_parent_id = u2.id
            WHERE (cr.requester_id = $1 AND cr.target_parent_id = $2)
               OR (cr.requester_id = $2 AND cr.target_parent_id = $1)
        `, [roberts11.id, roberts10.id]);
        
        console.log(`📋 Connection requests found: ${requests.rows.length}`);
        requests.rows.forEach(req => {
            console.log(`   ${req.requester_email} -> ${req.target_email} (status: ${req.status})`);
        });
        
        // Check for active connections in the connections table
        const connections = await client.query(`
            SELECT c.*, 
                   u1.email as parent1_email,
                   u2.email as parent2_email,
                   ch1.name as child1_name,
                   ch2.name as child2_name
            FROM connections c
            LEFT JOIN users u1 ON c.parent1_id = u1.id
            LEFT JOIN users u2 ON c.parent2_id = u2.id
            LEFT JOIN children ch1 ON c.child1_id = ch1.id
            LEFT JOIN children ch2 ON c.child2_id = ch2.id
            WHERE (c.parent1_id = $1 AND c.parent2_id = $2)
               OR (c.parent1_id = $2 AND c.parent2_id = $1)
        `, [roberts11.id, roberts10.id]);
        
        console.log(`📋 Active connections found: ${connections.rows.length}`);
        connections.rows.forEach(conn => {
            console.log(`   ${conn.parent1_email} (${conn.child1_name}) <-> ${conn.parent2_email} (${conn.child2_name})`);
            console.log(`   UUID: ${conn.uuid}, Created: ${conn.created_at}`);
        });
        
        // If there are active connections, offer to delete them too
        if (connections.rows.length > 0) {
            console.log('\n🗑️ Deleting active connections...');
            for (const conn of connections.rows) {
                await client.query('DELETE FROM connections WHERE uuid = $1', [conn.uuid]);
                console.log(`✅ Deleted connection: ${conn.uuid}`);
            }
        }
        
        console.log('🎉 Check complete');
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

checkConnections();