const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || 'postgres://u4a6su3t5n0fn6:p5f4a04c5bab918014522e2eeb051dfb5c13f62872bf11e829c1ef3168d21c637@cfcojm7sp9tfip.cluster-czz5s0kz4scl.eu-west-1.rds.amazonaws.com:5432/d9qg97gb6fqhoe';

const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function debugSkeletonMerge() {
    const client = await pool.connect();
    
    try {
        console.log('🔍 Debugging skeleton account merge process...');
        
        // Check if roberts100 user exists
        console.log('\n1. Checking roberts100 user...');
        const userQuery = await client.query('SELECT * FROM users WHERE email = $1', ['roberts100@example.com']);
        if (userQuery.rows.length > 0) {
            const user = userQuery.rows[0];
            console.log('✅ Roberts100 user found:', {
                id: user.id,
                email: user.email,
                phone: user.phone,
                username: user.username
            });
            
            // Check children
            console.log('\n2. Checking roberts100 children...');
            const childrenQuery = await client.query('SELECT * FROM children WHERE parent_id = $1', [user.id]);
            console.log(`📊 Found ${childrenQuery.rows.length} children:`);
            childrenQuery.rows.forEach(child => {
                console.log(`  - ${child.name} (${child.birth_year}) - ${child.uuid}`);
            });
            
            // Check connection requests
            console.log('\n3. Checking connection requests...');
            const requestsQuery = await client.query('SELECT * FROM connection_requests WHERE target_parent_id = $1', [user.id]);
            console.log(`📞 Found ${requestsQuery.rows.length} connection requests:`);
            requestsQuery.rows.forEach(req => {
                console.log(`  - Request ${req.uuid}: status ${req.status}`);
            });
        } else {
            console.log('❌ Roberts100 user not found');
            return;
        }
        
        // Check skeleton accounts
        console.log('\n4. Checking skeleton accounts...');
        const skeletonQuery = await client.query('SELECT * FROM skeleton_accounts ORDER BY created_at');
        console.log(`📋 Found ${skeletonQuery.rows.length} skeleton accounts:`);
        skeletonQuery.rows.forEach(acc => {
            console.log(`  - ${acc.contact_method} (${acc.contact_type})`);
            console.log(`    Merged: ${acc.is_merged}, With User: ${acc.merged_with_user_id}`);
        });
        
        // Check skeleton children
        console.log('\n5. Checking skeleton children...');
        const skeletonChildrenQuery = await client.query('SELECT * FROM skeleton_children ORDER BY created_at');
        console.log(`👶 Found ${skeletonChildrenQuery.rows.length} skeleton children:`);
        skeletonChildrenQuery.rows.forEach(child => {
            console.log(`  - ${child.name} (account ${child.skeleton_account_id})`);
            console.log(`    Merged: ${child.is_merged}, With Child: ${child.merged_with_child_id}`);
        });
        
        // Check skeleton connection requests
        console.log('\n6. Checking skeleton connection requests...');
        const skeletonRequestsQuery = await client.query('SELECT * FROM skeleton_connection_requests ORDER BY created_at');
        console.log(`📞 Found ${skeletonRequestsQuery.rows.length} skeleton connection requests:`);
        skeletonRequestsQuery.rows.forEach(req => {
            console.log(`  - Request ${req.uuid}`);
            console.log(`    Converted: ${req.is_converted}, To Request: ${req.converted_to_request_id}`);
        });
        
        // Test the mergeSkeletonAccounts function manually
        if (userQuery.rows.length > 0) {
            const user = userQuery.rows[0];
            console.log('\n7. Testing skeleton merging manually...');
            
            // Find skeleton accounts matching email or phone
            const skeletonAccountsQuery = await client.query(`
                SELECT * FROM skeleton_accounts 
                WHERE (contact_method = $1 OR contact_method = $2) 
                AND is_merged = false
            `, [user.email, user.phone]);
            
            console.log(`🔍 Found ${skeletonAccountsQuery.rows.length} matching skeleton accounts`);
            
            if (skeletonAccountsQuery.rows.length > 0) {
                console.log('❌ Skeleton accounts were not merged during registration!');
                console.log('🔧 This suggests the mergeSkeletonAccounts function was not called or failed');
                
                // Try to merge them now
                console.log('\n8. Attempting manual merge...');
                
                const allCreatedChildren = [];
                
                for (const skeletonAccount of skeletonAccountsQuery.rows) {
                    console.log(`🔄 Processing skeleton account ${skeletonAccount.id} (${skeletonAccount.contact_method})`);
                    
                    // Get skeleton children
                    const skeletonChildren = await client.query(`
                        SELECT * FROM skeleton_children 
                        WHERE skeleton_account_id = $1 AND is_merged = false
                    `, [skeletonAccount.id]);
                    
                    console.log(`👶 Found ${skeletonChildren.rows.length} skeleton children to merge`);
                    
                    // Create real children
                    const createdChildren = [];
                    for (const skeletonChild of skeletonChildren.rows) {
                        console.log(`👶 Creating real child: ${skeletonChild.name}`);
                        
                        const childResult = await client.query(`
                            INSERT INTO children (parent_id, name)
                            VALUES ($1, $2)
                            RETURNING *
                        `, [user.id, skeletonChild.name]);
                        
                        const newChild = childResult.rows[0];
                        createdChildren.push({ skeleton: skeletonChild, real: newChild });
                        allCreatedChildren.push({ skeleton: skeletonChild, real: newChild });
                        console.log(`✅ Created child ${newChild.name} (${newChild.uuid})`);
                        
                        // Mark skeleton child as merged
                        await client.query(`
                            UPDATE skeleton_children 
                            SET is_merged = true, merged_with_child_id = $1
                            WHERE id = $2
                        `, [newChild.id, skeletonChild.id]);
                    }
                    
                    // Get skeleton connection requests for this account and convert them
                    const skeletonRequests = await client.query(`
                        SELECT scr.*, u.username as requester_username, c.name as requester_child_name, c.uuid as requester_child_uuid
                        FROM skeleton_connection_requests scr
                        JOIN users u ON scr.requester_parent_id = u.id
                        JOIN children c ON scr.requester_child_id = c.id
                        WHERE scr.skeleton_account_id = $1 AND scr.is_converted = false
                    `, [skeletonAccount.id]);
                    
                    console.log(`📞 Found ${skeletonRequests.rows.length} skeleton connection requests to convert`);
                    
                    // Convert skeleton connection requests to real connection requests
                    for (const skeletonRequest of skeletonRequests.rows) {
                        // Find the matching real child
                        const matchingChild = createdChildren.find(child => 
                            child.skeleton.id === skeletonRequest.skeleton_child_id
                        );
                        
                        if (matchingChild) {
                            console.log(`📞 Converting connection request from ${skeletonRequest.requester_username} to real request`);
                            
                            const connectionRequestResult = await client.query(`
                                INSERT INTO connection_requests (
                                    requester_id, target_parent_id, child_uuid, target_child_uuid, message, status
                                ) VALUES ($1, $2, $3, $4, $5, 'pending')
                                RETURNING *
                            `, [
                                skeletonRequest.requester_parent_id,
                                user.id,
                                skeletonRequest.requester_child_uuid,
                                matchingChild.real.uuid,
                                skeletonRequest.message
                            ]);
                            
                            const realRequest = connectionRequestResult.rows[0];
                            
                            // Mark skeleton request as converted
                            await client.query(`
                                UPDATE skeleton_connection_requests
                                SET is_converted = true, converted_to_request_id = $1
                                WHERE id = $2
                            `, [realRequest.id, skeletonRequest.id]);
                            
                            console.log(`✅ Converted skeleton request ${skeletonRequest.id} to real request ${realRequest.uuid}`);
                        } else {
                            console.error(`❌ Could not find matching real child for skeleton request ${skeletonRequest.id}`);
                        }
                    }
                    
                    // Mark skeleton account as merged
                    await client.query(`
                        UPDATE skeleton_accounts
                        SET is_merged = true, merged_with_user_id = $1, merged_at = NOW()
                        WHERE id = $2
                    `, [user.id, skeletonAccount.id]);
                    
                    console.log(`✅ Marked skeleton account ${skeletonAccount.id} as merged`);
                }
                
                console.log('\n✅ Manual merge completed');
            } else {
                console.log('✅ No unmerged skeleton accounts found');
            }
        }
        
    } catch (error) {
        console.error('❌ Debug failed:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

debugSkeletonMerge().catch(console.error);