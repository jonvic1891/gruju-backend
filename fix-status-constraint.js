const { Pool } = require('pg');

const DATABASE_URL = 'postgres://u4a6su3t5n0fn6:p5f4a04c5bab918014522e2eeb051dfb5c13f62872bf11e829c1ef3168d21c637@cfcojm7sp9tfip.cluster-czz5s0kz4scl.eu-west-1.rds.amazonaws.com:5432/d9qg97gb6fqhoe';

async function fixStatusConstraint() {
    const pool = new Pool({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    
    try {
        const client = await pool.connect();
        
        console.log('🔧 Fixing connection_requests status constraint...');
        
        await client.query('BEGIN');
        
        try {
            // Drop the old constraint first
            await client.query(`
                ALTER TABLE connection_requests 
                DROP CONSTRAINT IF EXISTS connection_requests_status_check
            `);
            console.log('✅ Dropped old status constraint');
            
            // Now update existing 'declined' records to 'rejected'
            const updateResult = await client.query(`
                UPDATE connection_requests 
                SET status = 'rejected' 
                WHERE status = 'declined'
            `);
            console.log(`✅ Updated ${updateResult.rowCount} 'declined' records to 'rejected'`);
            
            // Add new constraint allowing 'pending', 'accepted', 'rejected'
            await client.query(`
                ALTER TABLE connection_requests 
                ADD CONSTRAINT connection_requests_status_check 
                CHECK (status IN ('pending', 'accepted', 'rejected'))
            `);
            console.log('✅ Added new status constraint: pending, accepted, rejected');
            
            await client.query('COMMIT');
            console.log('✅ All changes committed successfully');
            
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        
        // Verify the changes
        const statuses = await client.query(`
            SELECT status, COUNT(*) as count 
            FROM connection_requests 
            GROUP BY status 
            ORDER BY count DESC
        `);
        
        console.log('\n📊 Updated status distribution:');
        statuses.rows.forEach(status => {
            console.log(`   ${status.status}: ${status.count} records`);
        });
        
        client.release();
        
    } catch (error) {
        console.error('❌ Error fixing status constraint:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

fixStatusConstraint();