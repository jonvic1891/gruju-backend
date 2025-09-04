const { Client } = require('pg');

async function checkSpecificUsers() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Checking for specific test users...');
    
    const emails = ['roberts10@example.com', 'roberts11@example.com', 'charlie@example.com'];
    
    for (const email of emails) {
      const result = await client.query('SELECT email, username FROM parents WHERE email = $1', [email]);
      if (result.rows.length > 0) {
        console.log(`✅ Found: ${email} (${result.rows[0].username})`);
      } else {
        console.log(`❌ Not found: ${email}`);
      }
    }
    
    // Show all users
    console.log('\nAll users in database:');
    const allUsers = await client.query('SELECT email, username FROM parents ORDER BY email');
    allUsers.rows.forEach(user => {
      console.log(`- ${user.email} (${user.username})`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

checkSpecificUsers();