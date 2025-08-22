const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || 'postgres://u4a6su3t5n0fn6:p5f4a04c5bab918014522e2eeb051dfb5c13f62872bf11e829c1ef3168d21c637@cfcojm7sp9tfip.cluster-czz5s0kz4scl.eu-west-1.rds.amazonaws.com:5432/d9qg97gb6fqhoe';

const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function addPendingInvitationColumns() {
    const client = await pool.connect();
    
    try {
        console.log('🔍 Checking if invited_parent_uuid and invited_child_uuid columns exist...');
        
        const columnCheck = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'pending_activity_invitations' 
            AND column_name IN ('invited_parent_uuid', 'invited_child_uuid')
        `);
        
        console.log('📊 Existing columns:', columnCheck.rows);
        
        const existingColumns = columnCheck.rows.map(row => row.column_name);
        
        if (!existingColumns.includes('invited_parent_uuid')) {
            console.log('➕ Adding invited_parent_uuid column...');
            await client.query(`
                ALTER TABLE pending_activity_invitations 
                ADD COLUMN invited_parent_uuid UUID
            `);
            console.log('✅ Added invited_parent_uuid column');
        } else {
            console.log('✅ invited_parent_uuid column already exists');
        }
        
        if (!existingColumns.includes('invited_child_uuid')) {
            console.log('➕ Adding invited_child_uuid column...');
            await client.query(`
                ALTER TABLE pending_activity_invitations 
                ADD COLUMN invited_child_uuid UUID
            `);
            console.log('✅ Added invited_child_uuid column');
        } else {
            console.log('✅ invited_child_uuid column already exists');
        }
        
        console.log('🎉 Database migration completed successfully');
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

if (require.main === module) {
    addPendingInvitationColumns().catch(console.error);
}

module.exports = { addPendingInvitationColumns };