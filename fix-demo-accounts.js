const { Pool } = require('pg');
const bcrypt = require('bcrypt');

// Use Heroku PostgreSQL connection string
const DATABASE_URL = process.env.DATABASE_URL || 'postgres://u4a6su3t5n0fn6:p5f4a04c5bab918014522e2eeb051dfb5c13f62872bf11e829c1ef3168d21c637@cfcojm7sp9tfip.cluster-czz5s0kz4scl.eu-west-1.rds.amazonaws.com:5432/d9qg97gb6fqhoe';

const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function fixDemoAccounts() {
    const client = await pool.connect();
    try {
        console.log('🔄 Connecting to Heroku PostgreSQL Database...');
        console.log('✅ Connected to Heroku PostgreSQL Database!');

        // Get all users in the system
        const users = await client.query('SELECT id, username, email FROM users ORDER BY id');
        console.log('\n👤 Current users in database:');
        users.rows.forEach(user => {
            console.log(`- ID: ${user.id}, Username: ${user.username}, Email: ${user.email}`);
        });

        // Set up demo password
        const demoPassword = 'demo123';
        const hashedPassword = await bcrypt.hash(demoPassword, 10);
        
        console.log(`\n🔑 Setting up consistent demo password: ${demoPassword}`);

        // Define demo accounts with proper family setups
        const demoAccounts = [
            {
                username: 'admin',
                email: 'admin@parentactivityapp.com',
                family_name: 'Admin Family',
                role: 'super_admin'
            },
            {
                username: 'johnson',
                email: 'johnson@example.com',
                family_name: 'Johnson Family',
                role: 'user'
            },
            {
                username: 'davis',
                email: 'davis@example.com',
                family_name: 'Davis Family',
                role: 'user'
            },
            {
                username: 'wong',
                email: 'wong@example.com',
                family_name: 'Wong Family',
                role: 'user'
            },
            {
                username: 'thompson',
                email: 'thompson@example.com',
                family_name: 'Thompson Family',
                role: 'user'
            },
            {
                username: 'miller',
                email: 'joe@example.com',
                family_name: 'Miller Family',
                role: 'user'
            }
        ];

        console.log('\n🔧 Updating demo accounts...');

        for (const account of demoAccounts) {
            try {
                const result = await client.query(`
                    UPDATE users 
                    SET password_hash = $1, family_name = $2, role = $3
                    WHERE email = $4
                    RETURNING id, username, email
                `, [hashedPassword, account.family_name, account.role, account.email]);

                if (result.rows.length > 0) {
                    console.log(`✅ Updated ${account.username} (${account.email}) - ${account.family_name}`);
                } else {
                    console.log(`⚠️  User not found: ${account.email}`);
                }
            } catch (error) {
                console.error(`❌ Error updating ${account.email}:`, error.message);
            }
        }

        // Check children for each family
        console.log('\n👶 Checking children for each family:');
        for (const account of demoAccounts) {
            const userResult = await client.query('SELECT id FROM users WHERE email = $1', [account.email]);
            if (userResult.rows.length > 0) {
                const userId = userResult.rows[0].id;
                const childrenResult = await client.query('SELECT id, name FROM children WHERE parent_id = $1', [userId]);
                
                console.log(`- ${account.family_name}: ${childrenResult.rows.length} children`);
                childrenResult.rows.forEach(child => {
                    console.log(`  └── ${child.name} (ID: ${child.id})`);
                });
            }
        }

        // Add some sample children for families that don't have any
        console.log('\n👶 Adding sample children for families without children...');
        
        const sampleChildren = [
            { family: 'davis@example.com', children: ['Jake Davis', 'Mia Davis'] },
            { family: 'wong@example.com', children: ['Ryan Wong', 'Zoe Wong'] },
            { family: 'thompson@example.com', children: ['Sophie Thompson', 'Oliver Thompson'] },
            { family: 'joe@example.com', children: ['Theodore Miller'] }
        ];

        for (const family of sampleChildren) {
            const userResult = await client.query('SELECT id FROM users WHERE email = $1', [family.family]);
            if (userResult.rows.length > 0) {
                const userId = userResult.rows[0].id;
                
                for (const childName of family.children) {
                    // Check if child already exists
                    const existingChild = await client.query(
                        'SELECT id FROM children WHERE parent_id = $1 AND name = $2', 
                        [userId, childName]
                    );
                    
                    if (existingChild.rows.length === 0) {
                        const childResult = await client.query(`
                            INSERT INTO children (name, parent_id)
                            VALUES ($1, $2)
                            RETURNING id
                        `, [childName, userId]);
                        
                        console.log(`✅ Added child: ${childName} for ${family.family}`);
                    } else {
                        console.log(`📋 Child already exists: ${childName} for ${family.family}`);
                    }
                }
            }
        }

        console.log('\n🎉 Demo accounts setup complete!');
        console.log('\n📋 Demo Account Login Credentials (All use password: demo123):');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        for (const account of demoAccounts) {
            const userResult = await client.query('SELECT id FROM users WHERE email = $1', [account.email]);
            if (userResult.rows.length > 0) {
                const userId = userResult.rows[0].id;
                const childrenResult = await client.query('SELECT name FROM children WHERE parent_id = $1', [userId]);
                const childNames = childrenResult.rows.map(child => child.name).join(', ');
                
                console.log(`👨‍👩‍👧‍👦 ${account.family_name}`);
                console.log(`   📧 Email: ${account.email}`);
                console.log(`   🔑 Password: demo123`);
                console.log(`   👶 Children: ${childNames || 'None'}`);
                console.log('');
            }
        }

        console.log('🌐 Login at: https://gruju-parent-activity-app.web.app');
        console.log('🎯 All accounts now have the same password: demo123');

    } catch (error) {
        console.error('❌ Error fixing demo accounts:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

fixDemoAccounts();