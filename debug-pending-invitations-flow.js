#!/usr/bin/env node

const fetch = require('node-fetch');

const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com';

async function debugPendingInvitationsFlow() {
    try {
        console.log('🧪 DEBUGGING PENDING INVITATIONS FLOW FOR TEST 3 -> EMILIA');
        console.log('=' .repeat(60));
        
        // Login as test 3
        console.log('\n👤 Step 1: Login as test 3...');
        const loginResponse = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'jonathan.roberts006@hotmail.co.uk', password: 'test123' })
        });
        
        const loginData = await loginResponse.json();
        if (!loginData.success) {
            console.log('❌ Login failed');
            return;
        }
        console.log('✅ Login successful');
        const token = loginData.token;
        
        // Get test 3's child
        const childrenResponse = await fetch(`${API_BASE}/api/children`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const childrenData = await childrenResponse.json();
        const test3Child = childrenData.data[0]; // test 3 child
        
        // Get most recent activity (the one that should have pending invitations)
        const activitiesResponse = await fetch(`${API_BASE}/api/activities/${test3Child.id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const activitiesData = await activitiesResponse.json();
        const recentActivity = activitiesData.data[0]; // Most recent: "blah 8"
        
        console.log(`\n📋 Step 2: Checking activity "${recentActivity.name}" (ID: ${recentActivity.id})`);
        console.log(`Date: ${recentActivity.start_date}`);
        console.log(`Auto-notify: ${recentActivity.auto_notify_new_connections}`);
        
        // Check if this activity has any entries in pending_activity_invitations table
        // We need to check this through the backend's processAutoNotifications endpoint or check manually
        
        // Let's simulate what should happen when connection is accepted
        console.log('\n🔄 Step 3: Checking what should have happened when Emilia accepted connection...');
        
        // Get connection details
        const connectionsResponse = await fetch(`${API_BASE}/api/connections`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const connectionsData = await connectionsResponse.json();
        const emiliaConnection = connectionsData.data.find(conn => 
            conn.child1_name === 'Emilia' || conn.child2_name === 'Emilia'
        );
        
        console.log(`Connection ID: ${emiliaConnection.id}`);
        console.log(`Status: ${emiliaConnection.status}`);
        console.log(`Child 1: ${emiliaConnection.child1_name} (ID: ${emiliaConnection.child1_id})`);
        console.log(`Child 2: ${emiliaConnection.child2_name} (ID: ${emiliaConnection.child2_id})`);
        
        // Now let's check if there are any pending_activity_invitations in the system
        // We can't query this directly, but we can check what the backend logic should do
        
        console.log('\n📤 Step 4: Checking if invitations were created when connection was accepted...');
        
        // Get date range for invitation check
        const today = new Date();
        const oneYearLater = new Date();
        oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
        const startDate = today.toISOString().split('T')[0];
        const endDate = oneYearLater.toISOString().split('T')[0];
        
        // Check invitations from test 3's perspective
        const test3InvitationsResponse = await fetch(`${API_BASE}/api/calendar/invitations?start=${startDate}&end=${endDate}&_t=${Date.now()}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const test3InvitationsData = await test3InvitationsResponse.json();
        
        console.log(`📊 Test 3 can see ${test3InvitationsData.data?.length || 0} invitations total`);
        
        const sentToEmilia = test3InvitationsData.data?.filter(inv => inv.invited_child_name === 'Emilia') || [];
        console.log(`📤 ${sentToEmilia.length} invitations sent to Emilia from test 3`);
        
        // Check invitations from Emilia's perspective  
        console.log('\n👶 Step 5: Checking from Emilia\'s perspective...');
        
        const emiliaLoginResponse = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'roberts@example.com', password: 'test123' })
        });
        const emiliaLoginData = await emiliaLoginResponse.json();
        
        if (emiliaLoginData.success) {
            const emiliaInvitationsResponse = await fetch(`${API_BASE}/api/calendar/invitations?start=${startDate}&end=${endDate}&_t=${Date.now()}`, {
                headers: { 'Authorization': `Bearer ${emiliaLoginData.token}` }
            });
            const emiliaInvitationsData = await emiliaInvitationsResponse.json();
            
            console.log(`📊 Emilia can see ${emiliaInvitationsData.data?.length || 0} invitations total`);
            
            const fromTest3 = emiliaInvitationsData.data?.filter(inv => 
                inv.host_parent_username === loginData.user.username
            ) || [];
            console.log(`📥 ${fromTest3.length} invitations received from test 3`);
            
            fromTest3.forEach((inv, i) => {
                console.log(`   ${i+1}. "${inv.activity_name}" - Status: ${inv.status}`);
            });
        }
        
        console.log('\n' + '=' .repeat(60));
        console.log('🔍 PENDING INVITATIONS FLOW DIAGNOSIS:');
        
        console.log('\n📝 EXPECTED FLOW:');
        console.log('1. ✅ Test 3 creates activity');
        console.log('2. ✅ Test 3 connects with Emilia');  
        console.log('3. ❓ Test 3 goes back to activity, selects Emilia as "pending connection"');
        console.log('4. ❓ System stores entry in pending_activity_invitations table');
        console.log('5. ✅ Emilia accepts connection'); 
        console.log('6. ❓ processAutoNotifications should send invitation to Emilia');
        console.log('7. ❌ Emilia should receive invitation (NOT HAPPENING)');
        
        console.log('\n🔧 POSSIBLE ISSUES:');
        if (sentToEmilia.length === 0) {
            console.log('❌ No invitations sent to Emilia at all');
            console.log('   - Pending invitation may not have been stored');
            console.log('   - processAutoNotifications may not have run');
            console.log('   - Connection acceptance may not trigger invitation sending');
        }
        
        console.log('\n🧪 NEXT DEBUGGING STEPS:');
        console.log('1. Check if pending_activity_invitations table has entries');
        console.log('2. Verify processAutoNotifications is called when connection accepted');
        console.log('3. Test the "pending connection" selection UI flow');
        
    } catch (error) {
        console.error('❌ Debug error:', error.message);
    }
}

debugPendingInvitationsFlow();