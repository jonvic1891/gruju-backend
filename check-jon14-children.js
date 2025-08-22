const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || 'postgres://u4a6su3t5n0fn6:p5f4a04c5bab918014522e2eeb051dfb5c13f62872bf11e829c1ef3168d21c637@cfcojm7sp9tfip.cluster-czz5s0kz4scl.eu-west-1.rds.amazonaws.com:5432/d9qg97gb6fqhoe';

const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkJon14Children() {
    const client = await pool.connect();
    
    try {
        // Find jon 14 user
        const userResult = await client.query("SELECT id, username, email FROM users WHERE username = 'jon 14'");
        console.log('👤 Jon 14 user:', userResult.rows);
        
        if (userResult.rows.length > 0) {
            const userId = userResult.rows[0].id;
            
            // Get their children
            const childrenResult = await client.query('SELECT uuid, name FROM children WHERE parent_id = $1', [userId]);
            console.log('👶 Jon 14 children:');
            childrenResult.rows.forEach(child => {
                console.log(`  - ${child.name}: ${child.uuid}`);
            });
            
            // Check if the specific UUID exists
            const specificChild = await client.query('SELECT uuid, name, parent_id FROM children WHERE uuid = $1', ['26ead642-0c1e-47e5-8d1f-0ad7dbf3c3b7']);
            console.log('\n🔍 Specific child 26ead642-0c1e-47e5-8d1f-0ad7dbf3c3b7:', specificChild.rows);
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

checkJon14Children().catch(console.error);