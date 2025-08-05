const { Pool } = require('pg');

// Use Heroku PostgreSQL connection string
const DATABASE_URL = process.env.DATABASE_URL || 'postgres://u4a6su3t5n0fn6:p5f4a04c5bab918014522e2eeb051dfb5c13f62872bf11e829c1ef3168d21c637@cfcojm7sp9tfip.cluster-czz5s0kz4scl.eu-west-1.rds.amazonaws.com:5432/d9qg97gb6fqhoe';

const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function cleanupTestAccounts() {
    const client = await pool.connect();
    try {
        console.log('🔄 Connecting to Heroku PostgreSQL Database...');
        console.log('✅ Connected to Heroku PostgreSQL Database!');

        // Test accounts to remove (these were created during development)
        const testAccounts = [
            'testuser@example.com',
            'testparent@example.com', 
            'testparent2@example.com',
            'testparent3@example.com',
            'manager@parentactivityapp.com' // Remove manager account too
        ];

        console.log('\n🗑️  Cleaning up test accounts...');

        await client.query('BEGIN');

        try {
            for (const email of testAccounts) {
                // Get user ID
                const userResult = await client.query('SELECT id, username FROM users WHERE email = $1', [email]);
                
                if (userResult.rows.length > 0) {
                    const userId = userResult.rows[0].id;
                    const username = userResult.rows[0].username;
                    
                    // Delete activities for children of this user
                    await client.query(`
                        DELETE FROM activities 
                        WHERE child_id IN (SELECT id FROM children WHERE parent_id = $1)
                    `, [userId]);
                    
                    // Delete children
                    const childrenResult = await client.query('DELETE FROM children WHERE parent_id = $1', [userId]);
                    
                    // Delete connection requests
                    await client.query('DELETE FROM connection_requests WHERE requester_id = $1 OR target_parent_id = $1', [userId]);
                    
                    // Delete connections
                    await client.query('DELETE FROM connections WHERE parent1_id = $1 OR parent2_id = $1', [userId]);
                    
                    // Delete activity invitations
                    await client.query('DELETE FROM activity_invitations WHERE inviter_parent_id = $1 OR invited_parent_id = $1', [userId]);
                    
                    // Delete system logs
                    await client.query('DELETE FROM system_logs WHERE user_id = $1', [userId]);
                    
                    // Delete user
                    await client.query('DELETE FROM users WHERE id = $1', [userId]);
                    
                    console.log(`✅ Removed test account: ${username} (${email}) and ${childrenResult.rowCount} children`);
                } else {
                    console.log(`📋 Test account not found: ${email}`);
                }
            }

            await client.query('COMMIT');
            console.log('✅ All test accounts cleaned up successfully');

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }

        // Show final clean user list
        console.log('\n📋 Final clean demo accounts:');
        const finalUsers = await client.query(`
            SELECT u.id, u.username, u.email, u.family_name,
                   COUNT(c.id) as child_count
            FROM users u
            LEFT JOIN children c ON u.id = c.parent_id
            GROUP BY u.id, u.username, u.email, u.family_name
            ORDER BY u.id
        `);

        finalUsers.rows.forEach(user => {
            console.log(`👨‍👩‍👧‍👦 ${user.family_name || user.username}`);
            console.log(`   📧 ${user.email}`);
            console.log(`   👶 ${user.child_count} children`);
            console.log('');
        });

        console.log('🎉 Database is now clean with only demo accounts!');
        console.log('🔑 All accounts use password: demo123');
        console.log('🌐 Login at: https://gruju-parent-activity-app.web.app');

    } catch (error) {
        console.error('❌ Error cleaning up test accounts:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

cleanupTestAccounts();