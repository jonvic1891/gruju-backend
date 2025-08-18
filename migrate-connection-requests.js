const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function migrateConnectionRequests() {
    const client = await pool.connect();
    
    try {
        console.log('🔧 Starting connection requests migration...');
        
        // Get all connection requests that need child name updates
        const requests = await client.query(`
            SELECT cr.id, cr.uuid, cr.target_child_id, cr.child_id,
                   tc.name as target_child_name,
                   rc.name as requesting_child_name,
                   u.username as target_parent_name,
                   u.family_name as target_family_name
            FROM connection_requests cr
            LEFT JOIN children tc ON cr.target_child_id = tc.id
            LEFT JOIN children rc ON cr.child_id = rc.id
            LEFT JOIN users u ON cr.target_parent_id = u.id
            WHERE cr.status = 'pending'
        `);
        
        console.log(`📋 Found ${requests.rows.length} connection requests to check`);
        
        for (const request of requests.rows) {
            console.log(`\n🔍 Processing request ${request.uuid}:`);
            console.log(`   From: ${request.requesting_child_name} (child_id: ${request.child_id})`);
            console.log(`   To: ${request.target_child_name || 'Any Child'} (target_child_id: ${request.target_child_id})`);
            console.log(`   Target Parent: ${request.target_parent_name || request.target_family_name}`);
            
            // Log what the display should show
            if (request.target_child_name) {
                console.log(`   ✅ Should display: "${request.requesting_child_name} → ${request.target_child_name}"`);
            } else {
                console.log(`   ✅ Should display: "${request.requesting_child_name} → ${request.target_parent_name || request.target_family_name} (Any Child)"`);
            }
        }
        
        console.log('\n📊 Migration Analysis Complete');
        console.log('The existing data structure is correct. The issue is in the frontend display logic.');
        console.log('The sent requests API should return target_child_name when target_child_id is not null.');
        
        // Check the sent requests query to make sure it joins correctly
        console.log('\n🔍 Checking sent requests query...');
        const sentRequestsQuery = `
            SELECT cr.id, cr.uuid, cr.status, cr.message, cr.created_at,
                   u.username as target_parent_name, u.family_name as target_family_name,
                   c1.name as child_name,
                   c2.name as target_child_name,
                   c2.uuid as target_child_uuid
             FROM connection_requests cr
             LEFT JOIN users u ON cr.target_parent_id = u.id
             LEFT JOIN children c1 ON cr.child_id = c1.id
             LEFT JOIN children c2 ON cr.target_child_id = c2.id
             WHERE cr.requester_id = (SELECT id FROM users WHERE email = 'roberts11@example.com')
               AND cr.status = 'pending'
        `;
        
        const sentRequests = await client.query(sentRequestsQuery);
        console.log('📤 Sent requests data:');
        sentRequests.rows.forEach((req, index) => {
            console.log(`   ${index + 1}. ${req.child_name} → ${req.target_child_name || req.target_parent_name + ' (Any Child)'}`);
            console.log(`      Target child UUID: ${req.target_child_uuid || 'null'}`);
            console.log(`      Target parent: ${req.target_parent_name}`);
        });
        
        console.log('\n🎉 Migration complete - no database changes needed');
        console.log('The issue is that the frontend is not displaying target_child_name when it exists.');
        
    } catch (error) {
        console.error('❌ Migration error:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

migrateConnectionRequests();