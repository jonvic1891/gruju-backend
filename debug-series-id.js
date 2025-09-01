const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function debugSeriesId() {
  try {
    const client = await pool.connect();
    
    console.log('🔍 DEBUGGING SERIES_ID VALUES');
    console.log('='.repeat(50));
    
    // Check activities table schema for series_id
    console.log('\n1. Activities table schema for series_id:');
    const schemaResult = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'activities' AND column_name = 'series_id'
    `);
    
    if (schemaResult.rows.length > 0) {
      console.log('   Series ID column exists:');
      schemaResult.rows.forEach(row => {
        console.log(`   - Column: ${row.column_name}`);
        console.log(`   - Type: ${row.data_type}`);
        console.log(`   - Nullable: ${row.is_nullable}`);
        console.log(`   - Default: ${row.column_default}`);
      });
    } else {
      console.log('   Series ID column does not exist in activities table');
    }
    
    // Check actual series_id values for rec12
    console.log('\n2. Current series_id values for rec12:');
    const rec12Result = await client.query(`
      SELECT id, uuid, name, start_date, series_id, 
             CASE 
               WHEN series_id IS NULL THEN 'NULL'
               ELSE COALESCE(series_id::text, 'EMPTY')
             END as series_id_debug
      FROM activities 
      WHERE name LIKE '%rec12%' 
      ORDER BY start_date
    `);
    
    console.log(`Found ${rec12Result.rows.length} rec12 activities:`);
    rec12Result.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. Activity "${row.name}"`);
      console.log(`      ID: ${row.id}, UUID: ${row.uuid}`);
      console.log(`      Date: ${row.start_date}`);
      console.log(`      series_id: ${row.series_id} (debug: ${row.series_id_debug})`);
      console.log('');
    });
    
    // Check if there are any activities WITH proper series_id values
    console.log('\n3. Activities with non-null series_id values:');
    const seriesIdResult = await client.query(`
      SELECT name, COUNT(*) as count, series_id
      FROM activities 
      WHERE series_id IS NOT NULL
      GROUP BY name, series_id
      ORDER BY count DESC
      LIMIT 10
    `);
    
    console.log(`Found ${seriesIdResult.rows.length} groups with series_id:`);
    seriesIdResult.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. "${row.name}": ${row.count} activities with series_id="${row.series_id}"`);
    });
    
    client.release();
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

debugSeriesId();