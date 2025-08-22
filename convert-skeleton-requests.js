const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || 'postgres://u4a6su3t5n0fn6:p5f4a04c5bab918014522e2eeb051dfb5c13f62872bf11e829c1ef3168d21c637@cfcojm7sp9tfip.cluster-czz5s0kz4scl.eu-west-1.rds.amazonaws.com:5432/d9qg97gb6fqhoe';

const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function convertSkeletonRequests() {
    const client = await pool.connect();
    
    try {
        console.log('🔄 Converting remaining skeleton connection requests...');
        
        // Get all unconverted skeleton requests
        const skeletonRequests = await client.query(`
            SELECT scr.*, 
                   u.username as requester_username, 
                   c.name as requester_child_name, 
                   c.uuid as requester_child_uuid,
                   sc.name as skeleton_child_name,
                   sc.merged_with_child_id,
                   real_child.uuid as real_child_uuid,
                   sa.merged_with_user_id as target_parent_id
            FROM skeleton_connection_requests scr
            JOIN users u ON scr.requester_parent_id = u.id
            JOIN children c ON scr.requester_child_id = c.id
            JOIN skeleton_children sc ON scr.skeleton_child_id = sc.id
            JOIN skeleton_accounts sa ON scr.skeleton_account_id = sa.id
            LEFT JOIN children real_child ON sc.merged_with_child_id = real_child.id
            WHERE scr.is_converted = false
        `);
        
        console.log(`📞 Found ${skeletonRequests.rows.length} unconverted skeleton requests:`);
        
        for (const skeletonRequest of skeletonRequests.rows) {
            console.log(`\n📋 Processing request from ${skeletonRequest.requester_username}:`);
            console.log(`   ${skeletonRequest.requester_child_name} → ${skeletonRequest.skeleton_child_name}`);
            console.log(`   Target parent ID: ${skeletonRequest.target_parent_id}`);
            console.log(`   Real child UUID: ${skeletonRequest.real_child_uuid}`);
            
            if (skeletonRequest.target_parent_id && skeletonRequest.real_child_uuid) {
                // Convert to real connection request
                const connectionRequestResult = await client.query(`
                    INSERT INTO connection_requests (
                        requester_id, target_parent_id, child_uuid, target_child_uuid, message, status
                    ) VALUES ($1, $2, $3, $4, $5, 'pending')
                    RETURNING *
                `, [
                    skeletonRequest.requester_parent_id,
                    skeletonRequest.target_parent_id,
                    skeletonRequest.requester_child_uuid,
                    skeletonRequest.real_child_uuid,
                    skeletonRequest.message
                ]);
                
                const realRequest = connectionRequestResult.rows[0];
                
                // Mark skeleton request as converted
                await client.query(`
                    UPDATE skeleton_connection_requests
                    SET is_converted = true, converted_to_request_id = $1
                    WHERE id = $2
                `, [realRequest.id, skeletonRequest.id]);
                
                console.log(`✅ Created real connection request ${realRequest.uuid}`);
            } else {
                console.log(`❌ Missing target parent ID or real child UUID`);
            }
        }
        
        console.log('\n🎉 Skeleton request conversion completed!');
        
        // Verify the results
        console.log('\n📊 Verification:');
        const requestsQuery = await client.query(`
            SELECT cr.*, u.username as requester_username, c1.name as child_name, c2.name as target_child_name
            FROM connection_requests cr
            JOIN users u ON cr.requester_id = u.id
            JOIN children c1 ON cr.child_uuid = c1.uuid
            JOIN children c2 ON cr.target_child_uuid = c2.uuid
            WHERE cr.target_parent_id = 210
        `);
        
        console.log(`📞 Roberts100 now has ${requestsQuery.rows.length} connection requests:`);
        requestsQuery.rows.forEach((req, i) => {
            console.log(`  ${i + 1}. From ${req.requester_username}: ${req.child_name} → ${req.target_child_name}`);
        });
        
    } catch (error) {
        console.error('❌ Conversion failed:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

convertSkeletonRequests().catch(console.error);