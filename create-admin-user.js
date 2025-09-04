const { Client } = require('pg');

async function createAdminUser() {
  console.log('🚀 Creating admin user for production environment...');

  // Get database URL from environment
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable is required');
    process.exit(1);
  }

  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    // First create the tables if they don't exist
    console.log('📋 Creating database schema...');
    
    // Create parents table
    await client.query(`
      CREATE TABLE IF NOT EXISTS parents (
        id SERIAL PRIMARY KEY,
        uuid UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
        username VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(20),
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'user',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create children table
    await client.query(`
      CREATE TABLE IF NOT EXISTS children (
        id SERIAL PRIMARY KEY,
        uuid UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
        parent_id INTEGER REFERENCES parents(id) ON DELETE CASCADE,
        parent_uuid UUID REFERENCES parents(uuid) ON DELETE CASCADE,
        first_name VARCHAR(255) NOT NULL,
        last_name VARCHAR(255),
        name VARCHAR(255),
        birth_date DATE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create activities table
    await client.query(`
      CREATE TABLE IF NOT EXISTS activities (
        id SERIAL PRIMARY KEY,
        uuid UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
        child_id INTEGER REFERENCES children(id) ON DELETE CASCADE,
        child_uuid UUID REFERENCES children(uuid) ON DELETE CASCADE,
        parent_id INTEGER REFERENCES parents(id) ON DELETE CASCADE,
        parent_uuid UUID REFERENCES parents(uuid) ON DELETE CASCADE,
        activity_name VARCHAR(255) NOT NULL,
        activity_type VARCHAR(100),
        start_date TIMESTAMP NOT NULL,
        end_date TIMESTAMP NOT NULL,
        location VARCHAR(255),
        description TEXT,
        color VARCHAR(7),
        auto_notify BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create connection_requests table
    await client.query(`
      CREATE TABLE IF NOT EXISTS connection_requests (
        id SERIAL PRIMARY KEY,
        uuid UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
        requester_parent_id INTEGER REFERENCES parents(id) ON DELETE CASCADE,
        requester_parent_uuid UUID REFERENCES parents(uuid) ON DELETE CASCADE,
        target_parent_id INTEGER REFERENCES parents(id) ON DELETE CASCADE,
        target_parent_uuid UUID REFERENCES parents(uuid) ON DELETE CASCADE,
        children_ids INTEGER[] DEFAULT '{}',
        children_uuids UUID[] DEFAULT '{}',
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
        message TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create connections table
    await client.query(`
      CREATE TABLE IF NOT EXISTS connections (
        id SERIAL PRIMARY KEY,
        uuid UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
        parent1_id INTEGER REFERENCES parents(id) ON DELETE CASCADE,
        parent1_uuid UUID REFERENCES parents(uuid) ON DELETE CASCADE,
        parent2_id INTEGER REFERENCES parents(id) ON DELETE CASCADE,
        parent2_uuid UUID REFERENCES parents(uuid) ON DELETE CASCADE,
        children_ids INTEGER[] DEFAULT '{}',
        children_uuids UUID[] DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create activity_invitations table
    await client.query(`
      CREATE TABLE IF NOT EXISTS activity_invitations (
        id SERIAL PRIMARY KEY,
        uuid UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
        activity_id INTEGER REFERENCES activities(id) ON DELETE CASCADE,
        activity_uuid UUID REFERENCES activities(uuid) ON DELETE CASCADE,
        host_parent_id INTEGER REFERENCES parents(id) ON DELETE CASCADE,
        host_parent_uuid UUID REFERENCES parents(uuid) ON DELETE CASCADE,
        invited_parent_id INTEGER REFERENCES parents(id) ON DELETE CASCADE,
        invited_parent_uuid UUID REFERENCES parents(uuid) ON DELETE CASCADE,
        invited_children_ids INTEGER[] DEFAULT '{}',
        invited_children_uuids UUID[] DEFAULT '{}',
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
        message TEXT,
        viewed_at TIMESTAMP,
        status_viewed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    console.log('✅ Database schema created successfully');

    // Hash password using bcrypt (simplified for setup script)
    const bcrypt = require('bcrypt');
    const adminPassword = 'Admin123!';
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    // Create admin user
    const adminUserQuery = `
      INSERT INTO parents (username, email, password_hash, role, phone)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (email) DO NOTHING
      RETURNING id, uuid, username, email, role;
    `;

    const result = await client.query(adminUserQuery, [
      'admin',
      'admin@gruju.com',
      hashedPassword,
      'admin',
      '+44 7700 900000'
    ]);

    if (result.rows.length > 0) {
      console.log('✅ Admin user created successfully:');
      console.log('   📧 Email: admin@gruju.com');
      console.log('   🔑 Password: Admin123!');
      console.log('   👤 Username: admin');
      console.log('   🎭 Role: admin');
      console.log('   🆔 UUID:', result.rows[0].uuid);
    } else {
      console.log('ℹ️  Admin user already exists');
      
      // Get existing admin user info
      const existingAdmin = await client.query(
        'SELECT id, uuid, username, email, role FROM parents WHERE email = $1',
        ['admin@gruju.com']
      );
      
      if (existingAdmin.rows.length > 0) {
        console.log('   📧 Email: admin@gruju.com');
        console.log('   👤 Username:', existingAdmin.rows[0].username);
        console.log('   🎭 Role:', existingAdmin.rows[0].role);
        console.log('   🆔 UUID:', existingAdmin.rows[0].uuid);
      }
    }

    console.log('\n🏥 Production environment setup complete!');
    console.log('🌐 Backend URL: https://gruju-d3d8121d3647.herokuapp.com');
    console.log('🔗 Admin login: https://gruju-parent-activity-app.web.app');

  } catch (error) {
    console.error('❌ Error setting up production environment:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run the setup
createAdminUser().catch(console.error);