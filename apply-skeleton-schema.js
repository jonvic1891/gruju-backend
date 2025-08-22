const { Pool } = require('pg');
const fs = require('fs');

const DATABASE_URL = process.env.DATABASE_URL || 'postgres://u4a6su3t5n0fn6:p5f4a04c5bab918014522e2eeb051dfb5c13f62872bf11e829c1ef3168d21c637@cfcojm7sp9tfip.cluster-czz5s0kz4scl.eu-west-1.rds.amazonaws.com:5432/d9qg97gb6fqhoe';

const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function applySkeletonSchema() {
    const client = await pool.connect();
    
    try {
        console.log('🗄️ Applying skeleton accounts schema...');
        
        // Read the SQL file
        const sqlContent = fs.readFileSync('add-skeleton-accounts-schema.sql', 'utf8');
        
        // Execute the entire SQL as one transaction
        console.log(`📝 Executing schema changes...`);
        await client.query(sqlContent);
        
        console.log('✅ Skeleton accounts schema applied successfully');
        
        // Verify tables were created
        const tablesQuery = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name LIKE 'skeleton%'
            ORDER BY table_name
        `);
        
        console.log('\n📊 Skeleton tables created:');
        tablesQuery.rows.forEach(row => {
            console.log(`  ✅ ${row.table_name}`);
        });
        
    } catch (error) {
        console.error('❌ Error applying schema:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

applySkeletonSchema().catch(console.error);