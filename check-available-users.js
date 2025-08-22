const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || 'postgres://u4a6su3t5n0fn6:p5f4a04c5bab918014522e2eeb051dfb5c13f62872bf11e829c1ef3168d21c637@cfcojm7sp9tfip.cluster-czz5s0kz4scl.eu-west-1.rds.amazonaws.com:5432/d9qg97gb6fqhoe';

const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkUsers() {
    const client = await pool.connect();
    
    try {
        const result = await client.query('SELECT email, username FROM users ORDER BY email LIMIT 10');
        console.log('📋 Available users:');
        result.rows.forEach(user => {
            console.log(`  - ${user.email} (${user.username})`);
        });
        
        // Also check for roberts14 specifically
        const roberts14 = await client.query('SELECT email, username FROM users WHERE email LIKE $1', ['roberts14%']);
        console.log('\n📋 Roberts14 users:');
        roberts14.rows.forEach(user => {
            console.log(`  - ${user.email} (${user.username})`);
        });
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

checkUsers().catch(console.error);