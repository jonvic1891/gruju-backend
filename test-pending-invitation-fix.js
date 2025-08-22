const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com';

async function testPendingInvitationFix() {
    console.log('🧪 Testing pending invitation fix...');
    
    try {
        // Login as davis@example.com
        const loginResponse = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'davis@example.com',
                password: 'demo123'
            })
        });
        
        if (!loginResponse.ok) {
            throw new Error(`Login failed: ${loginResponse.status}`);
        }
        
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
        console.log('📋 Children:', children.map(c => ({ name: c.name, uuid: c.uuid })));
        
        if (children.length === 0) {
            throw new Error('No children found for davis@example.com');
        }
        
        const child = children[0];
        
        // Create a test activity
        const activityData = {
            name: `Test Pending Fix ${Date.now()}`,
            description: 'Testing pending invitation fix',
            start_date: '2025-08-20',
            end_date: '2025-08-20',
            start_time: '10:00',
            end_time: '12:00',
            location: 'Test Location',
            website_url: '',
            auto_notify_new_connections: false,
            is_shared: true
        };
        
        const createResponse = await fetch(`${API_BASE}/api/activities/${child.uuid}`, {
            method: 'POST',
            headers,
            body: JSON.stringify(activityData)
        });
        
        if (!createResponse.ok) {
            throw new Error(`Activity creation failed: ${createResponse.status}`);
        }
        
        const activityResult = await createResponse.json();
        const activity = activityResult.data;
        console.log('✅ Created activity:', activity.name, 'UUID:', activity.uuid);
        
        // Get connection requests to find a target child
        const requestsResponse = await fetch(`${API_BASE}/api/connections/requests`, {
            headers
        });
        const requestsData = await requestsResponse.json();
        const requests = requestsData.data || requestsData;
        
        console.log('📋 Available connection requests:', requests.length);
        
        if (requests.length === 0) {
            console.log('⚠️ No connection requests available to test with');
            return;
        }
        
        // Use the first connection request
        const request = requests[0];
        console.log('🎯 Using connection request:', {
            child_name: request.child_name,
            target_child_uuid: request.target_child_uuid,
            target_parent_uuid: request.target_parent_uuid
        });
        
        // Create pending invitation using the new format
        const pendingConnectionId = `pending-child-${request.target_child_uuid || request.target_parent_uuid}`;
        
        const pendingResponse = await fetch(`${API_BASE}/api/activities/${activity.uuid}/pending-invitations`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                pending_connections: [pendingConnectionId]
            })
        });
        
        if (!pendingResponse.ok) {
            throw new Error(`Pending invitation creation failed: ${pendingResponse.status}`);
        }
        
        console.log('✅ Created pending invitation with ID:', pendingConnectionId);
        
        // Wait a moment for database to update
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Check participants API
        const participantsResponse = await fetch(`${API_BASE}/api/activities/${activity.uuid}/participants`, {
            headers
        });
        
        if (!participantsResponse.ok) {
            throw new Error(`Participants API failed: ${participantsResponse.status}`);
        }
        
        const participantsData = await participantsResponse.json();
        console.log('📊 Participants API response:', participantsData);
        
        const participants = participantsData.data?.participants || participantsData.participants || [];
        const pendingParticipants = participants.filter(p => p.status === 'pending');
        
        console.log('👥 Pending participants found:', pendingParticipants.length);
        
        if (pendingParticipants.length === 0) {
            console.log('❌ No pending participants found');
            return;
        }
        
        // Check if the participant has proper parent and child information
        const participant = pendingParticipants[0];
        console.log('🔍 Pending participant details:', {
            parent_name: participant.parent_name,
            child_name: participant.child_name,
            child_uuid: participant.child_uuid,
            status: participant.status,
            invitation_type: participant.invitation_type
        });
        
        if (participant.parent_name && participant.child_name && participant.child_uuid) {
            console.log('🎉 SUCCESS! Pending invitation now shows proper parent and child information');
            console.log('✅ Fix is working correctly');
        } else {
            console.log('❌ FAILED! Pending invitation still has null values:');
            console.log('   parent_name:', participant.parent_name);
            console.log('   child_name:', participant.child_name);
            console.log('   child_uuid:', participant.child_uuid);
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

if (require.main === module) {
    testPendingInvitationFix().catch(console.error);
}

module.exports = { testPendingInvitationFix };