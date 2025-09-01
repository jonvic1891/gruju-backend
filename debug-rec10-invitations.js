const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function debugRec10Invitations() {
  try {
    const client = await pool.connect();
    
    console.log('🔍 DEBUGGING rec10 INVITATIONS');
    console.log('='.repeat(50));
    
    // 1. Check all rec10 activities
    console.log('\n1. All rec10 activities:');
    const activitiesResult = await client.query(`
      SELECT a.id, a.uuid, a.name, a.start_date, c.name as child_name, p.username as parent_name
      FROM activities a 
      JOIN children c ON a.child_id = c.id 
      JOIN parents p ON c.parent_id = p.id
      WHERE a.name LIKE 'rec10%' 
      ORDER BY a.start_date
    `);
    
    activitiesResult.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. Activity ID: ${row.id}, UUID: ${row.uuid}`);
      console.log(`      Name: "${row.name}"`);
      console.log(`      Date: ${row.start_date}`);
      console.log(`      Host: ${row.child_name} (${row.parent_name})`);
      console.log('');
    });
    
    // 2. Check all invitations for rec10 activities
    console.log('\n2. All invitations for rec10 activities:');
    const invitationsResult = await client.query(`
      SELECT ai.id, ai.invitation_uuid, ai.activity_id, a.name as activity_name, a.start_date,
             inviter.username as inviter_name, invited.username as invited_name,
             invited_child.name as invited_child_name, ai.status, ai.created_at
      FROM activity_invitations ai
      JOIN activities a ON ai.activity_id = a.id
      JOIN parents inviter ON ai.inviter_parent_id = inviter.id
      JOIN parents invited ON ai.invited_parent_id = invited.id
      LEFT JOIN children invited_child ON ai.invited_child_id = invited_child.id
      WHERE a.name LIKE 'rec10%'
      ORDER BY a.start_date, ai.created_at
    `);
    
    console.log(`Found ${invitationsResult.rows.length} invitations for rec10 activities:`);
    invitationsResult.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. Invitation ID: ${row.id}, UUID: ${row.invitation_uuid || 'NULL'}`);
      console.log(`      Activity: "${row.activity_name}" on ${row.start_date}`);
      console.log(`      From: ${row.inviter_name} → To: ${row.invited_name} (child: ${row.invited_child_name || 'unspecified'})`);
      console.log(`      Status: ${row.status}, Created: ${row.created_at}`);
      console.log('');
    });
    
    // 3. Check Mia Wong's invitations specifically
    console.log('\n3. Mia Wong\'s pending invitations:');
    const miaInvitationsResult = await client.query(`
      SELECT ai.id, ai.invitation_uuid, a.name as activity_name, a.start_date,
             inviter.username as inviter_name, invited_child.name as invited_child_name, ai.status
      FROM activity_invitations ai
      JOIN activities a ON ai.activity_id = a.id
      JOIN parents inviter ON ai.inviter_parent_id = inviter.id
      JOIN parents invited ON ai.invited_parent_id = invited.id
      LEFT JOIN children invited_child ON ai.invited_child_id = invited_child.id
      WHERE invited.username LIKE '%mia%' OR invited.email LIKE '%mia%'
      ORDER BY a.start_date DESC, ai.created_at DESC
      LIMIT 20
    `);
    
    console.log(`Found ${miaInvitationsResult.rows.length} recent invitations for Mia Wong:`);
    miaInvitationsResult.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. "${row.activity_name}" on ${row.start_date}`);
      console.log(`      From: ${row.inviter_name}, Status: ${row.status}`);
      console.log(`      Invited child: ${row.invited_child_name || 'unspecified'}`);
      console.log('');
    });
    
    client.release();
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

debugRec10Invitations();