const { Pool } = require('pg');

async function findCorruptInvitations() {
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
    
    console.log('✅ Connected! Looking for corrupted invitations...');
    
    // Find all invitations with NULL invited_child_id
    const corruptQuery = `
      SELECT ai.id as invitation_id,
             ai.invited_parent_id,
             ai.invited_child_id, 
             ai.inviter_parent_id,
             ai.activity_id,
             ai.message,
             ai.status,
             ai.created_at,
             u.email as invited_parent_email,
             u.username as invited_parent_username,
             inviter.email as inviter_email,
             inviter.username as inviter_username,
             a.name as activity_name
      FROM activity_invitations ai 
      JOIN users u ON ai.invited_parent_id = u.id 
      LEFT JOIN users inviter ON ai.inviter_parent_id = inviter.id
      LEFT JOIN activities a ON ai.activity_id = a.id
      WHERE ai.invited_child_id IS NULL
      ORDER BY ai.created_at DESC
    `;
    
    const corruptResult = await client.query(corruptQuery);
    
    console.log(`\n🚨 Found ${corruptResult.rows.length} corrupted invitations with NULL invited_child_id:`);
    
    if (corruptResult.rows.length > 0) {
      corruptResult.rows.forEach((inv, index) => {
        console.log(`\n${index + 1}. Invitation ID: ${inv.invitation_id}`);
        console.log(`   - Activity: ${inv.activity_name} (ID: ${inv.activity_id})`);
        console.log(`   - Inviter: ${inv.inviter_username} (${inv.inviter_email})`);
        console.log(`   - Invited: ${inv.invited_parent_username} (${inv.invited_parent_email})`);
        console.log(`   - Child ID: ${inv.invited_child_id} (NULL!)`);
        console.log(`   - Status: ${inv.status}`);
        console.log(`   - Created: ${inv.created_at}`);
        console.log(`   - Message: ${inv.message}`);
      });
      
      console.log(`\n🧹 These ${corruptResult.rows.length} invitations should be deleted.`);
    }
    
    // Also check for invitations where the child exists but doesn't belong to the invited parent
    console.log('\n🔍 Checking for invitations with mismatched child ownership...');
    
    const mismatchQuery = `
      SELECT ai.id as invitation_id,
             ai.invited_parent_id,
             ai.invited_child_id,
             ai.activity_id,
             u.username as invited_parent_username,
             u.email as invited_parent_email,
             c.name as child_name,
             c.parent_id as child_actual_parent_id,
             actual_parent.username as child_actual_parent_username
      FROM activity_invitations ai
      JOIN users u ON ai.invited_parent_id = u.id
      JOIN children c ON ai.invited_child_id = c.id
      JOIN users actual_parent ON c.parent_id = actual_parent.id
      WHERE ai.invited_child_id IS NOT NULL 
        AND c.parent_id != ai.invited_parent_id
      ORDER BY ai.created_at DESC
    `;
    
    const mismatchResult = await client.query(mismatchQuery);
    
    console.log(`\n⚠️ Found ${mismatchResult.rows.length} invitations with mismatched child ownership:`);
    
    if (mismatchResult.rows.length > 0) {
      mismatchResult.rows.forEach((inv, index) => {
        console.log(`\n${index + 1}. Invitation ID: ${inv.invitation_id}`);
        console.log(`   - Invited Parent: ${inv.invited_parent_username} (${inv.invited_parent_email})`);
        console.log(`   - Child: ${inv.child_name} (ID: ${inv.invited_child_id})`);
        console.log(`   - Child Actually Belongs To: ${inv.child_actual_parent_username} (ID: ${inv.child_actual_parent_id})`);
      });
    }
    
    // Get total count of all invitations for context
    const totalQuery = 'SELECT COUNT(*) as total FROM activity_invitations';
    const totalResult = await client.query(totalQuery);
    console.log(`\n📊 Total invitations in database: ${totalResult.rows[0].total}`);
    
    client.release();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

findCorruptInvitations();