const { Pool } = require('pg');

async function cleanupCorruptInvitations() {
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
    
    console.log('✅ Connected! Starting cleanup...');
    
    // First, get count of corrupted invitations
    const countQuery = 'SELECT COUNT(*) as count FROM activity_invitations WHERE invited_child_id IS NULL';
    const countResult = await client.query(countQuery);
    const corruptCount = parseInt(countResult.rows[0].count);
    
    console.log(`🚨 Found ${corruptCount} corrupted invitations with NULL invited_child_id`);
    
    if (corruptCount === 0) {
      console.log('✅ No corrupted invitations found. Database is clean!');
      client.release();
      return;
    }
    
    // Get the IDs that will be deleted for logging
    const idsQuery = 'SELECT id FROM activity_invitations WHERE invited_child_id IS NULL ORDER BY id';
    const idsResult = await client.query(idsQuery);
    const corruptIds = idsResult.rows.map(row => row.id);
    
    console.log(`🗑️ About to delete invitation IDs: ${corruptIds.join(', ')}`);
    
    // Ask for confirmation (in a real scenario, you might want manual confirmation)
    console.log('⚠️ PROCEEDING WITH DELETION...');
    
    // Delete all corrupted invitations
    const deleteQuery = 'DELETE FROM activity_invitations WHERE invited_child_id IS NULL';
    const deleteResult = await client.query(deleteQuery);
    
    console.log(`✅ Successfully deleted ${deleteResult.rowCount} corrupted invitations`);
    
    // Verify cleanup
    const verifyResult = await client.query(countQuery);
    const remainingCorrupt = parseInt(verifyResult.rows[0].count);
    
    if (remainingCorrupt === 0) {
      console.log('🎉 Cleanup successful! No more corrupted invitations.');
    } else {
      console.log(`⚠️ Warning: ${remainingCorrupt} corrupted invitations still remain.`);
    }
    
    // Get final count
    const finalCountQuery = 'SELECT COUNT(*) as count FROM activity_invitations';
    const finalCountResult = await client.query(finalCountQuery);
    const finalCount = parseInt(finalCountResult.rows[0].count);
    
    console.log(`📊 Final invitation count: ${finalCount} (was ${finalCount + deleteResult.rowCount})`);
    
    client.release();
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error.message);
  } finally {
    await pool.end();
  }
}

// Only run cleanup if called directly
if (require.main === module) {
  console.log('🧹 Starting corrupted invitation cleanup...');
  console.log('⚠️ This will DELETE all invitations with NULL invited_child_id');
  console.log('');
  
  cleanupCorruptInvitations();
}

module.exports = { cleanupCorruptInvitations };