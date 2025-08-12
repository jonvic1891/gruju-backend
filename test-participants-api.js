const { Pool } = require('pg');

async function testParticipantsAPI() {
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
    
    console.log('✅ Connected! Testing participants API query...');
    
    // Find an activity to test with
    const activityQuery = 'SELECT id, name FROM activities LIMIT 1';
    const activityResult = await client.query(activityQuery);
    
    if (activityResult.rows.length === 0) {
      console.log('❌ No activities found to test with');
      client.release();
      return;
    }
    
    const testActivity = activityResult.rows[0];
    console.log(`🎯 Testing with activity: "${testActivity.name}" (ID: ${testActivity.id})`);
    
    // Test the host query
    console.log('\n📋 Testing host query...');
    const hostQuery = await client.query(`
      SELECT u.username as host_parent_name, 
             u.id as host_parent_id, 
             c.name as host_child_name,
             c.id as host_child_id,
             a.name as activity_name
      FROM activities a
      INNER JOIN children c ON a.child_id = c.id
      INNER JOIN users u ON c.parent_id = u.id
      WHERE a.id = $1
    `, [testActivity.id]);
    
    if (hostQuery.rows.length > 0) {
      console.log('✅ Host query result:');
      console.log(JSON.stringify(hostQuery.rows[0], null, 2));
    } else {
      console.log('❌ No host found for this activity');
    }
    
    // Test the participants query
    console.log('\n👥 Testing participants query...');
    const participantsQuery = await client.query(`
      SELECT ai.id as invitation_id,
             ai.status,
             ai.message,
             ai.created_at as invited_at,
             ai.updated_at as responded_at,
             ai.viewed_at,
             u.username as parent_name,
             u.id as parent_id,
             c_invited.name as child_name,
             c_invited.id as child_id
      FROM activity_invitations ai
      INNER JOIN users u ON ai.invited_parent_id = u.id
      INNER JOIN children c_invited ON ai.invited_child_id = c_invited.id
      WHERE ai.activity_id = $1
      ORDER BY ai.created_at DESC
    `, [testActivity.id]);
    
    console.log(`📊 Found ${participantsQuery.rows.length} participants`);
    if (participantsQuery.rows.length > 0) {
      participantsQuery.rows.forEach((participant, index) => {
        console.log(`  ${index + 1}. ${participant.child_name} (${participant.status})`);
      });
    }
    
    // Show what the full API response would look like
    const result = {
      host: hostQuery.rows[0] || null,
      participants: participantsQuery.rows || []
    };
    
    console.log('\n🔍 Full API response structure:');
    console.log(JSON.stringify(result, null, 2));
    
    client.release();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

testParticipantsAPI();