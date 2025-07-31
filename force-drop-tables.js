const sql = require('mssql');

async function forceDropTables() {
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
        
        console.log('🔍 Checking existing tables...');
        const existingTables = await pool.request().query(`
            SELECT TABLE_NAME 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_TYPE = 'BASE TABLE'
        `);
        
        console.log('📋 Found tables:', existingTables.recordset.map(t => t.TABLE_NAME));
        
        console.log('🗑️ Force dropping all constraints first...');
        
        // Drop all foreign key constraints first
        const constraints = await pool.request().query(`
            SELECT 
                CONSTRAINT_NAME,
                TABLE_NAME
            FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
            WHERE CONSTRAINT_TYPE = 'FOREIGN KEY'
        `);
        
        for (const constraint of constraints.recordset) {
            try {
                console.log(`   Dropping constraint: ${constraint.CONSTRAINT_NAME} from ${constraint.TABLE_NAME}`);
                await pool.request().query(`ALTER TABLE ${constraint.TABLE_NAME} DROP CONSTRAINT ${constraint.CONSTRAINT_NAME}`);
            } catch (e) {
                console.log(`   Warning: Could not drop constraint ${constraint.CONSTRAINT_NAME}: ${e.message}`);
            }
        }
        
        console.log('🗑️ Now dropping tables...');
        const tablesToDrop = ['connections', 'connection_requests', 'activities', 'children', 'users'];
        
        for (const table of tablesToDrop) {
            try {
                console.log(`   Dropping table: ${table}`);
                await pool.request().query(`DROP TABLE IF EXISTS ${table}`);
            } catch (e) {
                console.log(`   Warning: Could not drop table ${table}: ${e.message}`);
            }
        }
        
        // Final check
        const finalTables = await pool.request().query(`
            SELECT TABLE_NAME 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_TYPE = 'BASE TABLE' AND TABLE_NAME IN ('users', 'children', 'activities', 'connections', 'connection_requests')
        `);
        
        if (finalTables.recordset.length === 0) {
            console.log('✅ All tables successfully removed!');
        } else {
            console.log('⚠️ Some tables still exist:', finalTables.recordset.map(t => t.TABLE_NAME));
        }
        
        await pool.close();
        
    } catch (error) {
        console.error('❌ Force drop failed:', error.message);
        if (error.originalError) {
            console.error('Original error:', error.originalError.message);
        }
        process.exit(1);
    }
}

forceDropTables();