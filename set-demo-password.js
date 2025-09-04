const { Client } = require('pg');
const bcrypt = require('bcrypt');

async function setDemoPassword() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Setting demo123 password for wong user...');
    
    const email = 'wong@example.com';
    const newPassword = 'demo123';
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update password in users table
    const result = await client.query(
      'UPDATE users SET password_hash = $1 WHERE email = $2 RETURNING id, email, username',
      [hashedPassword, email]
    );
    
    if (result.rows.length > 0) {
      console.log('✅ Wong user password updated to demo123:');
      console.log(`   Email: ${email}`);
      console.log(`   Password: ${newPassword}`);
      console.log(`   Username: ${result.rows[0].username}`);
    } else {
      console.log('❌ Wong user not found');
    }
    
    // Also show all current test users with their IDs
    console.log('\n📋 All available test users:');
    const users = await client.query('SELECT email, username FROM users WHERE email LIKE \'%@example.com\' ORDER BY email');
    users.rows.forEach(user => {
      console.log(`   - ${user.email} (${user.username})`);
    });
    
  } catch (error) {
    console.error('Error updating password:', error.message);
  } finally {
    await client.end();
  }
}

setDemoPassword();