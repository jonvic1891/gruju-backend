const sql = require('mssql');
const fs = require('fs');

async function setupDemoDatabase() {
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
            max: 5,
            min: 0,
            idleTimeoutMillis: 30000
        }
    };

    try {
        console.log('🔄 Connecting to gruju_test database...');
        const pool = new sql.ConnectionPool(config);
        await pool.connect();
        console.log('✅ Connected successfully!');
        
        console.log('📜 Reading SQL setup script...');
        const sqlScript = fs.readFileSync('../setup-gruju-full-demo.sql', 'utf8');
        
        console.log('🏗️ Executing database setup...');
        console.log('This may take a moment...');
        
        // Split the script by GO statements or execute as one
        const result = await pool.request().query(sqlScript);
        
        console.log('✅ Database setup completed successfully!');
        console.log('📊 Your gruju_test database now contains:');
        console.log('   - All required tables (users, children, activities, etc.)');
        console.log('   - 7 demo user accounts');
        console.log('   - 10 demo children with various ages');
        console.log('   - 17 demo activities with real dates');
        console.log('   - Connection requests and family connections');
        console.log('');
        console.log('🎮 You can now use the Parent Activity App with live data!');
        console.log('🔗 Demo App: http://localhost:8080/demo');
        console.log('');
        console.log('👨‍👩‍👧‍👦 Try logging in as:');
        console.log('   - john@example.com / demo123 (Johnson Family - 2 children)');
        console.log('   - jane@example.com / demo123 (Smith Family - 2 children)');
        console.log('   - mike@example.com / demo123 (Miller Family - 3 children)');
        
        await pool.close();
        
    } catch (error) {
        console.error('❌ Database setup failed:', error.message);
        if (error.originalError) {
            console.error('Original error:', error.originalError.message);
        }
        process.exit(1);
    }
}

setupDemoDatabase();