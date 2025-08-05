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

async function debugLogin() {
    const client = await pool.connect();
    try {
        console.log('🔍 Debugging login issues...');

        // Check what's actually in the database
        const users = await client.query(`
            SELECT id, username, email, password_hash, 
                   SUBSTRING(password_hash, 1, 20) as hash_preview
            FROM users 
            ORDER BY id
        `);

        console.log('\n📋 Current user password hashes:');
        users.rows.forEach(user => {
            console.log(`- ${user.username} (${user.email})`);
            console.log(`  Hash: ${user.hash_preview}...`);
            console.log(`  Full length: ${user.password_hash?.length || 0} chars`);
        });

        // Test password comparison for one user
        console.log('\n🔍 Testing password comparison...');
        const testUser = users.rows.find(u => u.email === 'admin@parentactivityapp.com');
        if (testUser) {
            console.log(`Testing admin user password hash: ${testUser.password_hash.substring(0, 30)}...`);
            
            try {
                // Test the hardcoded demo123 check
                const hardcodedCheck = 'demo123' === 'demo123';
                console.log(`Hardcoded check (demo123 === demo123): ${hardcodedCheck}`);
                
                // Test bcrypt compare
                const bcryptCheck = await bcrypt.compare('demo123', testUser.password_hash);
                console.log(`Bcrypt check (bcrypt.compare('demo123', hash)): ${bcryptCheck}`);
                
                // Test what the backend logic would return
                const backendLogic = 'demo123' === 'demo123' || bcryptCheck;
                console.log(`Backend logic result: ${backendLogic}`);
                
            } catch (error) {
                console.error('❌ Error testing password:', error.message);
            }
        }

        // Test actual API call
        console.log('\n🌐 Testing actual API call...');
        const axios = require('axios');
        
        try {
            const response = await axios.post('https://gruju-backend-5014424c95f2.herokuapp.com/api/auth/login', {
                email: 'admin@parentactivityapp.com',
                password: 'demo123'
            });
            console.log('✅ API login successful:', response.data.success);
            console.log('Token length:', response.data.token?.length || 0);
        } catch (error) {
            console.log('❌ API login failed:', error.response?.data?.error || error.message);
            console.log('Status:', error.response?.status);
        }

    } catch (error) {
        console.error('❌ Error during debug:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

debugLogin();