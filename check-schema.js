const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function checkSchema() {
    const client = await pool.connect();
    
    try {
        console.log('🔍 Checking connection_requests table schema...');
        
        const result = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'connection_requests' 
            ORDER BY ordinal_position
        `);
        
        console.log('📋 Current columns in connection_requests:');
        result.rows.forEach(row => {
            console.log(`   - ${row.column_name}: ${row.data_type}`);
        });
        
        const uuidColumns = result.rows.filter(row => row.column_name.includes('uuid'));
        console.log(`\n🔍 UUID columns found: ${uuidColumns.length}`);
        uuidColumns.forEach(col => {
            console.log(`   ✅ ${col.column_name}: ${col.data_type}`);
        });
        
        const oldColumns = result.rows.filter(row => row.column_name === 'child_id' || row.column_name === 'target_child_id');
        console.log(`\n🔍 Old ID columns found: ${oldColumns.length}`);
        oldColumns.forEach(col => {
            console.log(`   ❌ ${col.column_name}: ${col.data_type}`);
        });
        
        if (uuidColumns.length === 2 && oldColumns.length === 0) {
            console.log('\n✅ Migration 15 has completed successfully!');
        } else if (uuidColumns.length === 0 && oldColumns.length === 2) {
            console.log('\n❌ Migration 15 has NOT run yet - still using old schema');
        } else {
            console.log('\n⚠️ Migration 15 is in progress - mixed schema detected');
        }
        
    } catch (error) {
        console.error('❌ Error checking schema:', error.message);
    } finally {
        client.release();
        await pool.end();
    }
}

checkSchema();