const { Client } = require('pg');
const bcrypt = require('bcrypt');

async function createTestUser() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Creating test user...');
    
    const email = 'test@example.com';
    const password = 'test123';
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Delete if exists
    await client.query('DELETE FROM parents WHERE email = $1', [email]);
    
    // Create new test user
    const result = await client.query(`
      INSERT INTO parents (username, email, password_hash, role)
      VALUES ($1, $2, $3, $4)
      RETURNING id, uuid, email, username
    `, ['testuser', email, hashedPassword, 'user']);
    
    console.log('✅ Test user created successfully:');
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log(`   UUID: ${result.rows[0].uuid}`);
    
  } catch (error) {
    console.error('Error creating test user:', error.message);
  } finally {
    await client.end();
  }
}

createTestUser();