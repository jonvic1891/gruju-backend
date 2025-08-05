const sql = require('mssql');

// Multiple connection configurations to try
const configs = [
    {
        user: 'jonathan.roberts',
        password: 'Gruju1891',
        server: 'gruju.database.windows.net',
        database: 'gruju_test',
        options: {
            encrypt: true,
            trustServerCertificate: false,
            enableArithAbort: true,
            connectionTimeout: 120000,
            requestTimeout: 120000
        },
        pool: {
            max: 10,
            min: 0,
            idleTimeoutMillis: 60000
        }
    }
];

async function extractAzureData() {
    for (let i = 0; i < configs.length; i++) {
        const config = configs[i];
        console.log(`\n🔄 Attempting connection ${i + 1}/${configs.length}...`);
        console.log(`📡 Server: ${config.server}`);
        console.log(`🗄️ Database: ${config.database}`);
        console.log(`👤 User: ${config.user}`);
        
        try {
            console.log('⏳ Connecting with extended timeout...');
            const pool = new sql.ConnectionPool(config);
            await pool.connect();
            console.log('✅ Connected successfully!');
            
            // Test connection
            await pool.request().query('SELECT 1 as test');
            console.log('✅ Connection test successful!');
            
            // Get all data
            console.log('\n📊 Extracting ALL data from Azure SQL...');
            
            console.log('\n=== USERS TABLE ===');
            const users = await pool.request().query('SELECT * FROM users ORDER BY id');
            console.log('Users found:', users.recordset.length);
            users.recordset.forEach(user => {
                console.log(`ID: ${user.id} | Email: ${user.email} | Username: ${user.username} | Family: ${user.family_name} | Role: ${user.role}`);
            });
            
            console.log('\n=== CHILDREN TABLE ===');
            const children = await pool.request().query(`
                SELECT c.*, u.email as parent_email, u.username as parent_username 
                FROM children c 
                JOIN users u ON c.parent_id = u.id 
                ORDER BY c.parent_id, c.id
            `);
            console.log('Children found:', children.recordset.length);
            children.recordset.forEach(child => {
                console.log(`ID: ${child.id} | Name: ${child.name} | Parent: ${child.parent_email} (${child.parent_username})`);
            });
            
            console.log('\n=== ACTIVITIES TABLE ===');
            const activities = await pool.request().query(`
                SELECT a.*, c.name as child_name, u.email as parent_email 
                FROM activities a 
                JOIN children c ON a.child_id = c.id 
                JOIN users u ON c.parent_id = u.id 
                ORDER BY u.email, c.name, a.id
            `);
            console.log('Activities found:', activities.recordset.length);
            activities.recordset.forEach(activity => {
                console.log(`${activity.child_name} (${activity.parent_email}): ${activity.name} | ${activity.start_date} ${activity.start_time}-${activity.end_time}`);
            });
            
            console.log('\n=== CONNECTION_REQUESTS TABLE ===');
            const requests = await pool.request().query(`
                SELECT cr.*, 
                       u1.email as requester_email, u1.username as requester_username,
                       u2.email as target_email, u2.username as target_username,
                       c1.name as child_name, c2.name as target_child_name
                FROM connection_requests cr
                JOIN users u1 ON cr.requester_id = u1.id
                JOIN users u2 ON cr.target_parent_id = u2.id
                LEFT JOIN children c1 ON cr.child_id = c1.id
                LEFT JOIN children c2 ON cr.target_child_id = c2.id
                ORDER BY cr.id
            `);
            console.log('Connection requests found:', requests.recordset.length);
            requests.recordset.forEach(req => {
                console.log(`${req.requester_email} -> ${req.target_email}: ${req.child_name} -> ${req.target_child_name} | Status: ${req.status} | Message: ${req.message}`);
            });
            
            console.log('\n=== CONNECTIONS TABLE ===');
            const connections = await pool.request().query(`
                SELECT conn.*, 
                       u1.email as parent1_email, u2.email as parent2_email,
                       c1.name as child1_name, c2.name as child2_name
                FROM connections conn
                LEFT JOIN users u1 ON conn.parent1_id = u1.id
                LEFT JOIN users u2 ON conn.parent2_id = u2.id
                LEFT JOIN children c1 ON conn.child1_id = c1.id
                LEFT JOIN children c2 ON conn.child2_id = c2.id
                ORDER BY conn.id
            `);
            console.log('Connections found:', connections.recordset.length);
            connections.recordset.forEach(conn => {
                if (conn.child1_name && conn.child2_name) {
                    console.log(`Connection: ${conn.child1_name} <-> ${conn.child2_name} | Status: ${conn.status}`);
                } else {
                    console.log(`Connection: ${conn.parent1_email} <-> ${conn.parent2_email} | Status: ${conn.status}`);
                }
            });
            
            // Generate PostgreSQL INSERT statements
            console.log('\n\n🔧 GENERATING POSTGRESQL INSERT STATEMENTS...');
            
            console.log('\n-- Users');
            users.recordset.forEach(user => {
                console.log(`INSERT INTO users (username, email, phone, password_hash, role, is_active, family_name) VALUES ('${user.username}', '${user.email}', '${user.phone || ''}', '$2a$12$dummy.hash.for.demo.purposes', '${user.role}', ${user.is_active}, '${user.family_name || ''}');`);
            });
            
            console.log('\n-- Children');
            children.recordset.forEach(child => {
                console.log(`INSERT INTO children (name, parent_id) SELECT '${child.name}', id FROM users WHERE email = '${child.parent_email}';`);
            });
            
            console.log('\n-- Activities');
            activities.recordset.forEach(activity => {
                const startDate = activity.start_date ? activity.start_date.toISOString().split('T')[0] : 'NULL';
                const endDate = activity.end_date ? `'${activity.end_date.toISOString().split('T')[0]}'` : 'NULL';
                const startTime = activity.start_time || 'NULL';
                const endTime = activity.end_time || 'NULL';
                console.log(`INSERT INTO activities (child_id, name, description, start_date, end_date, start_time, end_time, location, website_url) SELECT c.id, '${activity.name}', ${activity.description ? `'${activity.description}'` : 'NULL'}, '${startDate}', ${endDate}, '${startTime}', '${endTime}', ${activity.location ? `'${activity.location}'` : 'NULL'}, ${activity.website_url ? `'${activity.website_url}'` : 'NULL'} FROM children c JOIN users u ON c.parent_id = u.id WHERE c.name = '${activity.child_name}' AND u.email = '${activity.parent_email}';`);
            });
            
            await pool.close();
            console.log('\n✅ Data extraction completed successfully!');
            return;
            
        } catch (error) {
            console.error(`❌ Connection ${i + 1} failed:`, error.message);
            console.error('Error code:', error.code);
            if (i === configs.length - 1) {
                console.error('\n💔 All connection attempts failed');
                console.error('Possible issues:');
                console.error('1. Azure SQL firewall blocking connection');
                console.error('2. Database server unavailable');
                console.error('3. Credentials expired or incorrect');
                console.error('4. Network connectivity issues');
            }
        }
    }
}

console.log('🚀 Starting Azure SQL data extraction...');
extractAzureData().catch(console.error);