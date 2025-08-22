const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || 'postgres://u4a6su3t5n0fn6:p5f4a04c5bab918014522e2eeb051dfb5c13f62872bf11e829c1ef3168d21c637@cfcojm7sp9tfip.cluster-czz5s0kz4scl.eu-west-1.rds.amazonaws.com:5432/d9qg97gb6fqhoe';

const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkChildrenSchema() {
    const client = await pool.connect();
    
    try {
        console.log('🔍 Checking children table schema...');
        
        const schemaQuery = await client.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'children' 
            ORDER BY ordinal_position
        `);
        
        console.log('📋 Children table columns:');
        schemaQuery.rows.forEach(col => {
            console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
        });
        
        // Check if we have age instead of birth_year
        const hasAge = schemaQuery.rows.find(col => col.column_name === 'age');
        const hasBirthYear = schemaQuery.rows.find(col => col.column_name === 'birth_year');
        
        console.log('\n📊 Analysis:');
        console.log(`  Has 'age' column: ${!!hasAge}`);
        console.log(`  Has 'birth_year' column: ${!!hasBirthYear}`);
        
        if (hasAge && !hasBirthYear) {
            console.log('\n💡 Suggestion: Use age instead of birth_year in skeleton merging');
        }
        
    } catch (error) {
        console.error('❌ Schema check failed:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

checkChildrenSchema().catch(console.error);