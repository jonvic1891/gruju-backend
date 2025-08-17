const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function deleteSpecificRequest() {
    const client = await pool.connect();
    
    try {
        const targetUuid = '547d440f-32b7-4674-a334-b37943bc1989';
        
        console.log(`🎯 Targeting specific broken request: ${targetUuid}`);
        
        // Show the request before deletion
        const request = await client.query(`
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
            WHERE cr.uuid = $1
        `, [targetUuid]);
        
        if (request.rows.length === 0) {
            console.log('❌ Request not found! It may have already been deleted.');
            return;
        }
        
        const req = request.rows[0];
        console.log('\n📋 Found request to delete:');
        console.log(`   UUID: ${req.uuid}`);
        console.log(`   From: ${req.requester_email} → ${req.target_email}`);
        console.log(`   Child: ${req.child_name} (UUID: ${req.child_uuid})`);
        console.log(`   Target Child: ${req.target_child_name || 'NULL'} (UUID: ${req.target_child_uuid || 'NULL'})`);
        console.log(`   Status: ${req.status}`);
        console.log(`   Created: ${req.created_at}`);
        
        if (!req.target_child_name && req.target_child_uuid) {
            console.log('   ❌ BROKEN: target_child_uuid points to non-existent child');
        }
        
        // Delete the specific request
        console.log('\n🗑️ Deleting the broken request...');
        const deleteResult = await client.query(
            'DELETE FROM connection_requests WHERE uuid = $1',
            [targetUuid]
        );
        
        if (deleteResult.rowCount === 1) {
            console.log('✅ Successfully deleted the broken connection request');
        } else {
            console.log('❌ Failed to delete - no rows affected');
        }
        
        // Verify deletion
        const verifyResult = await client.query(
            'SELECT COUNT(*) as count FROM connection_requests WHERE uuid = $1',
            [targetUuid]
        );
        
        const remainingCount = parseInt(verifyResult.rows[0].count);
        if (remainingCount === 0) {
            console.log('✅ VERIFICATION: Request successfully removed from database');
        } else {
            console.log('❌ VERIFICATION: Request still exists in database!');
        }
        
        // Check if roberts10 has any remaining connection requests
        const roberts10Requests = await client.query(`
            SELECT cr.uuid, u.email as requester_email, c1.name as child_name, c2.name as target_child_name
            FROM connection_requests cr
            LEFT JOIN users u ON cr.requester_id = u.id
            LEFT JOIN children c1 ON cr.child_uuid = c1.uuid
            LEFT JOIN children c2 ON cr.target_child_uuid = c2.uuid
            WHERE cr.target_parent_id = (SELECT id FROM users WHERE email = 'roberts10@example.com')
        `);
        
        console.log(`\n📋 Remaining requests for roberts10: ${roberts10Requests.rows.length}`);
        if (roberts10Requests.rows.length > 0) {
            roberts10Requests.rows.forEach(req => {
                console.log(`   ${req.requester_email}: ${req.child_name} → ${req.target_child_name || 'NULL'}`);
            });
        } else {
            console.log('   ✅ No connection requests remain for roberts10');
        }
        
        console.log('\n🎉 Cleanup complete! Roberts10 should no longer see the broken connection request.');
        
    } catch (error) {
        console.error('❌ Delete error:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

deleteSpecificRequest();