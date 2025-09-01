const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkInvitations() {
  try {
    const client = await pool.connect();
    
    // Check invitations for rec10
    const result = await client.query(`
      SELECT ai.id, ai.status, a.name, a.start_date, 
             inviter.username as from_user, invited.username as to_user
      FROM activity_invitations ai
      JOIN activities a ON ai.activity_id = a.id
      JOIN parents inviter ON ai.inviter_parent_id = inviter.id
      JOIN parents invited ON ai.invited_parent_id = invited.id
      WHERE a.name = 'rec10'
      ORDER BY a.start_date
    `);
    
    console.log(`Found ${result.rows.length} invitations for rec10:`);
    result.rows.forEach(row => {
      console.log(`  ${row.name} (${row.start_date.toDateString()}) - ${row.from_user} → ${row.to_user} (${row.status})`);
    });
    
    client.release();
    await pool.end();
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkInvitations();