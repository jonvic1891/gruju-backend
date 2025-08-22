const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || 'postgres://u4a6su3t5n0fn6:p5f4a04c5bab918014522e2eeb051dfb5c13f62872bf11e829c1ef3168d21c637@cfcojm7sp9tfip.cluster-czz5s0kz4scl.eu-west-1.rds.amazonaws.com:5432/d9qg97gb6fqhoe';

const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function cleanupDuplicateInvitations() {
    const client = await pool.connect();
    
    try {
        console.log('🔍 Finding duplicate invitations...');
        
        // Find pending invitations that have corresponding sent invitations for the same activity/child
        const duplicatesQuery = await client.query(`
            SELECT pai.id as pending_id, pai.pending_connection_id, pai.activity_id,
                   a.name as activity_name,
                   COALESCE(c_direct.name, c_legacy.name) as child_name,
                   COALESCE(c_direct.uuid, c_legacy.uuid) as child_uuid
            FROM pending_activity_invitations pai
            JOIN activities a ON pai.activity_id = a.id
            -- Direct joins using new columns (preferred)
            LEFT JOIN users u_direct ON pai.invited_parent_uuid = u_direct.uuid
            LEFT JOIN children c_direct ON pai.invited_child_uuid = c_direct.uuid
            -- Legacy joins using pending_connection_id (fallback)
            LEFT JOIN children c_legacy ON (
                pai.invited_parent_uuid IS NULL AND (
                    CASE 
                        -- New format: pending-child-{childUuid} - show specific child only
                        WHEN pai.pending_connection_id LIKE 'pending-child-%' 
                        THEN c_legacy.uuid = REPLACE(pai.pending_connection_id, 'pending-child-', '')::uuid
                        -- Old format: pending-{parentUuid} - show all children from that parent  
                        WHEN pai.pending_connection_id LIKE 'pending-%' AND pai.pending_connection_id NOT LIKE 'pending-child-%'
                        THEN c_legacy.parent_id = (SELECT id FROM users WHERE uuid = REPLACE(pai.pending_connection_id, 'pending-', '')::uuid)
                        ELSE FALSE
                    END
                )
            )
            -- Check if there's already a sent invitation for the same activity/child
            WHERE EXISTS (
                SELECT 1 FROM activity_invitations ai
                WHERE ai.activity_id = pai.activity_id 
                AND ai.invited_child_uuid = COALESCE(c_direct.uuid, c_legacy.uuid)
            )
        `);
        
        console.log(`📋 Found ${duplicatesQuery.rows.length} orphaned pending invitations that should be removed:`);
        
        if (duplicatesQuery.rows.length === 0) {
            console.log('✅ No cleanup needed - no duplicates found');
            return;
        }
        
        // Show what will be deleted
        duplicatesQuery.rows.forEach((row, i) => {
            console.log(`${i + 1}. Pending invitation ID ${row.pending_id} for "${row.activity_name}" -> ${row.child_name} (${row.child_uuid})`);
            console.log(`   Connection ID: ${row.pending_connection_id}`);
        });
        
        console.log('\n🗑️ Removing orphaned pending invitations...');
        
        // Delete the orphaned pending invitations
        const deleteResult = await client.query(`
            DELETE FROM pending_activity_invitations
            WHERE id = ANY($1)
        `, [duplicatesQuery.rows.map(row => row.pending_id)]);
        
        console.log(`✅ Removed ${deleteResult.rowCount} orphaned pending invitations`);
        
        // Show remaining pending invitations
        const remainingQuery = await client.query(`
            SELECT pai.id, pai.pending_connection_id, a.name as activity_name,
                   COALESCE(c_direct.name, c_legacy.name) as child_name
            FROM pending_activity_invitations pai
            JOIN activities a ON pai.activity_id = a.id
            LEFT JOIN users u_direct ON pai.invited_parent_uuid = u_direct.uuid
            LEFT JOIN children c_direct ON pai.invited_child_uuid = c_direct.uuid
            LEFT JOIN children c_legacy ON (
                pai.invited_parent_uuid IS NULL AND (
                    CASE 
                        WHEN pai.pending_connection_id LIKE 'pending-child-%' 
                        THEN c_legacy.uuid = REPLACE(pai.pending_connection_id, 'pending-child-', '')::uuid
                        WHEN pai.pending_connection_id LIKE 'pending-%' AND pai.pending_connection_id NOT LIKE 'pending-child-%'
                        THEN c_legacy.parent_id = (SELECT id FROM users WHERE uuid = REPLACE(pai.pending_connection_id, 'pending-', '')::uuid)
                        ELSE FALSE
                    END
                )
            )
            ORDER BY pai.created_at DESC
        `);
        
        console.log(`\n📋 Remaining ${remainingQuery.rows.length} valid pending invitations:`);
        remainingQuery.rows.forEach((row, i) => {
            console.log(`${i + 1}. "${row.activity_name}" -> ${row.child_name} (${row.pending_connection_id})`);
        });
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

cleanupDuplicateInvitations().catch(console.error);