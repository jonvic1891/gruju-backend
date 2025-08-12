const { Pool } = require('pg');

async function addDatabaseConstraints() {
  const DATABASE_URL = 'postgres://u4a6su3t5n0fn6:p5f4a04c5bab918014522e2eeb051dfb5c13f62872bf11e829c1ef3168d21c637@cfcojm7sp9tfip.cluster-czz5s0kz4scl.eu-west-1.rds.amazonaws.com:5432/d9qg97gb6fqhoe';
  
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('🔍 Connecting to Heroku database...');
    const client = await pool.connect();
    
    console.log('✅ Connected! Adding database constraints...');
    
    // 1. Add NOT NULL constraint to invited_child_id
    console.log('🔧 Adding NOT NULL constraint to invited_child_id...');
    try {
      await client.query(`
        ALTER TABLE activity_invitations 
        ALTER COLUMN invited_child_id SET NOT NULL
      `);
      console.log('✅ NOT NULL constraint added to invited_child_id');
    } catch (error) {
      if (error.message.includes('column contains null values')) {
        console.log('❌ Cannot add NOT NULL constraint - there are still NULL values in invited_child_id');
        console.log('Please run cleanup-corrupt-invitations.js first');
      } else {
        console.log('⚠️ NOT NULL constraint may already exist or other error:', error.message);
      }
    }
    
    // 2. Add foreign key constraint to ensure invited_child_id references an existing child
    console.log('🔧 Adding foreign key constraint for invited_child_id...');
    try {
      await client.query(`
        ALTER TABLE activity_invitations 
        ADD CONSTRAINT fk_invited_child_id 
        FOREIGN KEY (invited_child_id) REFERENCES children(id) 
        ON DELETE CASCADE
      `);
      console.log('✅ Foreign key constraint added for invited_child_id');
    } catch (error) {
      console.log('⚠️ Foreign key constraint may already exist or other error:', error.message);
    }
    
    // 3. Add check constraint to ensure the invited child belongs to the invited parent
    console.log('🔧 Adding check constraint to ensure child belongs to invited parent...');
    try {
      await client.query(`
        ALTER TABLE activity_invitations 
        ADD CONSTRAINT chk_child_belongs_to_parent 
        CHECK (
          invited_child_id IN (
            SELECT id FROM children WHERE parent_id = invited_parent_id
          )
        )
      `);
      console.log('✅ Check constraint added to ensure child belongs to invited parent');
    } catch (error) {
      console.log('⚠️ Check constraint may already exist or other error:', error.message);
    }
    
    // 4. Show current table constraints
    console.log('📋 Current constraints on activity_invitations table:');
    const constraintsQuery = `
      SELECT 
        conname AS constraint_name,
        contype AS constraint_type,
        pg_get_constraintdef(oid) AS constraint_definition
      FROM pg_constraint 
      WHERE conrelid = 'activity_invitations'::regclass
      ORDER BY contype, conname
    `;
    
    const constraintsResult = await client.query(constraintsQuery);
    constraintsResult.rows.forEach(row => {
      const type = {
        'p': 'PRIMARY KEY',
        'f': 'FOREIGN KEY', 
        'c': 'CHECK',
        'u': 'UNIQUE',
        'n': 'NOT NULL'
      }[row.constraint_type] || row.constraint_type;
      
      console.log(`  - ${row.constraint_name} (${type}): ${row.constraint_definition}`);
    });
    
    client.release();
    console.log('🎉 Database constraints setup complete!');
    
  } catch (error) {
    console.error('❌ Error adding constraints:', error.message);
  } finally {
    await pool.end();
  }
}

// Only run if called directly
if (require.main === module) {
  console.log('🔧 Adding database constraints to prevent invitation corruption...');
  console.log('');
  
  addDatabaseConstraints();
}

module.exports = { addDatabaseConstraints };