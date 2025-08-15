const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'claud_clubs_dev',
  password: process.env.DB_PASSWORD || 'password123',
  port: process.env.DB_PORT || 5432,
});

async function checkChildrenSchema() {
  try {
    console.log('🔄 Checking children table schema...');
    
    const client = await pool.connect();
    
    // Check children table structure
    const schemaResult = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'children' 
      ORDER BY ordinal_position
    `);
    
    console.log('Children table columns:', schemaResult.rows);
    
    // Check if any children have UUIDs
    const sampleResult = await client.query(`
      SELECT id, name, uuid 
      FROM children 
      LIMIT 5
    `);
    
    console.log('Sample children data:', sampleResult.rows);
    
    client.release();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkChildrenSchema();