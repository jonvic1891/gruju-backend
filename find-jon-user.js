const { Pool } = require('pg');

const DATABASE_URL = 'postgres://u4a6su3t5n0fn6:p5f4a04c5bab918014522e2eeb051dfb5c13f62872bf11e829c1ef3168d21c637@cfcojm7sp9tfip.cluster-czz5s0kz4scl.eu-west-1.rds.amazonaws.com:5432/d9qg97gb6fqhoe';

async function findJonUser() {
    const pool = new Pool({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    
    try {
        const client = await pool.connect();
        
        console.log('🔍 Searching for Jon user by email...');
        
        // Search for any user with Jon@example.com
        const userByEmail = await client.query(`
            SELECT id, uuid, username, email, password_hash IS NOT NULL as has_password, created_at
            FROM users WHERE email = $1
        `, ['Jon@example.com']);
        
        if (userByEmail.rows.length > 0) {
            const user = userByEmail.rows[0];
            console.log('✅ Found user record:');
            console.log(`   ID: ${user.id}, UUID: ${user.uuid}`);
            console.log(`   Username: ${user.username}, Email: ${user.email}`);
            console.log(`   Has Password: ${user.has_password}`);
            console.log(`   Created: ${user.created_at}`);
            
            // Check if there's a parent record for this user UUID
            const parentRecord = await client.query(`
                SELECT * FROM parents WHERE uuid = $1
            `, [user.uuid]);
            
            if (parentRecord.rows.length > 0) {
                const parent = parentRecord.rows[0];
                console.log('\n✅ Found corresponding parent record:');
                console.log(`   Parent UUID: ${parent.uuid}`);
                console.log(`   Account UUID: ${parent.account_uuid}`);
                console.log(`   Is Primary: ${parent.is_primary}`);
                console.log(`   Email in parents table: ${parent.email}`);
                console.log(`   Username in parents table: ${parent.username}`);
            } else {
                console.log('\n❌ No parent record found for this user UUID');
            }
        } else {
            console.log('❌ No user found with email Jon@example.com');
        }
        
        // Also search case-insensitive
        console.log('\n🔍 Searching case-insensitive...');
        const userCaseInsensitive = await client.query(`
            SELECT id, uuid, username, email, password_hash IS NOT NULL as has_password, created_at
            FROM users WHERE LOWER(email) = LOWER($1)
        `, ['jon@example.com']);
        
        if (userCaseInsensitive.rows.length > 0) {
            console.log(`✅ Found ${userCaseInsensitive.rows.length} users (case-insensitive):`);
            userCaseInsensitive.rows.forEach((user, i) => {
                console.log(`   ${i+1}. ${user.username} (${user.email}) - UUID: ${user.uuid}, Has Password: ${user.has_password}`);
            });
        } else {
            console.log('❌ No users found (case-insensitive search)');
        }
        
        client.release();
    } catch (error) {
        console.error('❌ Error:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

findJonUser();