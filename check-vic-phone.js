const { Pool } = require('pg');

const DATABASE_URL = 'postgres://u4a6su3t5n0fn6:p5f4a04c5bab918014522e2eeb051dfb5c13f62872bf11e829c1ef3168d21c637@cfcojm7sp9tfip.cluster-czz5s0kz4scl.eu-west-1.rds.amazonaws.com:5432/d9qg97gb6fqhoe';

async function checkVicPhone() {
    const pool = new Pool({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    
    try {
        const client = await pool.connect();
        
        const result = await client.query(`
            SELECT email, phone FROM users WHERE LOWER(email) = LOWER('vic@example.com')
        `);
        
        console.log('Victoria user:', result.rows[0]);
        
        client.release();
        
    } catch (error) {
        console.error('Error:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

checkVicPhone();