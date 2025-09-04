const { Client } = require('pg');

async function checkUsersTable() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Checking users table...');
    
    const result = await client.query('SELECT email, username, role, is_active FROM users ORDER BY email LIMIT 20');
    
    console.log('Users in the users table:');
    result.rows.forEach(user => {
      console.log(`- Email: ${user.email}, Username: ${user.username}, Role: ${user.role}, Active: ${user.is_active}`);
    });
    
    // Check specific test users
    console.log('\nChecking for specific test users...');
    const testEmails = ['roberts10@example.com', 'roberts11@example.com', 'test@example.com'];
    
    for (const email of testEmails) {
      const userResult = await client.query('SELECT email, username, role, is_active FROM users WHERE email = $1', [email]);
      if (userResult.rows.length > 0) {
        const user = userResult.rows[0];
        console.log(`✅ Found: ${email} (${user.username}, ${user.role}, Active: ${user.is_active})`);
      } else {
        console.log(`❌ Not found: ${email}`);
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

checkUsersTable();