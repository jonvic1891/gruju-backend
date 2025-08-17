const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function cleanupBrokenConnectionRequests() {
    const client = await pool.connect();
    
    try {
        console.log('🧹 Cleaning up broken connection requests...');
        
        // First, let's see what connection requests exist
        const allRequests = await client.query(`
            SELECT cr.id, cr.uuid, cr.status, cr.child_uuid, cr.target_child_uuid,
                   cr.requester_id, cr.target_parent_id,
                   u1.email as requester_email,
                   u2.email as target_parent_email,
                   c1.name as child_name,
                   c2.name as target_child_name
            FROM connection_requests cr
            LEFT JOIN users u1 ON cr.requester_id = u1.id
            LEFT JOIN users u2 ON cr.target_parent_id = u2.id
            LEFT JOIN children c1 ON cr.child_uuid = c1.uuid
            LEFT JOIN children c2 ON cr.target_child_uuid = c2.uuid
            WHERE cr.status = 'pending'
        `);
        
        console.log(`📋 Found ${allRequests.rows.length} pending connection requests:`);
        allRequests.rows.forEach((req, index) => {
            console.log(`\n${index + 1}. Request ${req.uuid}:`);
            console.log(`   From: ${req.requester_email} → ${req.target_parent_email}`);
            console.log(`   Child: ${req.child_name || 'NULL'} (UUID: ${req.child_uuid || 'NULL'})`);
            console.log(`   Target Child: ${req.target_child_name || 'NULL'} (UUID: ${req.target_child_uuid || 'NULL'})`);
            console.log(`   Status: ${req.status}`);
            
            if (!req.child_name) {
                console.log(`   ❌ BROKEN: child_uuid doesn't match any child`);
            }
            if (req.target_child_uuid && !req.target_child_name) {
                console.log(`   ❌ BROKEN: target_child_uuid doesn't match any child`);
            }
        });
        
        // Find and delete broken requests
        const brokenRequests = allRequests.rows.filter(req => 
            !req.child_name || (req.target_child_uuid && !req.target_child_name)
        );
        
        if (brokenRequests.length > 0) {
            console.log(`\n🗑️ Found ${brokenRequests.length} broken connection requests to delete:`);
            
            for (const req of brokenRequests) {
                console.log(`   Deleting request ${req.uuid} (${req.requester_email} → ${req.target_parent_email})`);
                await client.query('DELETE FROM connection_requests WHERE uuid = $1', [req.uuid]);
                console.log(`   ✅ Deleted`);
            }
        } else {
            console.log('\n✅ No broken connection requests found');
        }
        
        // Also clean up any old connection requests between roberts11 and roberts10
        console.log('\n🧹 Cleaning up any remaining test data between roberts11 and roberts10...');
        
        const testUsers = await client.query(`
            SELECT id, email, username 
            FROM users 
            WHERE email IN ('roberts11@example.com', 'roberts10@example.com')
        `);
        
        if (testUsers.rows.length === 2) {
            const roberts11 = testUsers.rows.find(u => u.email === 'roberts11@example.com');
            const roberts10 = testUsers.rows.find(u => u.email === 'roberts10@example.com');
            
            const testRequests = await client.query(`
                SELECT uuid, requester_id, target_parent_id
                FROM connection_requests
                WHERE (requester_id = $1 AND target_parent_id = $2)
                   OR (requester_id = $2 AND target_parent_id = $1)
            `, [roberts11.id, roberts10.id]);
            
            if (testRequests.rows.length > 0) {
                console.log(`   Found ${testRequests.rows.length} test requests to clean up`);
                for (const req of testRequests.rows) {
                    await client.query('DELETE FROM connection_requests WHERE uuid = $1', [req.uuid]);
                    console.log(`   ✅ Deleted test request ${req.uuid}`);
                }
            } else {
                console.log('   ✅ No test requests found');
            }
        }
        
        // Final verification
        console.log('\n🔍 Final verification - remaining connection requests:');
        const finalRequests = await client.query(`
            SELECT cr.uuid, u1.email as requester_email, u2.email as target_parent_email,
                   c1.name as child_name, c2.name as target_child_name
            FROM connection_requests cr
            LEFT JOIN users u1 ON cr.requester_id = u1.id
            LEFT JOIN users u2 ON cr.target_parent_id = u2.id
            LEFT JOIN children c1 ON cr.child_uuid = c1.uuid
            LEFT JOIN children c2 ON cr.target_child_uuid = c2.uuid
            WHERE cr.status = 'pending'
        `);
        
        if (finalRequests.rows.length === 0) {
            console.log('   ✅ No pending connection requests remain');
        } else {
            console.log(`   📋 ${finalRequests.rows.length} remaining requests:`);
            finalRequests.rows.forEach(req => {
                console.log(`      ${req.requester_email}: ${req.child_name} → ${req.target_child_name || 'Any Child'}`);
            });
        }
        
        console.log('\n🎉 Cleanup complete! You can now create fresh connection requests using the new UUID system.');
        
    } catch (error) {
        console.error('❌ Cleanup error:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

cleanupBrokenConnectionRequests();