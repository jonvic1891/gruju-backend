const { Pool } = require('pg');

// Test database connectivity and check invitations
async function checkInvitationsInDatabase() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    });

    try {
        const client = await pool.connect();
        console.log('🔍 Connected to database successfully');

        // Check users
        console.log('\n👥 USERS:');
        const users = await client.query('SELECT id, email, family_name FROM users ORDER BY id');
        users.rows.forEach(user => {
            console.log(`   ${user.id}: ${user.email} (${user.family_name})`);
        });

        // Check children
        console.log('\n👶 CHILDREN:');
        const children = await client.query('SELECT id, name, parent_id FROM children ORDER BY id');
        children.rows.forEach(child => {
            const parent = users.rows.find(u => u.id === child.parent_id);
            console.log(`   ${child.id}: ${child.name} (parent: ${parent?.email})`);
        });

        // Check activities
        console.log('\n⚽ ACTIVITIES:');
        const activities = await client.query(`
            SELECT a.id, a.name, a.start_date, a.end_date, c.name as child_name, u.email as parent_email
            FROM activities a 
            JOIN children c ON a.child_id = c.id 
            JOIN users u ON c.parent_id = u.id 
            ORDER BY a.start_date
        `);
        activities.rows.forEach(activity => {
            console.log(`   ${activity.id}: ${activity.name} on ${activity.start_date} (${activity.child_name} - ${activity.parent_email})`);
        });

        // Check activity invitations
        console.log('\n📩 ACTIVITY INVITATIONS:');
        const invitations = await client.query(`
            SELECT ai.id, ai.status, ai.message, 
                   a.name as activity_name, a.start_date,
                   u_inviter.email as inviter_email, 
                   u_invited.email as invited_email,
                   c_invited.name as invited_child_name
            FROM activity_invitations ai
            JOIN activities a ON ai.activity_id = a.id
            JOIN users u_inviter ON ai.inviter_parent_id = u_inviter.id
            JOIN users u_invited ON ai.invited_parent_id = u_invited.id
            LEFT JOIN children c_invited ON ai.child_id = c_invited.id
            ORDER BY ai.created_at DESC
        `);
        
        if (invitations.rows.length === 0) {
            console.log('   ❌ NO INVITATIONS FOUND IN DATABASE!');
        } else {
            invitations.rows.forEach((inv, index) => {
                console.log(`   ${index + 1}. ${inv.activity_name} (${inv.start_date})`);
                console.log(`      From: ${inv.inviter_email} → To: ${inv.invited_email}`);
                console.log(`      Child: ${inv.invited_child_name}, Status: ${inv.status}`);
                console.log(`      Message: "${inv.message}"`);
                console.log('');
            });
        }

        client.release();
        await pool.end();
        
    } catch (error) {
        console.error('❌ Database error:', error.message);
    }
}

// Run if called directly
if (require.main === module) {
    checkInvitationsInDatabase();
}

module.exports = { checkInvitationsInDatabase };