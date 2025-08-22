const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com';

async function testPendingToInvitationFlow() {
    console.log('🧪 Testing pending invitation → activity invitation flow...');
    
    try {
        // Login as davis 
        const loginResponse = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'davis@example.com',
                password: 'demo123'
            })
        });
        
        const loginData = await loginResponse.json();
        const token = loginData.token;
        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
        
        console.log('✅ Logged in as davis@example.com');
        
        // Get children
        const childrenResponse = await fetch(`${API_BASE}/api/children`, {
            headers
        });
        const childrenData = await childrenResponse.json();
        const children = childrenData.data || childrenData;
        const child = children[0];
        
        // Step 1: Create activity with a pending invitation
        console.log('\n🔍 Step 1: Creating activity with pending invitation...');
        const activityData = {
            name: `Pending Flow Test ${Date.now()}`,
            description: 'Testing pending to invitation conversion',
            start_date: '2025-08-29',
            end_date: '2025-08-29',
            start_time: '10:00',
            end_time: '12:00',
            location: 'Test Location',
            website_url: '',
            auto_notify_new_connections: false, // This should NOT matter for pending invitations
            is_shared: true
        };
        
        const createResponse = await fetch(`${API_BASE}/api/activities/${child.uuid}`, {
            method: 'POST',
            headers,
            body: JSON.stringify(activityData)
        });
        
        const activityResult = await createResponse.json();
        const activity = activityResult.data;
        console.log('✅ Created activity:');
        console.log(`   Name: ${activity.name}`);
        console.log(`   UUID: ${activity.uuid}`);
        console.log(`   Auto-notify: ${activity.auto_notify_new_connections}`);
        
        // Step 2: Get available sent requests to create pending invitation
        const sentResponse = await fetch(`${API_BASE}/api/connections/sent-requests`, {
            headers
        });
        const sentData = await sentResponse.json();
        
        if (!sentData.data || sentData.data.length === 0) {
            console.log('❌ No sent connection requests available for testing');
            return;
        }
        
        const req = sentData.data[0];
        const pendingId = `pending-child-${req.target_child_uuid || req.target_parent_uuid}`;
        
        console.log('\n🔍 Step 2: Adding pending invitation...');
        console.log(`   Pending connection ID: ${pendingId}`);
        console.log(`   Target parent: ${req.target_parent_name}`);
        console.log(`   Target child: ${req.target_child_name} (${req.target_child_uuid})`);
        
        const pendingResponse = await fetch(`${API_BASE}/api/activities/${activity.uuid}/pending-invitations`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ pending_connections: [pendingId] })
        });
        
        if (!pendingResponse.ok) {
            console.log('❌ Failed to create pending invitation');
            return;
        }
        
        console.log('✅ Created pending invitation');
        
        // Step 3: Check participants before connection acceptance
        console.log('\n🔍 Step 3: Checking participants before connection acceptance...');
        const participantsBefore = await fetch(`${API_BASE}/api/activities/${activity.uuid}/participants`, {
            headers
        });
        const participantsBeforeData = await participantsBefore.json();
        const pendingParticipants = participantsBeforeData.data?.participants?.filter(p => p.status === 'pending') || [];
        
        console.log(`   Pending participants: ${pendingParticipants.length}`);
        if (pendingParticipants.length > 0) {
            const p = pendingParticipants[0];
            console.log(`   - ${p.parent_name} - ${p.child_name} (${p.invitation_type})`);
        }
        
        // Step 4: Accept the connection request (this should trigger conversion)
        console.log('\n🔍 Step 4: Simulating connection acceptance...');
        console.log('💡 This would normally be done by the target user accepting the connection request');
        console.log(`💡 Connection request UUID: ${req.request_uuid}`);
        console.log('💡 When accepted, the system should:');
        console.log('   1. Create the connection');
        console.log('   2. Find pending invitations that match this connection');
        console.log('   3. Convert them to actual activity invitations');
        console.log('   4. Send notifications');
        
        // We can't actually accept the connection from this user (davis) because
        // davis sent the request, so the target user would need to accept it
        
        // Step 5: Check what SHOULD happen in the backend
        console.log('\n🔍 Step 5: Checking backend logic expectations...');
        console.log('📋 When connection is accepted, processPendingInvitations should:');
        console.log('   1. Find all pending_activity_invitations with matching connection IDs');
        console.log('   2. Convert them to activity_invitations');
        console.log('   3. Delete the pending_activity_invitations');
        console.log('   4. Send notifications regardless of auto_notify_new_connections flag');
        
        // Let's check if there are any existing activity invitations for this activity
        console.log('\n🔍 Step 6: Checking for existing activity invitations...');
        
        // Check if davis has any activity invitations (as the invited person)
        const invitationsResponse = await fetch(`${API_BASE}/api/activity-invitations`, {
            headers
        });
        
        if (invitationsResponse.ok) {
            const invitationsData = await invitationsResponse.json();
            const activityInvitations = invitationsData.data || invitationsData || [];
            console.log(`   Davis has ${activityInvitations.length} activity invitations`);
            
            // Check if any are for our test activity
            const ourInvitations = activityInvitations.filter(inv => 
                inv.activity_name && inv.activity_name.includes('Pending Flow Test')
            );
            console.log(`   Invitations for our test activities: ${ourInvitations.length}`);
        }
        
        console.log('\n📊 Summary of what should happen:');
        console.log('   1. ✅ Activity created with pending invitation');
        console.log('   2. ✅ Pending invitation stored with correct parent/child UUIDs');
        console.log('   3. ⏳ When target user accepts connection request:');
        console.log('      → processPendingInvitations should find pending invitation');
        console.log('      → Convert to activity_invitations record');
        console.log('      → Send notification to target user');
        console.log('      → This should work regardless of auto_notify_new_connections flag');
        
        console.log('\n🎯 To complete this test, need target user to accept connection request:');
        console.log(`   Connection request UUID: ${req.request_uuid}`);
        console.log(`   Target user should accept this request to trigger the conversion`);
        
        return {
            activityUuid: activity.uuid,
            connectionRequestUuid: req.request_uuid,
            targetParent: req.target_parent_name,
            targetChild: req.target_child_name
        };
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

testPendingToInvitationFlow().catch(console.error);