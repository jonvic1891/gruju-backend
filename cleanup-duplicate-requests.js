const { Pool } = require('pg');

const DATABASE_URL = 'postgres://u4a6su3t5n0fn6:p5f4a04c5bab918014522e2eeb051dfb5c13f62872bf11e829c1ef3168d21c637@cfcojm7sp9tfip.cluster-czz5s0kz4scl.eu-west-1.rds.amazonaws.com:5432/d9qg97gb6fqhoe';

async function cleanupDuplicateRequests() {
    const pool = new Pool({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    
    try {
        const client = await pool.connect();
        
        console.log('🧹 Cleaning up duplicate connection requests...');
        
        // Find and delete duplicate pending requests (keep only the oldest one for each unique combination)
        const result = await client.query(`
            DELETE FROM connection_requests 
            WHERE id IN (
                SELECT id FROM (
                    SELECT id,
                           ROW_NUMBER() OVER (
                               PARTITION BY requester_id, target_parent_id, child_uuid, target_child_uuid 
                               ORDER BY created_at ASC
                           ) as row_num
                    FROM connection_requests 
                    WHERE status = 'pending'
                ) ranked
                WHERE row_num > 1
            )
        `);
        
        console.log(`✅ Deleted ${result.rowCount} duplicate connection requests`);
        
        // Show remaining pending requests
        const remaining = await client.query(`
            SELECT cr.uuid, cr.requester_id, cr.target_parent_id, cr.child_uuid, cr.target_child_uuid, cr.status, cr.created_at,
                   u1.username as requester_name,
                   u2.username as target_name,
                   c1.name as child_name,
                   c2.name as target_child_name
            FROM connection_requests cr
            LEFT JOIN users u1 ON cr.requester_id = u1.id
            LEFT JOIN users u2 ON cr.target_parent_id = u2.id
            LEFT JOIN children c1 ON cr.child_uuid = c1.uuid
            LEFT JOIN children c2 ON cr.target_child_uuid = c2.uuid
            WHERE cr.status = 'pending'
            ORDER BY cr.created_at DESC
        `);
        
        console.log(`\n📋 Remaining pending requests (${remaining.rows.length}):`);
        remaining.rows.forEach((req, i) => {
            console.log(`   ${i+1}. ${req.requester_name} -> ${req.target_name}`);
            console.log(`      Child: ${req.child_name} -> ${req.target_child_name}`);
            console.log(`      UUID: ${req.uuid}, Created: ${req.created_at}`);
        });
        
        client.release();
        
    } catch (error) {
        console.error('❌ Error cleaning up requests:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

cleanupDuplicateRequests();