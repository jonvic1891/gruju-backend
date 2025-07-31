const sql = require('mssql');

async function testConnection() {
    const config = {
        server: 'gruju.database.windows.net',
        port: 1433,
        database: 'gruju_test',
        user: 'jonathan.roberts',
        password: 'Gruju1891',
        options: {
            encrypt: true,
            trustServerCertificate: false,
            enableArithAbort: true,
            connectionTimeout: 30000,
            requestTimeout: 30000
        },
        pool: {
            max: 10,
            min: 0,
            idleTimeoutMillis: 30000
        }
    };

    try {
        console.log('Testing Azure SQL connection...');
        console.log('Server:', config.server);
        console.log('Database:', config.database);
        console.log('User:', config.user);
        
        const pool = new sql.ConnectionPool(config);
        await pool.connect();
        console.log('✅ Connected successfully!');
        
        const result = await pool.request().query('SELECT 1 AS test');
        console.log('✅ Query test successful:', result.recordset);
        
        await pool.close();
        console.log('✅ Connection closed successfully');
        
    } catch (error) {
        console.error('❌ Connection failed:', error.message);
        console.error('Error details:', error);
    }
}

testConnection();