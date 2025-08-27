const { Pool } = require('pg');

const DATABASE_URL = 'postgres://u4a6su3t5n0fn6:p5f4a04c5bab918014522e2eeb051dfb5c13f62872bf11e829c1ef3168d21c637@cfcojm7sp9tfip.cluster-czz5s0kz4scl.eu-west-1.rds.amazonaws.com:5432/d9qg97gb6fqhoe';

async function checkRequestConstraints() {
    const pool = new Pool({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    
    try {
        const client = await pool.connect();
        
        console.log('🔍 Checking connection_requests table constraints...');
        
        // Check constraints on connection_requests table
        const constraints = await client.query(`
            SELECT conname 
            FROM pg_constraint 
            WHERE conrelid = 'connection_requests'::regclass 
            AND contype = 'c'
        `);
        
        console.log('📋 Check constraints:');
        constraints.rows.forEach(constraint => {
            console.log(`   ${constraint.conname}`);
        });
        
        // Check unique statuses currently in the table
        const statuses = await client.query(`
            SELECT status, COUNT(*) as count 
            FROM connection_requests 
            GROUP BY status 
            ORDER BY count DESC
        `);
        
        console.log('\n📊 Existing status values:');
        statuses.rows.forEach(status => {
            console.log(`   ${status.status}: ${status.count} records`);
        });
        
        client.release();
        
    } catch (error) {
        console.error('❌ Error checking constraints:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

checkRequestConstraints();