const { Pool } = require('pg');

async function queryInvitation93() {
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
    
    console.log('✅ Connected! Querying invitation 93...');
    
    // Query invitation details with user info
    const query = `
      SELECT ai.id as invitation_id,
             ai.invited_parent_id,
             ai.invited_child_id, 
             ai.inviter_parent_id,
             ai.message,
             ai.status,
             ai.created_at,
             u.email as invited_parent_email,
             u.username as invited_parent_username,
             u.id as invited_user_id,
             c.name as invited_child_name,
             inviter.email as inviter_email,
             inviter.username as inviter_username
      FROM activity_invitations ai 
      JOIN users u ON ai.invited_parent_id = u.id 
      LEFT JOIN children c ON ai.invited_child_id = c.id
      LEFT JOIN users inviter ON ai.inviter_parent_id = inviter.id
      WHERE ai.id = 93
    `;
    
    const result = await client.query(query);
    
    if (result.rows.length > 0) {
      console.log('\n📋 Invitation 93 Details:');
      console.log(JSON.stringify(result.rows[0], null, 2));
      
      const inv = result.rows[0];
      console.log('\n🎯 Summary:');
      console.log(`- Invitation ID: ${inv.invitation_id}`);
      console.log(`- Invited Parent Email: ${inv.invited_parent_email}`);
      console.log(`- Invited Parent Username: ${inv.invited_parent_username}`);
      console.log(`- Invited Child: ${inv.invited_child_name || 'NULL'}`);
      console.log(`- Inviter Email: ${inv.inviter_email}`);
      console.log(`- Inviter Username: ${inv.inviter_username}`);
      console.log(`- Message: ${inv.message}`);
      console.log(`- Status: ${inv.status}`);
    } else {
      console.log('❌ No invitation found with ID 93');
    }
    
    client.release();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

queryInvitation93();