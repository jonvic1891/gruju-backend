const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const DATABASE_URL = 'postgres://u4a6su3t5n0fn6:p5f4a04c5bab918014522e2eeb051dfb5c13f62872bf11e829c1ef3168d21c637@cfcojm7sp9tfip.cluster-czz5s0kz4scl.eu-west-1.rds.amazonaws.com:5432/d9qg97gb6fqhoe';

async function createJonUser() {
    const pool = new Pool({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    
    try {
        const client = await pool.connect();
        
        console.log('🔧 Creating missing user record for additional parent Jon...');
        
        // First get the existing parent record
        const parentRecord = await client.query(`
            SELECT * FROM parents WHERE email = $1 AND is_primary = false
        `, ['Jon@example.com']);
        
        if (parentRecord.rows.length === 0) {
            console.log('❌ Additional parent record not found');
            return;
        }
        
        const parent = parentRecord.rows[0];
        console.log(`📋 Found parent record:`);
        console.log(`   UUID: ${parent.uuid}`);
        console.log(`   Email: ${parent.email}`);
        console.log(`   Username: ${parent.username}`);
        console.log(`   Account UUID: ${parent.account_uuid}`);
        
        // Check if user already exists
        const existingUser = await client.query(`
            SELECT uuid FROM users WHERE uuid = $1
        `, [parent.uuid]);
        
        if (existingUser.rows.length > 0) {
            console.log('✅ User record already exists');
            return;
        }
        
        // Create the user record with the same UUID as the parent record
        const password = 'password123'; // Default password for testing
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        
        console.log('🔧 Creating user record...');
        
        await client.query('BEGIN');
        
        try {
            const userResult = await client.query(`
                INSERT INTO users (uuid, username, email, phone, password_hash, role, is_active)
                VALUES ($1, $2, $3, $4, $5, 'user', true)
                RETURNING uuid, username, email
            `, [parent.uuid, parent.username, parent.email, parent.phone, hashedPassword]);
            
            await client.query('COMMIT');
            
            const user = userResult.rows[0];
            console.log('✅ User record created successfully!');
            console.log(`   UUID: ${user.uuid}`);
            console.log(`   Username: ${user.username}`);
            console.log(`   Email: ${user.email}`);
            console.log(`   Password: ${password} (for testing)`);
            
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        
        client.release();
    } catch (error) {
        console.error('❌ Error:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

createJonUser();