const sql = require('mssql');

async function createTables() {
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
        
        console.log('🗑️ Dropping existing tables (if they exist)...');
        
        // Drop tables in correct order due to foreign keys
        try {
            await pool.request().query('DROP TABLE IF EXISTS connections');
            await pool.request().query('DROP TABLE IF EXISTS connection_requests');
            await pool.request().query('DROP TABLE IF EXISTS activities');
            await pool.request().query('DROP TABLE IF EXISTS children');
            await pool.request().query('DROP TABLE IF EXISTS users');
        } catch (e) {
            console.log('   Some tables did not exist (this is normal)');
        }
        
        console.log('🏗️ Creating users table...');
        await pool.request().query(`
            CREATE TABLE users (
                id INT IDENTITY(1,1) PRIMARY KEY,
                username NVARCHAR(100) NOT NULL,
                email NVARCHAR(255) NOT NULL UNIQUE,
                phone NVARCHAR(20),
                password_hash NVARCHAR(255) NOT NULL,
                role NVARCHAR(50) NOT NULL DEFAULT 'user',
                is_active BIT NOT NULL DEFAULT 1,
                family_name NVARCHAR(100),
                created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
                updated_at DATETIME2 NOT NULL DEFAULT GETDATE()
            )
        `);
        
        console.log('🏗️ Creating children table...');
        await pool.request().query(`
            CREATE TABLE children (
                id INT IDENTITY(1,1) PRIMARY KEY,
                parent_id INT NOT NULL,
                name NVARCHAR(100) NOT NULL,
                created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
                updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
                FOREIGN KEY (parent_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
        
        console.log('🏗️ Creating activities table...');
        await pool.request().query(`
            CREATE TABLE activities (
                id INT IDENTITY(1,1) PRIMARY KEY,
                child_id INT NOT NULL,
                name NVARCHAR(200) NOT NULL,
                start_date DATE NOT NULL,
                end_date DATE,
                start_time TIME,
                end_time TIME,
                website_url NVARCHAR(500),
                created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
                updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
                FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE
            )
        `);
        
        console.log('🏗️ Creating connection_requests table...');
        await pool.request().query(`
            CREATE TABLE connection_requests (
                id INT IDENTITY(1,1) PRIMARY KEY,
                requester_id INT NOT NULL,
                target_parent_id INT NOT NULL,
                child_id INT NOT NULL,
                target_child_id INT,
                status NVARCHAR(20) NOT NULL DEFAULT 'pending',
                message NVARCHAR(500),
                created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
                updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
                FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE NO ACTION,
                FOREIGN KEY (target_parent_id) REFERENCES users(id) ON DELETE NO ACTION,
                FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE
            )
        `);
        
        console.log('🏗️ Creating connections table...');
        await pool.request().query(`
            CREATE TABLE connections (
                id INT IDENTITY(1,1) PRIMARY KEY,
                child1_id INT NOT NULL,
                child2_id INT NOT NULL,
                status NVARCHAR(20) NOT NULL DEFAULT 'active',
                created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
                FOREIGN KEY (child1_id) REFERENCES children(id) ON DELETE CASCADE,
                FOREIGN KEY (child2_id) REFERENCES children(id) ON DELETE NO ACTION
            )
        `);
        
        console.log('✅ All tables created successfully!');
        console.log('📋 Tables created:');
        console.log('   - users (with admin and family accounts)');
        console.log('   - children (linked to parent users)');
        console.log('   - activities (scheduled events for children)');
        console.log('   - connection_requests (friend requests between families)');
        console.log('   - connections (established friendships)');
        console.log('');
        console.log('🎯 Next step: Run the data population script');
        console.log('   node ../populate-demo-data.js');
        
        await pool.close();
        
    } catch (error) {
        console.error('❌ Table creation failed:', error.message);
        if (error.originalError) {
            console.error('Original error:', error.originalError.message);
        }
        process.exit(1);
    }
}

createTables();