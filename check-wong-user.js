const { Client } = require('pg');

async function checkWongUser() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Checking wong family users...');
    
    // Check in users table (for authentication)
    const userResult = await client.query(`
      SELECT email, username, role, is_active, id, uuid 
      FROM users 
      WHERE email ILIKE '%wong%' OR username ILIKE '%wong%'
      ORDER BY email
    `);
    
    console.log('Wong users in users table (authentication):');
    userResult.rows.forEach(user => {
      console.log(`- Email: ${user.email}, Username: ${user.username}, Role: ${user.role}, Active: ${user.is_active}, ID: ${user.id}`);
    });
    
    // Check in parents table (for app data)
    const parentResult = await client.query(`
      SELECT email, username, uuid, id
      FROM parents 
      WHERE email ILIKE '%wong%' OR username ILIKE '%wong%'
      ORDER BY email
    `);
    
    console.log('\nWong users in parents table (app data):');
    parentResult.rows.forEach(parent => {
      console.log(`- Email: ${parent.email}, Username: ${parent.username}, UUID: ${parent.uuid}, ID: ${parent.id}`);
    });
    
    // Check for any possible wong variations
    const allWongResults = await client.query(`
      SELECT email, username FROM users 
      WHERE email ILIKE '%wong%' OR username ILIKE '%wong%' OR email = 'wong@example.com'
      UNION
      SELECT email, username FROM parents 
      WHERE email ILIKE '%wong%' OR username ILIKE '%wong%' OR email = 'wong@example.com'
      ORDER BY email
    `);
    
    console.log('\nAll wong-related entries:');
    allWongResults.rows.forEach(entry => {
      console.log(`- ${entry.email} (${entry.username})`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

checkWongUser();