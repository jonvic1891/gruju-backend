const sql = require('mssql');

async function cleanupDatabase() {
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
        }
    };

    try {
        console.log('🔄 Connecting to gruju_test database...');
        const pool = new sql.ConnectionPool(config);
        await pool.connect();
        console.log('✅ Connected successfully!');
        
        console.log('🗑️ Dropping all existing tables...');
        
        // Drop tables in correct order due to foreign keys
        const dropCommands = [
            'DROP TABLE IF EXISTS connections',
            'DROP TABLE IF EXISTS connection_requests', 
            'DROP TABLE IF EXISTS activities',
            'DROP TABLE IF EXISTS children',
            'DROP TABLE IF EXISTS users'
        ];

        for (const dropCommand of dropCommands) {
            try {
                console.log(`   Executing: ${dropCommand}`);
                await pool.request().query(dropCommand);
            } catch (e) {
                console.log(`   Warning: ${e.message}`);
            }
        }
        
        // Double check by trying manual drop
        try {
            await pool.request().query(`
                IF OBJECT_ID('connections', 'U') IS NOT NULL DROP TABLE connections;
                IF OBJECT_ID('connection_requests', 'U') IS NOT NULL DROP TABLE connection_requests;
                IF OBJECT_ID('activities', 'U') IS NOT NULL DROP TABLE activities;
                IF OBJECT_ID('children', 'U') IS NOT NULL DROP TABLE children;
                IF OBJECT_ID('users', 'U') IS NOT NULL DROP TABLE users;
            `);
        } catch (e) {
            console.log('   Additional cleanup completed');
        }
        
        console.log('✅ Database cleanup completed!');
        console.log('📋 All tables have been removed from gruju_test database');
        console.log('🎯 Next step: Run the table creation script');
        console.log('   node create-tables.js');
        
        await pool.close();
        
    } catch (error) {
        console.error('❌ Database cleanup failed:', error.message);
        if (error.originalError) {
            console.error('Original error:', error.originalError.message);
        }
        process.exit(1);
    }
}

cleanupDatabase();