const { Pool } = require('pg');

const DATABASE_URL = 'postgres://u4a6su3t5n0fn6:p5f4a04c5bab918014522e2eeb051dfb5c13f62872bf11e829c1ef3168d21c637@cfcojm7sp9tfip.cluster-czz5s0kz4scl.eu-west-1.rds.amazonaws.com:5432/d9qg97gb6fqhoe';

async function migrateUsers() {
    const pool = new Pool({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    
    try {
        const client = await pool.connect();
        
        console.log('🔄 Starting manual migration of users to parents table...');
        
        // First, check current state
        const currentParents = await client.query('SELECT COUNT(*) as count FROM parents');
        console.log(`📊 Current parents table has ${currentParents.rows[0].count} records`);
        
        // Get all users that need to be migrated
        const usersToMigrate = await client.query(`
            SELECT uuid, username, email, phone, created_at, updated_at 
            FROM users 
            WHERE role IN ('user', 'admin', 'super_admin')
            ORDER BY created_at ASC
        `);
        
        console.log(`👥 Found ${usersToMigrate.rows.length} users to migrate`);
        
        // Migrate each user as a primary parent
        for (let i = 0; i < usersToMigrate.rows.length; i++) {
            const user = usersToMigrate.rows[i];
            
            // Check if already exists
            const existingParent = await client.query(
                'SELECT uuid FROM parents WHERE account_uuid = $1',
                [user.uuid]
            );
            
            if (existingParent.rows.length === 0) {
                const insertResult = await client.query(`
                    INSERT INTO parents (account_uuid, username, email, phone, is_primary, role, created_at, updated_at)
                    VALUES ($1, $2, $3, $4, true, 'parent', $5, $6)
                    RETURNING uuid, account_uuid, username
                `, [user.uuid, user.username, user.email, user.phone, user.created_at, user.updated_at]);
                
                console.log(`✅ Migrated: ${user.username} (${user.email}) -> ${insertResult.rows[0].uuid}`);
            } else {
                console.log(`⏭️  Already exists: ${user.username} (${user.email})`);
            }
        }
        
        // Check final state
        const finalParents = await client.query('SELECT COUNT(*) as count FROM parents');
        console.log(`🎉 Migration completed! Parents table now has ${finalParents.rows[0].count} records`);
        
        client.release();
    } catch (error) {
        console.error('❌ Migration error:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

migrateUsers()
    .then(() => {
        console.log('✅ Manual migration completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Manual migration failed:', error);
        process.exit(1);
    });