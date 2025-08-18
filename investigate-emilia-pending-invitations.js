const { Pool } = require('pg');

// Set up database connection
const pool = new Pool({
    user: process.env.DB_USER || 'activityapp',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'parent_activity_app',
    password: process.env.DB_PASSWORD || 'your_secure_password',
    port: process.env.DB_PORT || 5432,
});

async function investigatePendingInvitations() {
    const client = await pool.connect();
    
    try {
        console.log('🔍 INVESTIGATING PENDING INVITATIONS FOR EMILIA');
        console.log('=' .repeat(60));
        
        // 1. Find Emilia user by UUID
        console.log('\n1. FINDING EMILIA USER:');
        const emiliaQuery = await client.query(`
            SELECT id, email, first_name, last_name, uuid 
            FROM users 
            WHERE uuid = $1 OR email ILIKE '%emilia%'
        `, ['5fd73f87-fcab-42d0-b371-e73a87dfa69e']);
        
        if (emiliaQuery.rows.length === 0) {
            console.log('❌ Emilia user not found with UUID: 5fd73f87-fcab-42d0-b371-e73a87dfa69e');
            return;
        }
        
        const emilia = emiliaQuery.rows[0];
        console.log('✅ Found Emilia:', emilia);
        
        // 2. Find Emilia's children
        console.log('\n2. FINDING EMILIA\'S CHILDREN:');
        const childrenQuery = await client.query(`
            SELECT id, name, uuid, parent_id 
            FROM children 
            WHERE parent_id = $1
        `, [emilia.id]);
        
        console.log(`✅ Found ${childrenQuery.rows.length} children for Emilia:`, childrenQuery.rows);
        
        // 3. Check for activities named "scroll1"
        console.log('\n3. CHECKING FOR "SCROLL1" ACTIVITY:');
        const scroll1Query = await client.query(`
            SELECT a.*, u.first_name, u.last_name, c.name as child_name
            FROM activities a
            JOIN users u ON a.parent_id = u.id
            JOIN children c ON a.child_id = c.id
            WHERE a.name ILIKE '%scroll1%'
        `);
        
        console.log(`✅ Found ${scroll1Query.rows.length} activities matching "scroll1":`, scroll1Query.rows);
        
        // 4. Check pending activity invitations table structure and content
        console.log('\n4. CHECKING PENDING_ACTIVITY_INVITATIONS TABLE:');
        
        // Check table structure first
        const tableStructure = await client.query(`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'pending_activity_invitations'
            ORDER BY ordinal_position
        `);
        console.log('✅ Table structure:', tableStructure.rows);
        
        // Check all pending invitations
        const allPendingQuery = await client.query(`
            SELECT pai.*, a.name as activity_name, a.parent_id as activity_host_id,
                   u.first_name as host_first_name, u.last_name as host_last_name
            FROM pending_activity_invitations pai
            JOIN activities a ON pai.activity_id = a.id
            JOIN users u ON a.parent_id = u.id
        `);
        
        console.log(`✅ Found ${allPendingQuery.rows.length} total pending invitations:`, allPendingQuery.rows);
        
        // 5. Check connection requests involving Emilia
        console.log('\n5. CHECKING CONNECTION REQUESTS FOR EMILIA:');
        const connectionRequestsQuery = await client.query(`
            SELECT cr.*, 
                   u1.first_name as requester_name, u1.last_name as requester_last,
                   u2.first_name as target_name, u2.last_name as target_last,
                   c1.name as child_name, c2.name as target_child_name
            FROM connection_requests cr
            LEFT JOIN users u1 ON cr.requester_id = u1.id
            LEFT JOIN users u2 ON cr.target_parent_id = u2.id
            LEFT JOIN children c1 ON cr.child_uuid = c1.uuid
            LEFT JOIN children c2 ON cr.target_child_uuid = c2.uuid
            WHERE cr.requester_id = $1 OR cr.target_parent_id = $1
            ORDER BY cr.created_at DESC
        `, [emilia.id]);
        
        console.log(`✅ Found ${connectionRequestsQuery.rows.length} connection requests involving Emilia:`, connectionRequestsQuery.rows);
        
        // 6. Check actual activity invitations for Emilia
        console.log('\n6. CHECKING ACTIVITY INVITATIONS FOR EMILIA:');
        const invitationsQuery = await client.query(`
            SELECT ai.*, a.name as activity_name, a.start_date, a.end_date,
                   u.first_name as inviter_name, u.last_name as inviter_last,
                   c.name as invited_child_name
            FROM activity_invitations ai
            JOIN activities a ON ai.activity_id = a.id
            JOIN users u ON ai.inviter_parent_id = u.id
            LEFT JOIN children c ON ai.invited_child_id = c.id
            WHERE ai.invited_parent_id = $1
            ORDER BY ai.created_at DESC
        `, [emilia.id]);
        
        console.log(`✅ Found ${invitationsQuery.rows.length} activity invitations for Emilia:`, invitationsQuery.rows);
        
        // 7. Check connections between Emilia and other parents
        console.log('\n7. CHECKING CONNECTIONS FOR EMILIA:');
        const connectionsQuery = await client.query(`
            SELECT c.*, 
                   ch1.name as child1_name, ch1.parent_id as child1_parent_id, u1.first_name as parent1_name,
                   ch2.name as child2_name, ch2.parent_id as child2_parent_id, u2.first_name as parent2_name
            FROM connections c
            LEFT JOIN children ch1 ON c.child1_id = ch1.id
            LEFT JOIN children ch2 ON c.child2_id = ch2.id
            LEFT JOIN users u1 ON ch1.parent_id = u1.id
            LEFT JOIN users u2 ON ch2.parent_id = u2.id
            WHERE ch1.parent_id = $1 OR ch2.parent_id = $1
        `, [emilia.id]);
        
        console.log(`✅ Found ${connectionsQuery.rows.length} connections for Emilia:`, connectionsQuery.rows);
        
        // 8. Look for Charlie's connection requests
        console.log('\n8. CHECKING FOR CHARLIE\'S CONNECTION REQUESTS:');
        const charlieQuery = await client.query(`
            SELECT cr.*, u.first_name, u.last_name, u.email
            FROM connection_requests cr
            JOIN users u ON cr.requester_id = u.id
            WHERE u.first_name ILIKE '%charlie%' OR u.email ILIKE '%charlie%'
            ORDER BY cr.created_at DESC
        `);
        
        console.log(`✅ Found ${charlieQuery.rows.length} connection requests from Charlie:`, charlieQuery.rows);
        
        // 9. Check for specific pending connection patterns
        console.log('\n9. CHECKING PENDING CONNECTION PATTERNS:');
        if (charlieQuery.rows.length > 0) {
            const charlie = charlieQuery.rows[0];
            const pendingKey = `pending-${charlie.uuid}`;
            console.log('🔍 Looking for pending invitations with key:', pendingKey);
            
            const pendingForCharlieQuery = await client.query(`
                SELECT pai.*, a.name as activity_name, a.parent_id,
                       u.first_name as host_name, u.last_name as host_last
                FROM pending_activity_invitations pai
                JOIN activities a ON pai.activity_id = a.id
                JOIN users u ON a.parent_id = u.id
                WHERE pai.pending_connection_id = $1
            `, [pendingKey]);
            
            console.log(`✅ Found ${pendingForCharlieQuery.rows.length} pending invitations for Charlie's request:`, pendingForCharlieQuery.rows);
        }
        
        // 10. Summary and recommendations
        console.log('\n' + '='.repeat(60));
        console.log('📋 INVESTIGATION SUMMARY:');
        console.log('='.repeat(60));
        console.log(`- Emilia User ID: ${emilia.id}, UUID: ${emilia.uuid}`);
        console.log(`- Emilia has ${childrenQuery.rows.length} children`);
        console.log(`- Found ${scroll1Query.rows.length} "scroll1" activities`);
        console.log(`- Total pending invitations in system: ${allPendingQuery.rows.length}`);
        console.log(`- Connection requests involving Emilia: ${connectionRequestsQuery.rows.length}`);
        console.log(`- Current activity invitations for Emilia: ${invitationsQuery.rows.length}`);
        console.log(`- Active connections for Emilia: ${connectionsQuery.rows.length}`);
        console.log(`- Charlie's connection requests: ${charlieQuery.rows.length}`);
        
    } catch (error) {
        console.error('❌ Investigation failed:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

// SQL queries you can run manually to check the state:
console.log('\n📝 MANUAL SQL QUERIES TO CHECK DATABASE STATE:');
console.log('='.repeat(60));
console.log(`
-- 1. Check pending_activity_invitations table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'pending_activity_invitations'
ORDER BY ordinal_position;

-- 2. Find all pending invitations
SELECT pai.*, a.name as activity_name, u.first_name as host_name
FROM pending_activity_invitations pai
JOIN activities a ON pai.activity_id = a.id
JOIN users u ON a.parent_id = u.id;

-- 3. Find Emilia and her current invitations
SELECT ai.*, a.name as activity_name, u.first_name as inviter_name
FROM activity_invitations ai
JOIN activities a ON ai.activity_id = a.id
JOIN users u ON ai.inviter_parent_id = u.id
WHERE ai.invited_parent_id = (
    SELECT id FROM users WHERE uuid = '5fd73f87-fcab-42d0-b371-e73a87dfa69e'
);

-- 4. Check connection requests for Emilia
SELECT cr.*, u.first_name as requester_name
FROM connection_requests cr
JOIN users u ON cr.requester_id = u.id
WHERE cr.target_parent_id = (
    SELECT id FROM users WHERE uuid = '5fd73f87-fcab-42d0-b371-e73a87dfa69e'
)
ORDER BY cr.created_at DESC;

-- 5. Check for "scroll1" activity with pending invitations
SELECT a.*, pai.pending_connection_id, u.first_name as host_name
FROM activities a
LEFT JOIN pending_activity_invitations pai ON a.id = pai.activity_id
JOIN users u ON a.parent_id = u.id
WHERE a.name ILIKE '%scroll1%';
`);

investigatePendingInvitations().catch(console.error);