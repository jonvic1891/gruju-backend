const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function forceDeleteRoberts10Requests() {
    const client = await pool.connect();
    
    try {
        console.log('🗑️ FORCE DELETING all connection requests for roberts10...');
        
        // Find roberts10 user
        const roberts10 = await client.query(`
            SELECT id, email, username 
            FROM users 
            WHERE email = 'roberts10@example.com'
        `);
        
        if (roberts10.rows.length === 0) {
            console.log('❌ roberts10@example.com not found');
            return;
        }
        
        const roberts10Id = roberts10.rows[0].id;
        console.log(`📋 Found roberts10: ID ${roberts10Id}`);
        
        // Show ALL connection requests involving roberts10 BEFORE deletion
        const allRequests = await client.query(`
            SELECT cr.id, cr.uuid, cr.status, cr.created_at,
                   u1.email as requester_email,
                   u2.email as target_email,
                   CASE 
                     WHEN cr.target_parent_id = $1 THEN 'INCOMING' 
                     ELSE 'OUTGOING' 
                   END as direction
            FROM connection_requests cr
            LEFT JOIN users u1 ON cr.requester_id = u1.id
            LEFT JOIN users u2 ON cr.target_parent_id = u2.id
            WHERE cr.target_parent_id = $1 OR cr.requester_id = $1
        `, [roberts10Id]);
        
        console.log(`\n📋 Found ${allRequests.rows.length} connection requests involving roberts10:`);
        allRequests.rows.forEach((req, index) => {
            console.log(`   ${index + 1}. ${req.direction}: ${req.requester_email} → ${req.target_email} (${req.status}) - ${req.uuid}`);
        });
        
        // FORCE DELETE ALL connection requests involving roberts10
        if (allRequests.rows.length > 0) {
            console.log(`\n🗑️ FORCE DELETING all ${allRequests.rows.length} requests...`);
            
            const deleteResult = await client.query(`
                DELETE FROM connection_requests 
                WHERE target_parent_id = $1 OR requester_id = $1
            `, [roberts10Id]);
            
            console.log(`✅ Deleted ${deleteResult.rowCount} connection requests`);
        } else {
            console.log('\n✅ No connection requests found to delete');
        }
        
        // Verify deletion
        const verifyResult = await client.query(`
            SELECT COUNT(*) as count
            FROM connection_requests 
            WHERE target_parent_id = $1 OR requester_id = $1
        `, [roberts10Id]);
        
        const remainingCount = parseInt(verifyResult.rows[0].count);
        if (remainingCount === 0) {
            console.log('\n✅ VERIFICATION: No connection requests remain for roberts10');
        } else {
            console.log(`\n❌ VERIFICATION: ${remainingCount} requests still remain! Something went wrong.`);
        }
        
        // Also clean up any connections in the connections table
        console.log('\n🔍 Checking for active connections involving roberts10...');
        const connections = await client.query(`
            SELECT c.id, c.uuid, c.status,
                   u1.email as parent1_email,
                   u2.email as parent2_email,
                   ch1.name as child1_name,
                   ch2.name as child2_name
            FROM connections c
            LEFT JOIN children ch1 ON c.child1_id = ch1.id
            LEFT JOIN children ch2 ON c.child2_id = ch2.id
            LEFT JOIN users u1 ON ch1.parent_id = u1.id
            LEFT JOIN users u2 ON ch2.parent_id = u2.id
            WHERE u1.id = $1 OR u2.id = $1
        `, [roberts10Id]);
        
        if (connections.rows.length > 0) {
            console.log(`📋 Found ${connections.rows.length} active connections involving roberts10:`);
            connections.rows.forEach((conn, index) => {
                console.log(`   ${index + 1}. ${conn.parent1_email} (${conn.child1_name}) ↔ ${conn.parent2_email} (${conn.child2_name})`);
            });
            
            console.log('\n🗑️ Deleting active connections...');
            const deleteConnResult = await client.query(`
                DELETE FROM connections 
                WHERE id IN (
                    SELECT c.id FROM connections c
                    LEFT JOIN children ch1 ON c.child1_id = ch1.id
                    LEFT JOIN children ch2 ON c.child2_id = ch2.id
                    WHERE ch1.parent_id = $1 OR ch2.parent_id = $1
                )
            `, [roberts10Id]);
            
            console.log(`✅ Deleted ${deleteConnResult.rowCount} active connections`);
        } else {
            console.log('✅ No active connections found');
        }
        
        console.log('\n🎉 FORCE CLEANUP COMPLETE!');
        console.log('roberts10 should now have a completely clean slate for connection requests.');
        console.log('Please refresh the page and check if the connection request is gone.');
        
    } catch (error) {
        console.error('❌ Force cleanup error:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

forceDeleteRoberts10Requests();