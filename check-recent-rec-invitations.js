const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkRecentRecInvitations() {
  try {
    const client = await pool.connect();
    
    console.log('🔍 Checking for recent rec10/rec11 invitations...');
    
    // Check ALL invitations for activities with names starting with "rec1"
    const recInvitationsResult = await client.query(`
      SELECT ai.id, ai.status, a.name as activity_name, a.start_date,
             inviter.username as from_user, invited.username as to_user,
             ai.created_at, ai.uuid as invitation_uuid
      FROM activity_invitations ai
      JOIN activities a ON ai.activity_id = a.id
      JOIN parents inviter ON ai.inviter_parent_id = inviter.id
      JOIN parents invited ON ai.invited_parent_id = invited.id
      WHERE a.name LIKE 'rec%'
      ORDER BY ai.created_at DESC, a.start_date
    `);
    
    console.log(`\nFound ${recInvitationsResult.rows.length} invitations for rec1x activities:`);
    recInvitationsResult.rows.forEach((row, index) => {
      console.log(`  ${index + 1}. "${row.activity_name}" on ${row.start_date.toDateString()}`);
      console.log(`      From: ${row.from_user} → To: ${row.to_user}, Status: ${row.status}`);
      console.log(`      Created: ${row.created_at}, UUID: ${row.invitation_uuid}`);
      console.log('');
    });
    
    // Group by activity name to see recurring patterns
    const byActivityName = {};
    recInvitationsResult.rows.forEach(row => {
      if (!byActivityName[row.activity_name]) {
        byActivityName[row.activity_name] = [];
      }
      byActivityName[row.activity_name].push(row);
    });
    
    console.log('\n📊 REC INVITATIONS GROUPED BY ACTIVITY NAME:');
    Object.keys(byActivityName).forEach(activityName => {
      const invitations = byActivityName[activityName];
      console.log(`  "${activityName}": ${invitations.length} invitation${invitations.length > 1 ? 's' : ''}`);
      invitations.forEach(inv => {
        console.log(`    - ${inv.start_date.toDateString()} → ${inv.to_user} (${inv.status})`);
      });
    });
    
    // Also check what recent activities exist
    console.log('\n🎯 Recent activities starting with "rec1":');
    const recentActivitiesResult = await client.query(`
      SELECT a.id, a.name, a.start_date, c.name as child_name, p.username as parent_name
      FROM activities a 
      JOIN children c ON a.child_id = c.id 
      JOIN parents p ON c.parent_id = p.id
      WHERE a.name LIKE 'rec%' 
      ORDER BY a.created_at DESC, a.start_date
    `);
    
    console.log(`Found ${recentActivitiesResult.rows.length} rec1x activities:`);
    recentActivitiesResult.rows.forEach((row, index) => {
      console.log(`  ${index + 1}. "${row.name}" on ${row.start_date.toDateString()}`);
      console.log(`      Host: ${row.child_name} (${row.parent_name})`);
    });
    
    client.release();
    await pool.end();
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkRecentRecInvitations();