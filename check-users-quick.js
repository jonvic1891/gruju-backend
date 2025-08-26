const { Pool } = require('pg');

const DATABASE_URL = 'postgres://u4a6su3t5n0fn6:p5f4a04c5bab918014522e2eeb051dfb5c13f62872bf11e829c1ef3168d21c637@cfcojm7sp9tfip.cluster-czz5s0kz4scl.eu-west-1.rds.amazonaws.com:5432/d9qg97gb6fqhoe';

async function checkUsers() {
    const pool = new Pool({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    
    try {
        const client = await pool.connect();
        
        // Get a few test users
        const result = await client.query(`
            SELECT email, username, created_at 
            FROM users 
            WHERE email LIKE '%example.com%'
            ORDER BY created_at DESC
            LIMIT 5
        `);
        
        console.log('Available test users:');
        result.rows.forEach((user, i) => {
            console.log(`${i+1}. ${user.email} (${user.username})`);
        });
        
        client.release();
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await pool.end();
    }
}

checkUsers();