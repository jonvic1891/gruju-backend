const { Client } = require('pg');
const bcrypt = require('bcrypt');

async function resetWongPassword() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Resetting wong user password...');
    
    const email = 'wong@example.com';
    const newPassword = 'wong123';
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update password in users table
    const result = await client.query(
      'UPDATE users SET password_hash = $1 WHERE email = $2 RETURNING id, email, username',
      [hashedPassword, email]
    );
    
    if (result.rows.length > 0) {
      console.log('✅ Wong user password updated successfully:');
      console.log(`   Email: ${email}`);
      console.log(`   Password: ${newPassword}`);
      console.log(`   Username: ${result.rows[0].username}`);
      console.log(`   User ID: ${result.rows[0].id}`);
    } else {
      console.log('❌ Wong user not found in users table');
    }
    
  } catch (error) {
    console.error('Error resetting password:', error.message);
  } finally {
    await client.end();
  }
}

resetWongPassword();