const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || 'postgres://u4a6su3t5n0fn6:p5f4a04c5bab918014522e2eeb051dfb5c13f62872bf11e829c1ef3168d21c637@cfcojm7sp9tfip.cluster-czz5s0kz4scl.eu-west-1.rds.amazonaws.com:5432/d9qg97gb6fqhoe';

const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function removeOrphanedPending() {
    const client = await pool.connect();
    
    try {
        console.log('🔍 Finding specific orphaned pending invitation with UUID: 2871967f-8a4e-4dac-80d8-461e0f4d899f');
        
        // Check if this pending invitation exists
        const checkQuery = await client.query(`
            SELECT pai.id, pai.uuid, pai.pending_connection_id, pai.activity_id, a.name as activity_name
            FROM pending_activity_invitations pai
            JOIN activities a ON pai.activity_id = a.id
            WHERE pai.uuid = $1
        `, ['2871967f-8a4e-4dac-80d8-461e0f4d899f']);
        
        if (checkQuery.rows.length === 0) {
            console.log('❌ Pending invitation not found');
            return;
        }
        
        const pending = checkQuery.rows[0];
        console.log(`📋 Found orphaned pending invitation:`, pending);
        
        // Check if there's already a sent invitation for the same activity/child
        const sentInvitationQuery = await client.query(`
            SELECT ai.uuid, ai.status
            FROM activity_invitations ai
            WHERE ai.activity_uuid = (SELECT uuid FROM activities WHERE id = $1)
            AND ai.invited_child_uuid = 'd8f7d7b6-f48d-4be0-ba72-417bd6711266'
        `, [pending.activity_id]);
        
        if (sentInvitationQuery.rows.length > 0) {
            console.log(`✅ Confirmed: There is already a sent invitation for this activity/child:`, sentInvitationQuery.rows[0]);
            
            // Delete the orphaned pending invitation
            const deleteResult = await client.query(`
                DELETE FROM pending_activity_invitations
                WHERE uuid = $1
            `, ['2871967f-8a4e-4dac-80d8-461e0f4d899f']);
            
            console.log(`🗑️ Removed orphaned pending invitation. Rows deleted: ${deleteResult.rowCount}`);
        } else {
            console.log('⚠️ No sent invitation found - keeping pending invitation');
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

removeOrphanedPending().catch(console.error);