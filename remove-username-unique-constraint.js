const sql = require('mssql');

async function removeUsernameUniqueConstraint() {
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
        
        console.log('🔧 Removing UNIQUE constraint from username column...');
        
        // First, find the constraint name
        const constraintQuery = await pool.request().query(`
            SELECT CONSTRAINT_NAME 
            FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
            WHERE TABLE_NAME = 'users' 
            AND CONSTRAINT_TYPE = 'UNIQUE'
            AND CONSTRAINT_NAME LIKE '%username%'
        `);
        
        if (constraintQuery.recordset.length > 0) {
            const constraintName = constraintQuery.recordset[0].CONSTRAINT_NAME;
            console.log(`📝 Found constraint: ${constraintName}`);
            
            // Drop the unique constraint
            await pool.request().query(`
                ALTER TABLE users 
                DROP CONSTRAINT ${constraintName}
            `);
            
            console.log('✅ UNIQUE constraint removed from username column');
        } else {
            // If no named constraint found, try to find it by column
            const indexQuery = await pool.request().query(`
                SELECT i.name as index_name
                FROM sys.indexes i
                INNER JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
                INNER JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
                INNER JOIN sys.tables t ON i.object_id = t.object_id
                WHERE t.name = 'users' 
                AND c.name = 'username' 
                AND i.is_unique = 1
                AND i.is_primary_key = 0
            `);
            
            if (indexQuery.recordset.length > 0) {
                const indexName = indexQuery.recordset[0].index_name;
                console.log(`📝 Found unique index: ${indexName}`);
                
                await pool.request().query(`
                    DROP INDEX ${indexName} ON users
                `);
                
                console.log('✅ UNIQUE index removed from username column');
            } else {
                console.log('ℹ️  No UNIQUE constraint found on username column');
            }
        }
        
        // Verify the change
        const verifyQuery = await pool.request().query(`
            SELECT COLUMN_NAME, IS_NULLABLE, DATA_TYPE
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'users' 
            AND COLUMN_NAME = 'username'
        `);
        
        console.log('📊 Username column info:', verifyQuery.recordset[0]);
        
        await pool.close();
        console.log('✅ Database migration completed successfully!');
        console.log('📝 Username field is now non-unique, allowing multiple users with similar usernames');
        
    } catch (error) {
        console.error('❌ Database migration failed:', error.message);
        if (error.originalError) {
            console.error('Original error:', error.originalError.message);
        }
        process.exit(1);
    }
}

removeUsernameUniqueConstraint();