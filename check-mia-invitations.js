const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkMiaInvitations() {
  try {
    const client = await pool.connect();
    
    // Find Mia's user ID - try different approaches
    console.log('🔍 Searching for Mia user...');
    
    // First try exact searches
    const miaResult1 = await client.query(`
      SELECT id, username, email 
      FROM parents 
      WHERE username ILIKE '%wong%' OR username ILIKE '%mia%' OR email ILIKE '%wong%' OR email ILIKE '%mia%'
    `);
    
    // Also try users table (legacy)
    const miaResult2 = await client.query(`
      SELECT id, username, email 
      FROM users 
      WHERE username ILIKE '%wong%' OR username ILIKE '%mia%' OR email ILIKE '%wong%' OR email ILIKE '%mia%'
    `);
    
    console.log('Parents table results:', miaResult1.rows);
    console.log('Users table results:', miaResult2.rows);
    
    const allMiaResults = [...miaResult1.rows, ...miaResult2.rows];
    console.log('All Mia users found:', allMiaResults);
    
    if (allMiaResults.length === 0) {
      console.log('❌ No Mia user found');
      return;
    }
    
    const miaUserId = allMiaResults[0].id;
    console.log(`\n📧 Checking invitations for Mia (User ID: ${miaUserId})`);
    
    // Check ALL invitations for Mia (recent activities)
    const invitationsResult = await client.query(`
      SELECT ai.id, ai.status, a.name as activity_name, a.start_date,
             inviter.username as from_user, invited.username as to_user,
             ai.created_at
      FROM activity_invitations ai
      JOIN activities a ON ai.activity_id = a.id
      JOIN parents inviter ON ai.inviter_parent_id = inviter.id
      JOIN parents invited ON ai.invited_parent_id = invited.id
      WHERE ai.invited_parent_id = $1
      ORDER BY ai.created_at DESC, a.start_date
      LIMIT 20
    `, [miaUserId]);
    
    console.log(`\nFound ${invitationsResult.rows.length} invitations for Mia:`);
    invitationsResult.rows.forEach((row, index) => {
      console.log(`  ${index + 1}. "${row.activity_name}" on ${row.start_date.toDateString()}`);
      console.log(`      From: ${row.from_user}, Status: ${row.status}`);
      console.log(`      Created: ${row.created_at}`);
      console.log('');
    });
    
    // Group by activity name to see recurring patterns
    const byActivityName = {};
    invitationsResult.rows.forEach(row => {
      if (!byActivityName[row.activity_name]) {
        byActivityName[row.activity_name] = [];
      }
      byActivityName[row.activity_name].push(row);
    });
    
    console.log('\n📊 INVITATIONS GROUPED BY ACTIVITY NAME:');
    Object.keys(byActivityName).forEach(activityName => {
      const invitations = byActivityName[activityName];
      console.log(`  "${activityName}": ${invitations.length} invitation${invitations.length > 1 ? 's' : ''}`);
      if (invitations.length > 1) {
        invitations.forEach(inv => {
          console.log(`    - ${inv.start_date.toDateString()} (${inv.status})`);
        });
      }
    });
    
    client.release();
    await pool.end();
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkMiaInvitations();