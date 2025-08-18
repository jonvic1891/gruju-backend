const { Pool } = require('pg');

// Database configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:mypassword@localhost:5432/parent_activity_app',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function addStatusViewedAtColumn() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking if status_viewed_at column exists...');
    
    // Check if column exists
    const columnCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'activity_invitations' 
      AND column_name = 'status_viewed_at'
    `);
    
    if (columnCheck.rows.length > 0) {
      console.log('✅ status_viewed_at column already exists');
      return;
    }
    
    console.log('📝 Adding status_viewed_at column to activity_invitations table...');
    
    // Add the column
    await client.query(`
      ALTER TABLE activity_invitations 
      ADD COLUMN status_viewed_at TIMESTAMP WITH TIME ZONE
    `);
    
    console.log('✅ Successfully added status_viewed_at column');
    
    // Verify the column was added
    const verifyCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'activity_invitations' 
      AND column_name = 'status_viewed_at'
    `);
    
    if (verifyCheck.rows.length > 0) {
      console.log('✅ Column verified to exist');
    } else {
      console.log('❌ Column was not created successfully');
    }
    
  } catch (error) {
    console.error('❌ Error adding status_viewed_at column:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the migration
addStatusViewedAtColumn()
  .then(() => {
    console.log('🎉 Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  });