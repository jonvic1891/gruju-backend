const { Pool } = require('pg');

// Use Heroku PostgreSQL connection string
const DATABASE_URL = process.env.DATABASE_URL || 'postgres://u4a6su3t5n0fn6:p5f4a04c5bab918014522e2eeb051dfb5c13f62872bf11e829c1ef3168d21c637@cfcojm7sp9tfip.cluster-czz5s0kz4scl.eu-west-1.rds.amazonaws.com:5432/d9qg97gb6fqhoe';

const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function checkTables() {
    const client = await pool.connect();
    try {
        console.log('🔄 Checking table structures...');

        // Check connection_requests table structure
        const connectionRequestsColumns = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'connection_requests'
            ORDER BY ordinal_position
        `);
        
        console.log('\n📋 connection_requests table columns:');
        connectionRequestsColumns.rows.forEach(col => {
            console.log(`- ${col.column_name} (${col.data_type})`);
        });

        // Check connections table structure
        const connectionsColumns = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'connections'
            ORDER BY ordinal_position
        `);
        
        console.log('\n📋 connections table columns:');
        connectionsColumns.rows.forEach(col => {
            console.log(`- ${col.column_name} (${col.data_type})`);
        });

        // Show actual data in these tables
        const connectionRequestsData = await client.query('SELECT * FROM connection_requests LIMIT 5');
        console.log('\n📋 connection_requests sample data:');
        console.log(connectionRequestsData.rows);

        const connectionsData = await client.query('SELECT * FROM connections LIMIT 5');
        console.log('\n📋 connections sample data:');
        console.log(connectionsData.rows);

    } catch (error) {
        console.error('❌ Error checking tables:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

checkTables();