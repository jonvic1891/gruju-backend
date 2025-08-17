const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function fixRoberts10Connection() {
    const client = await pool.connect();
    
    try {
        console.log('🔧 Fixing roberts10 connection request issue...');
        
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
        console.log(`📋 Found roberts10: ID ${roberts10Id}, ${roberts10.rows[0].username}`);
        
        // Find all connection requests TO roberts10
        const incomingRequests = await client.query(`
            SELECT cr.id, cr.uuid, cr.status, cr.child_uuid, cr.target_child_uuid,
                   cr.requester_id, cr.target_parent_id,
                   u.email as requester_email,
                   c1.name as child_name,
                   c2.name as target_child_name
            FROM connection_requests cr
            LEFT JOIN users u ON cr.requester_id = u.id
            LEFT JOIN children c1 ON cr.child_uuid = c1.uuid
            LEFT JOIN children c2 ON cr.target_child_uuid = c2.uuid
            WHERE cr.target_parent_id = $1
        `, [roberts10Id]);
        
        console.log(`📋 Found ${incomingRequests.rows.length} connection requests TO roberts10:`);
        
        for (const req of incomingRequests.rows) {
            console.log(`\n🔍 Request ${req.uuid}:`);
            console.log(`   From: ${req.requester_email}`);
            console.log(`   Child: ${req.child_name || 'NULL'} (UUID: ${req.child_uuid || 'NULL'})`);
            console.log(`   Target Child: ${req.target_child_name || 'NULL'} (UUID: ${req.target_child_uuid || 'NULL'})`);
            console.log(`   Status: ${req.status}`);
            
            // Check if this request is broken
            const isBroken = !req.child_name || (req.target_child_uuid && !req.target_child_name);
            
            if (isBroken) {
                console.log(`   ❌ BROKEN REQUEST - deleting...`);
                await client.query('DELETE FROM connection_requests WHERE uuid = $1', [req.uuid]);
                console.log(`   ✅ Deleted broken request ${req.uuid}`);
            } else {
                console.log(`   ✅ Request looks valid`);
            }
        }
        
        // Also check connection requests FROM roberts10 
        const outgoingRequests = await client.query(`
            SELECT cr.id, cr.uuid, cr.status, cr.child_uuid, cr.target_child_uuid,
                   cr.requester_id, cr.target_parent_id,
                   u.email as target_email,
                   c1.name as child_name,
                   c2.name as target_child_name
            FROM connection_requests cr
            LEFT JOIN users u ON cr.target_parent_id = u.id
            LEFT JOIN children c1 ON cr.child_uuid = c1.uuid
            LEFT JOIN children c2 ON cr.target_child_uuid = c2.uuid
            WHERE cr.requester_id = $1
        `, [roberts10Id]);
        
        console.log(`\n📤 Found ${outgoingRequests.rows.length} connection requests FROM roberts10:`);
        
        for (const req of outgoingRequests.rows) {
            console.log(`\n🔍 Request ${req.uuid}:`);
            console.log(`   To: ${req.target_email}`);
            console.log(`   Child: ${req.child_name || 'NULL'} (UUID: ${req.child_uuid || 'NULL'})`);
            console.log(`   Target Child: ${req.target_child_name || 'NULL'} (UUID: ${req.target_child_uuid || 'NULL'})`);
            console.log(`   Status: ${req.status}`);
            
            // Check if this request is broken
            const isBroken = !req.child_name || (req.target_child_uuid && !req.target_child_name);
            
            if (isBroken) {
                console.log(`   ❌ BROKEN REQUEST - deleting...`);
                await client.query('DELETE FROM connection_requests WHERE uuid = $1', [req.uuid]);
                console.log(`   ✅ Deleted broken request ${req.uuid}`);
            } else {
                console.log(`   ✅ Request looks valid`);
            }
        }
        
        // Final check
        console.log('\n🔍 Final verification - remaining requests for roberts10:');
        const finalCheck = await client.query(`
            SELECT cr.uuid, u.email as other_email, c1.name as child_name, c2.name as target_child_name,
                   CASE WHEN cr.target_parent_id = $1 THEN 'INCOMING' ELSE 'OUTGOING' END as direction
            FROM connection_requests cr
            LEFT JOIN users u ON (CASE WHEN cr.target_parent_id = $1 THEN cr.requester_id ELSE cr.target_parent_id END) = u.id
            LEFT JOIN children c1 ON cr.child_uuid = c1.uuid
            LEFT JOIN children c2 ON cr.target_child_uuid = c2.uuid
            WHERE cr.target_parent_id = $1 OR cr.requester_id = $1
        `, [roberts10Id]);
        
        if (finalCheck.rows.length === 0) {
            console.log('   ✅ No connection requests remain for roberts10');
        } else {
            finalCheck.rows.forEach(req => {
                console.log(`   ${req.direction}: ${req.child_name} → ${req.target_child_name || 'Any Child'} (${req.other_email})`);
            });
        }
        
        console.log('\n🎉 Fix complete! roberts10 should now be able to properly handle connection requests.');
        
    } catch (error) {
        console.error('❌ Fix error:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

fixRoberts10Connection();