const { Pool } = require('pg');

// Use Heroku PostgreSQL connection string
const DATABASE_URL = process.env.DATABASE_URL || 'postgres://u4a6su3t5n0fn6:p5f4a04c5bab918014522e2eeb051dfb5c13f62872bf11e829c1ef3168d21c637@cfcojm7sp9tfip.cluster-czz5s0kz4scl.eu-west-1.rds.amazonaws.com:5432/d9qg97gb6fqhoe';

const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function checkUsers() {
    const client = await pool.connect();
    try {
        console.log('🔄 Connecting to Heroku PostgreSQL Database...');
        console.log('✅ Connected to Heroku PostgreSQL Database!');

        // Check users
        const users = await client.query('SELECT id, username, email FROM users ORDER BY id');
        console.log('👤 Users in database:');
        users.rows.forEach(user => {
            console.log(`- ID: ${user.id}, Username: ${user.username}, Email: ${user.email}`);
        });

        // Check children
        const children = await client.query('SELECT id, name, parent_id FROM children ORDER BY id');
        console.log('\n👶 Children in database:');
        children.rows.forEach(child => {
            console.log(`- ID: ${child.id}, Name: ${child.name}, Parent ID: ${child.parent_id}`);
        });

        // Check activity invitations
        const invitations = await client.query('SELECT * FROM activity_invitations ORDER BY id');
        console.log('\n📧 Activity invitations in database:');
        invitations.rows.forEach(invitation => {
            console.log(`- ID: ${invitation.id}, Activity: ${invitation.activity_id}, Status: ${invitation.status}, Inviter: ${invitation.inviter_parent_id}, Invited: ${invitation.invited_parent_id}`);
        });

        // Check which user ID corresponds to which child
        console.log('\n🔗 User-Child relationships:');
        for (const child of children.rows) {
            const parent = users.rows.find(u => u.id === child.parent_id);
            if (parent) {
                console.log(`- Child "${child.name}" belongs to User "${parent.username}" (${parent.email})`);
            }
        }

    } catch (error) {
        console.error('❌ Error checking users:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

checkUsers();