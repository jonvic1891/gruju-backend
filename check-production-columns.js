const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || 'postgres://u4a6su3t5n0fn6:p5f4a04c5bab918014522e2eeb051dfb5c13f62872bf11e829c1ef3168d21c637@cfcojm7sp9tfip.cluster-czz5s0kz4scl.eu-west-1.rds.amazonaws.com:5432/d9qg97gb6fqhoe';

const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkColumns() {
    const client = await pool.connect();
    
    try {
        console.log('🔍 Checking pending_activity_invitations table structure...');
        
        // Check all columns in the table
        const columnsResult = await client.query(`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'pending_activity_invitations' 
            ORDER BY ordinal_position
        `);
        
        console.log('📊 Table columns:');
        columnsResult.rows.forEach(col => {
            console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
        });
        
        // Check if the new columns exist
        const hasNewColumns = columnsResult.rows.some(col => col.column_name === 'invited_parent_uuid') &&
                             columnsResult.rows.some(col => col.column_name === 'invited_child_uuid');
        
        if (hasNewColumns) {
            console.log('✅ New columns exist');
            
            // Check existing records and see if they have the new column data
            const recordsResult = await client.query(`
                SELECT 
                    pending_connection_id,
                    invited_parent_uuid,
                    invited_child_uuid,
                    created_at
                FROM pending_activity_invitations 
                ORDER BY created_at DESC 
                LIMIT 5
            `);
            
            console.log('\n📋 Recent pending invitation records:');
            recordsResult.rows.forEach((record, i) => {
                console.log(`Record ${i + 1}:`);
                console.log(`  pending_connection_id: ${record.pending_connection_id}`);
                console.log(`  invited_parent_uuid: ${record.invited_parent_uuid}`);
                console.log(`  invited_child_uuid: ${record.invited_child_uuid}`);
                console.log(`  created_at: ${record.created_at}`);
            });
            
        } else {
            console.log('❌ New columns are missing');
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

checkColumns().catch(console.error);