const { Client } = require('pg');
const bcrypt = require('bcrypt');

async function createTestUser() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Creating test user in users table...');
    
    const email = 'test@example.com';
    const password = 'test123';
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Delete if exists
    await client.query('DELETE FROM users WHERE email = $1', [email]);
    
    // Create new test user in users table
    const result = await client.query(`
      INSERT INTO users (username, email, password_hash, role, is_active)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, uuid, email, username
    `, ['testuser', email, hashedPassword, 'user', true]);
    
    console.log('✅ Test user created successfully:');
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log(`   UUID: ${result.rows[0].uuid}`);
    console.log(`   ID: ${result.rows[0].id}`);
    
  } catch (error) {
    console.error('Error creating test user:', error.message);
  } finally {
    await client.end();
  }
}

createTestUser();