const { Pool } = require('pg');
require('dotenv').config();

// Use Heroku database URL directly for this migration
const DATABASE_URL = 'postgres://u4a6su3t5n0fn6:p5f4a04c5bab918014522e2eeb051dfb5c13f62872bf11e829c1ef3168d21c637@cfcojm7sp9tfip.cluster-czz5s0kz4scl.eu-west-1.rds.amazonaws.com:5432/d9qg97gb6fqhoe';

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function createParentsTable() {
  const client = await pool.connect();
  
  try {
    console.log('Creating parents table...');
    
    // Create the parents table
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS parents (
        id SERIAL PRIMARY KEY,
        uuid UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
        account_uuid UUID NOT NULL,
        username VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        is_primary BOOLEAN DEFAULT false,
        role VARCHAR(50) DEFAULT 'parent' CHECK (role IN ('parent', 'guardian', 'caregiver')),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        FOREIGN KEY (account_uuid) REFERENCES users(uuid) ON DELETE CASCADE
      );
    `;
    
    await client.query(createTableQuery);
    console.log('✅ Parents table created successfully');
    
    // Create indexes for better performance
    const createIndexes = `
      CREATE INDEX IF NOT EXISTS idx_parents_account_uuid ON parents(account_uuid);
      CREATE INDEX IF NOT EXISTS idx_parents_uuid ON parents(uuid);
      CREATE INDEX IF NOT EXISTS idx_parents_email ON parents(email);
    `;
    
    await client.query(createIndexes);
    console.log('✅ Indexes created successfully');
    
    // Create trigger for updated_at timestamp
    const createTrigger = `
      CREATE OR REPLACE FUNCTION update_parents_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ language 'plpgsql';
      
      DROP TRIGGER IF EXISTS trigger_update_parents_updated_at ON parents;
      CREATE TRIGGER trigger_update_parents_updated_at
        BEFORE UPDATE ON parents
        FOR EACH ROW
        EXECUTE FUNCTION update_parents_updated_at();
    `;
    
    await client.query(createTrigger);
    console.log('✅ Trigger created successfully');
    
    // Migrate existing users to parents table as primary parents
    const migrateExistingUsers = `
      INSERT INTO parents (account_uuid, username, email, phone, is_primary, role, created_at, updated_at)
      SELECT 
        uuid as account_uuid,
        username,
        email,
        phone,
        true as is_primary,
        'parent' as role,
        created_at,
        updated_at
      FROM users 
      WHERE role IN ('user', 'admin', 'super_admin')
      AND uuid NOT IN (SELECT account_uuid FROM parents WHERE is_primary = true);
    `;
    
    const result = await client.query(migrateExistingUsers);
    console.log(`✅ Migrated ${result.rowCount} existing users to parents table`);
    
    console.log('🎉 Parents table setup completed successfully!');
    
  } catch (error) {
    console.error('❌ Error creating parents table:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the migration
if (require.main === module) {
  createParentsTable()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { createParentsTable };