const sql = require('mssql');

async function debugConnection() {
    console.log('🔍 Azure SQL Connection Debug');
    console.log('=============================');
    
    // Test 1: Basic connection info
    console.log('\n1. Connection Details:');
    console.log('   Server: gruju.database.windows.net');
    console.log('   Port: 1433');
    console.log('   Database: gruju_test');
    console.log('   User: jonathan.roberts');
    console.log('   Password: [hidden]');
    
    // Test 2: Try different username formats
    const userFormats = [
        'jonathan.roberts',
        'jonathan.roberts@gruju',
        'jonathan.roberts@gruju.database.windows.net'
    ];
    
    for (const username of userFormats) {
        console.log(`\n2. Testing username format: "${username}"`);
        
        const config = {
            server: 'gruju.database.windows.net',
            port: 1433,
            database: 'gruju_test',
            user: username,
            password: 'Gruju1891!',
            options: {
                encrypt: true,
                trustServerCertificate: false,
                enableArithAbort: true,
                connectionTimeout: 15000,
                requestTimeout: 15000
            }
        };
        
        try {
            const pool = new sql.ConnectionPool(config);
            await pool.connect();
            console.log(`   ✅ SUCCESS with username: ${username}`);
            await pool.close();
            return; // Stop on first success
        } catch (error) {
            console.log(`   ❌ FAILED: ${error.message}`);
        }
    }
    
    console.log('\n3. Recommendations:');
    console.log('   - Check if user exists in Azure Portal');
    console.log('   - Verify password is correct');
    console.log('   - Try logging in via Azure Portal Query Editor');
    console.log('   - Check if user has access to gruju_test database');
}

debugConnection();