const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function removeConnectionRequest() {
    const client = await pool.connect();
    
    try {
        console.log('🔍 Looking for connection requests between roberts11 and roberts10...');
        
        // First, find the user IDs
        const users = await client.query(`
            SELECT id, email, username 
            FROM users 
            WHERE email IN ('roberts11@example.com', 'roberts10@example.com')
        `);
        
        console.log('📋 Found users:', users.rows);
        
        const roberts11 = users.rows.find(u => u.email === 'roberts11@example.com');
        const roberts10 = users.rows.find(u => u.email === 'roberts10@example.com');
        
        if (!roberts11 || !roberts10) {
            console.log('❌ Could not find both users');
            return;
        }
        
        // Find connection requests between these users
        const requests = await client.query(`
            SELECT cr.*, 
                   u1.email as requester_email,
                   u2.email as target_email,
                   c1.name as child_name,
                   c2.name as target_child_name
            FROM connection_requests cr
            LEFT JOIN users u1 ON cr.requester_id = u1.id
            LEFT JOIN users u2 ON cr.target_parent_id = u2.id
            LEFT JOIN children c1 ON cr.child_id = c1.id
            LEFT JOIN children c2 ON cr.target_child_id = c2.id
            WHERE (cr.requester_id = $1 AND cr.target_parent_id = $2)
               OR (cr.requester_id = $2 AND cr.target_parent_id = $1)
        `, [roberts11.id, roberts10.id]);
        
        console.log('📋 Found connection requests:', requests.rows);
        
        if (requests.rows.length === 0) {
            console.log('ℹ️ No connection requests found between these users');
            return;
        }
        
        // Delete the connection requests
        for (const request of requests.rows) {
            console.log(`🗑️ Deleting connection request: ${request.uuid}`);
            console.log(`   From: ${request.requester_email} (child: ${request.child_name})`);
            console.log(`   To: ${request.target_email} (target child: ${request.target_child_name || 'Any Child'})`);
            
            await client.query('DELETE FROM connection_requests WHERE uuid = $1', [request.uuid]);
            console.log('✅ Deleted successfully');
        }
        
        console.log('🎉 All connection requests removed');
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

removeConnectionRequest();