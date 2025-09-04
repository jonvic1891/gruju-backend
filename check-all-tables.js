const { Client } = require('pg');

async function checkAllTables() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Checking all tables...');
    
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    console.log('Available tables:');
    for (const table of tables.rows) {
      console.log(`\n=== ${table.table_name} ===`);
      
      const columns = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = $1
        ORDER BY ordinal_position
      `, [table.table_name]);
      
      columns.rows.forEach(col => {
        console.log(`- ${col.column_name}: ${col.data_type}`);
      });
      
      // Show sample data for small tables
      const count = await client.query(`SELECT COUNT(*) FROM ${table.table_name}`);
      console.log(`Rows: ${count.rows[0].count}`);
      
      if (parseInt(count.rows[0].count) <= 10) {
        const sample = await client.query(`SELECT * FROM ${table.table_name} LIMIT 3`);
        if (sample.rows.length > 0) {
          console.log('Sample data:', JSON.stringify(sample.rows[0], null, 2));
        }
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

checkAllTables();