const { Pool } = require('pg');

const DATABASE_URL = 'postgres://u4a6su3t5n0fn6:p5f4a04c5bab918014522e2eeb051dfb5c13f62872bf11e829c1ef3168d21c637@cfcojm7sp9tfip.cluster-czz5s0kz4scl.eu-west-1.rds.amazonaws.com:5432/d9qg97gb6fqhoe';

async function debugParentAccess() {
    const pool = new Pool({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    
    try {
        const client = await pool.connect();
        
        // First, let's see all recent users and their roles
        console.log('🔍 All recent users with roles:');
        const allUsers = await client.query(`
            SELECT uuid, username, email, role, created_at FROM users 
            ORDER BY created_at DESC LIMIT 10
        `);
        
        allUsers.rows.forEach((user, i) => {
            console.log(`   ${i+1}. ${user.username} (${user.email}) - Role: ${user.role} - ${user.uuid}`);
        });
        
        // Check role distribution
        console.log('\n🔍 User role distribution:');
        const roleStats = await client.query(`
            SELECT role, COUNT(*) as count FROM users GROUP BY role
        `);
        roleStats.rows.forEach(role => {
            console.log(`   ${role.role}: ${role.count} users`);
        });
        
        // Check if parents table exists
        console.log('\n🔍 Checking if parents table exists...');
        const tableCheck = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_name = 'parents'
            );
        `);
        console.log(`   Parents table exists: ${tableCheck.rows[0].exists}`);
        
        if (tableCheck.rows[0].exists) {
            console.log('\n🔍 All parent records (direct from parents table):');
            const allParents = await client.query(`
                SELECT * FROM parents
                ORDER BY created_at DESC LIMIT 10
            `);
            
            console.log(`   Found ${allParents.rows.length} parent records`);
            allParents.rows.forEach((parent, i) => {
                console.log(`   ${i+1}. ${parent.email} - UUID: ${parent.uuid}, Account: ${parent.account_uuid}, Primary: ${parent.is_primary}`);
            });
            
            // Try the JOIN separately to debug
            console.log('\n🔍 Testing JOIN with users table:');
            const joinTest = await client.query(`
                SELECT p.uuid as parent_uuid, p.account_uuid, p.email as parent_email, 
                       u.uuid as user_uuid, u.email as user_email
                FROM parents p
                LEFT JOIN users u ON p.uuid = u.uuid
                LIMIT 5
            `);
            
            joinTest.rows.forEach((row, i) => {
                console.log(`   ${i+1}. Parent UUID: ${row.parent_uuid}, User UUID: ${row.user_uuid || 'NULL'}`);
                console.log(`       Parent Email: ${row.parent_email}, User Email: ${row.user_email || 'NULL'}`);
            });
        } else {
            console.log('❌ Parents table does not exist!');
        }

        // Find any additional parent (non-primary)
        console.log('\n🔍 Looking for additional parents...');
        const additionalParents = await client.query(`
            SELECT p.* FROM parents p
            WHERE p.is_primary = false
        `);
        
        if (additionalParents.rows.length > 0) {
            const parent = additionalParents.rows[0];
            console.log('📋 Additional Parent Found:');
            console.log(`   UUID: ${parent.uuid}`);
            console.log(`   Email: ${parent.email}`);
            console.log(`   Username: ${parent.username}`);
            console.log(`   Account UUID: ${parent.account_uuid}`);
            
            console.log('👨‍👩‍👧‍👦 Parent Record:');
            console.log(`   Account UUID: ${parent.account_uuid}`);
            console.log(`   Is Primary: ${parent.is_primary}`);
            console.log(`   Role: ${parent.role}`);
                
            // First check what columns exist in children table
            console.log('\n🔍 Checking children table structure...');
            const childrenColumns = await client.query(`
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'children' AND table_schema = 'public'
                ORDER BY ordinal_position
            `);
            console.log('   Children table columns:');
            childrenColumns.rows.forEach(col => {
                console.log(`     - ${col.column_name} (${col.data_type})`);
            });
            
            // Check what users table ID corresponds to account_uuid
            console.log('\n🔍 Finding account user record...');
            const accountUser = await client.query(`
                SELECT id, uuid, username, email FROM users WHERE uuid = $1
            `, [parent.account_uuid]);
            
            if (accountUser.rows.length > 0) {
                const account = accountUser.rows[0];
                console.log(`   Account User: ${account.username} (${account.email}) - ID: ${account.id}`);
                
                // Now check what children should be accessible via account user ID
                console.log('\n🔍 Checking children via account user ID...');
                const childrenViaAccount = await client.query(`
                    SELECT name, uuid, parent_id FROM children WHERE parent_id = $1
                `, [account.id]);
                
                console.log(`📋 Children accessible via account user ID (${childrenViaAccount.rows.length} found):`);
                childrenViaAccount.rows.forEach((child, i) => {
                    console.log(`   ${i+1}. ${child.name} (${child.uuid}) - Parent ID: ${child.parent_id}`);
                });
            } else {
                console.log('❌ Account user not found');
            }
            
            // Check users table structure first
            console.log('\n🔍 Checking users table columns...');
            const usersColumns = await client.query(`
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'users' AND table_schema = 'public'
                ORDER BY ordinal_position
            `);
            console.log('   Users table columns:');
            usersColumns.rows.forEach(col => {
                console.log(`     - ${col.column_name} (${col.data_type})`);
            });
            
            // Also check if there are any children linked to the additional parent's user record
            console.log('\n🔍 Looking for additional parent user record...');
            const additionalUser = await client.query(`
                SELECT * FROM users WHERE uuid = $1
            `, [parent.uuid]);
            
            console.log('\n🔍 All recent users (to find the additional parent)...');
            const recentUsers = await client.query(`
                SELECT id, uuid, username, email, password_hash IS NOT NULL as has_password, created_at
                FROM users ORDER BY created_at DESC LIMIT 5
            `);
            
            recentUsers.rows.forEach((user, i) => {
                console.log(`   ${i+1}. ${user.username} (${user.email}) - ID: ${user.id}, UUID: ${user.uuid}, Has Password: ${user.has_password}`);
                console.log(`      Created: ${user.created_at}`);
            });
            
            if (additionalUser.rows.length > 0) {
                const addUser = additionalUser.rows[0];
                console.log(`   Additional Parent User: ${addUser.username} (${addUser.email}) - ID: ${addUser.id}`);
                console.log(`   Has password hash: ${addUser.password_hash ? 'Yes' : 'No'}`);
                
                const childrenViaDirect = await client.query(`
                    SELECT name, uuid, parent_id FROM children WHERE parent_id = $1
                `, [addUser.id]);
                
                console.log(`📋 Children linked to additional parent (${childrenViaDirect.rows.length} found):`);
                childrenViaDirect.rows.forEach((child, i) => {
                    console.log(`   ${i+1}. ${child.name} (${child.uuid}) - Parent ID: ${child.parent_id}`);
                });
                
                // Check if we can find the user account by email
                console.log('\n🔍 Finding user record by email...');
                const userByEmail = await client.query(`
                    SELECT * FROM users WHERE email = $1
                `, [parent.email]);
                
                if (userByEmail.rows.length > 0) {
                    const emailUser = userByEmail.rows[0];
                    console.log(`   User by email: ${emailUser.username} (${emailUser.email}) - ID: ${emailUser.id}, UUID: ${emailUser.uuid}`);
                    console.log(`   Has password hash: ${emailUser.password_hash ? 'Yes' : 'No'}`);
                } else {
                    console.log('   No user found with this email');
                }
            } else {
                console.log('   Additional parent has no user record (expected for additional parents)');
            }
            
        } else {
            console.log('❌ No additional parents found');
        }
        
        client.release();
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await pool.end();
    }
}

debugParentAccess();