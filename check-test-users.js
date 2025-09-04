const { Client } = require('pg');

async function checkTestUsers() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to test database');
    
    const result = await client.query('SELECT email, username FROM parents LIMIT 10');
    console.log('Test users in database:');
    result.rows.forEach(user => {
      console.log(`- Email: ${user.email}, Username: ${user.username}`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

checkTestUsers();