const { Pool } = require('pg');

// Use Heroku PostgreSQL connection string
const DATABASE_URL = process.env.DATABASE_URL || 'postgres://u4a6su3t5n0fn6:p5f4a04c5bab918014522e2eeb051dfb5c13f62872bf11e829c1ef3168d21c637@cfcojm7sp9tfip.cluster-czz5s0kz4scl.eu-west-1.rds.amazonaws.com:5432/d9qg97gb6fqhoe';

const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function cleanupEmmaJohnsonDuplication() {
    const client = await pool.connect();
    try {
        console.log('🔄 Connecting to Heroku PostgreSQL Database...');
        console.log('✅ Connected to Heroku PostgreSQL Database!');

        // First, let's see the current state of Emma Johnson entries
        console.log('\n📋 Current Emma Johnson children:');
        const emmaChildren = await client.query(
            "SELECT c.id, c.name, c.parent_id, u.username, u.email FROM children c JOIN users u ON c.parent_id = u.id WHERE c.name = 'Emma Johnson' ORDER BY c.id"
        );
        
        emmaChildren.rows.forEach(child => {
            console.log(`- Child ID: ${child.id}, Parent: ${child.username} (${child.email}), Parent ID: ${child.parent_id}`);
        });

        // Check activities for each Emma Johnson
        console.log('\n🎯 Activities for each Emma Johnson:');
        for (const child of emmaChildren.rows) {
            const activities = await client.query('SELECT COUNT(*) as count FROM activities WHERE child_id = $1', [child.id]);
            const invitations = await client.query('SELECT COUNT(*) as count FROM activity_invitations ai JOIN activities a ON ai.activity_id = a.id WHERE a.child_id = $1', [child.id]);
            console.log(`- ${child.username}'s Emma (ID: ${child.id}): ${activities.rows[0].count} activities, ${invitations.rows[0].count} invitations`);
        }

        // We want to keep the Emma Johnson that has invitations (child ID 36, admin user)
        // and remove the duplicate Emma Johnson (child ID 34, testuser)
        
        const emmaWithInvitations = emmaChildren.rows.find(child => child.email === 'admin@parentactivityapp.com');
        const emmaWithoutInvitations = emmaChildren.rows.find(child => child.email === 'testuser@example.com');
        
        if (!emmaWithInvitations || !emmaWithoutInvitations) {
            console.log('❌ Could not find both Emma Johnson entries as expected');
            return;
        }

        console.log(`\n🎯 Keeping Emma Johnson with invitations: Child ID ${emmaWithInvitations.id} (${emmaWithInvitations.email})`);
        console.log(`🗑️  Removing duplicate Emma Johnson: Child ID ${emmaWithoutInvitations.id} (${emmaWithoutInvitations.email})`);

        // Start transaction
        await client.query('BEGIN');

        try {
            // Delete activities for the duplicate Emma (this will cascade delete any related invitations)
            const deleteActivities = await client.query('DELETE FROM activities WHERE child_id = $1', [emmaWithoutInvitations.id]);
            console.log(`✅ Deleted ${deleteActivities.rowCount} activities for duplicate Emma`);

            // Delete the duplicate child
            const deleteChild = await client.query('DELETE FROM children WHERE id = $1', [emmaWithoutInvitations.id]);
            console.log(`✅ Deleted duplicate Emma Johnson child (ID: ${emmaWithoutInvitations.id})`);

            // Now let's update the admin user to have a proper demo password
            // First check if admin user has a proper password hash
            const adminUser = await client.query('SELECT id, username, email, password_hash FROM users WHERE email = $1', ['admin@parentactivityapp.com']);
            console.log(`\n👤 Admin user details: ${adminUser.rows[0].username} (${adminUser.rows[0].email})`);
            
            // Set a simple password for demo purposes (in production, this should be properly hashed)
            const bcrypt = require('bcrypt');
            const demoPassword = 'demo123';
            const hashedPassword = await bcrypt.hash(demoPassword, 10);
            
            await client.query('UPDATE users SET password_hash = $1 WHERE email = $2', [hashedPassword, 'admin@parentactivityapp.com']);
            console.log(`✅ Updated admin user password for demo (password: ${demoPassword})`);

            // Commit transaction
            await client.query('COMMIT');
            console.log('✅ Transaction committed successfully');

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }

        // Final verification
        console.log('\n🎉 Cleanup complete! Verifying final state:');
        
        const finalEmmaChildren = await client.query(
            "SELECT c.id, c.name, c.parent_id, u.username, u.email FROM children c JOIN users u ON c.parent_id = u.id WHERE c.name = 'Emma Johnson'"
        );
        
        console.log('📋 Remaining Emma Johnson children:');
        for (const child of finalEmmaChildren.rows) {
            const activities = await client.query('SELECT COUNT(*) as count FROM activities WHERE child_id = $1', [child.id]);
            const invitations = await client.query('SELECT COUNT(*) as count FROM activity_invitations ai JOIN activities a ON ai.activity_id = a.id WHERE a.child_id = $1', [child.id]);
            console.log(`- ${child.username}'s Emma (ID: ${child.id}): ${activities.rows[0].count} activities, ${invitations.rows[0].count} invitations`);
        }

        console.log('\n🎯 Demo Login Credentials:');
        console.log('- Email: admin@parentactivityapp.com');
        console.log('- Password: demo123');
        console.log('- Child: Emma Johnson (with color-coded activities!)');
        
        console.log('\n🎨 Expected Activity Colors:');
        console.log('- 🔵 Dark Blue: Soccer Practice, Piano Lessons, Swimming Lessons (private)');
        console.log('- 🔷 Light Blue: Art Class, Dance Class (accepted invitations)');
        console.log('- 🟢 Green: Birthday Party (pending invitation)');
        console.log('- ⚫ Grey: Baseball Game (rejected invitation)');

    } catch (error) {
        console.error('❌ Error during cleanup:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

cleanupEmmaJohnsonDuplication();