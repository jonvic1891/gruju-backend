const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function cleanupSentRequests() {
    const client = await pool.connect();
    
    try {
        console.log('🔍 Looking for all connection requests from roberts11@example.com...');
        
        // Find roberts11 user
        const user = await client.query(`
            SELECT id, email, username 
            FROM users 
            WHERE email = 'roberts11@example.com'
        `);
        
        if (user.rows.length === 0) {
            console.log('❌ Could not find roberts11@example.com user');
            return;
        }
        
        const roberts11 = user.rows[0];
        console.log(`📋 Found user: ${roberts11.email} (ID: ${roberts11.id})`);
        
        // Find all connection requests sent by this user
        const sentRequests = await client.query(`
            SELECT cr.*, 
                   u.email as target_email,
                   u.username as target_username,
                   u.family_name as target_family_name,
                   c1.name as child_name,
                   c2.name as target_child_name
            FROM connection_requests cr
            LEFT JOIN users u ON cr.target_parent_id = u.id
            LEFT JOIN children c1 ON cr.child_id = c1.id
            LEFT JOIN children c2 ON cr.target_child_id = c2.id
            WHERE cr.requester_id = $1
        `, [roberts11.id]);
        
        console.log(`📋 Found ${sentRequests.rows.length} sent connection requests:`);
        sentRequests.rows.forEach((req, index) => {
            console.log(`   ${index + 1}. To: ${req.target_email} (${req.target_username})`);
            console.log(`      From child: ${req.child_name}`);
            console.log(`      To child: ${req.target_child_name || 'Any Child'}`);
            console.log(`      Status: ${req.status}`);
            console.log(`      UUID: ${req.uuid}`);
            console.log(`      Created: ${req.created_at}`);
            console.log('');
        });
        
        // Delete all sent requests
        if (sentRequests.rows.length > 0) {
            console.log('🗑️ Deleting all sent connection requests...');
            for (const req of sentRequests.rows) {
                await client.query('DELETE FROM connection_requests WHERE uuid = $1', [req.uuid]);
                console.log(`✅ Deleted request to ${req.target_email}: ${req.uuid}`);
            }
        }
        
        console.log('🎉 Cleanup complete');
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

cleanupSentRequests();