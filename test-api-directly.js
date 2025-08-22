const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com';

async function testApiDirectly() {
    console.log('🧪 Testing API directly...');
    
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
        
        console.log('📋 Using child:', child.name, child.uuid);
        
        // Create activity
        const activityData = {
            name: `Test API Direct ${Date.now()}`,
            description: 'Testing API directly',
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
        
        const activityResult = await createResponse.json();
        const activity = activityResult.data;
        console.log('✅ Created activity:', activity.uuid);
        
        // Test with a real child UUID from jon 14 (state 1)
        const realChildUuid = '50a8f1a2-10f6-4ee2-850d-2f53869fa473'; // state 1 from jon 14
        const pendingConnectionId = `pending-child-${realChildUuid}`;
        
        console.log('🎯 Testing with pending connection ID:', pendingConnectionId);
        
        // Create pending invitation
        const pendingResponse = await fetch(`${API_BASE}/api/activities/${activity.uuid}/pending-invitations`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                pending_connections: [pendingConnectionId]
            })
        });
        
        if (!pendingResponse.ok) {
            const errorData = await pendingResponse.json();
            console.log('❌ Pending invitation failed:', errorData);
            return;
        }
        
        const pendingData = await pendingResponse.json();
        console.log('✅ Created pending invitation:', pendingData);
        
        // Wait for database update
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Check participants
        const participantsResponse = await fetch(`${API_BASE}/api/activities/${activity.uuid}/participants`, {
            headers
        });
        
        const participantsData = await participantsResponse.json();
        console.log('📊 Participants response:', JSON.stringify(participantsData, null, 2));
        
        const participants = participantsData.data?.participants || participantsData.participants || [];
        const pendingParticipants = participants.filter(p => p.status === 'pending');
        
        console.log('\n🔍 Pending participants analysis:');
        pendingParticipants.forEach((p, i) => {
            console.log(`Participant ${i + 1}:`);
            console.log(`  parent_name: ${p.parent_name}`);
            console.log(`  child_name: ${p.child_name}`);
            console.log(`  child_uuid: ${p.child_uuid}`);
            console.log(`  status: ${p.status}`);
            console.log(`  invitation_type: ${p.invitation_type}`);
        });
        
        if (pendingParticipants.length > 0) {
            const p = pendingParticipants[0];
            if (p.parent_name && p.child_name && p.child_uuid) {
                console.log('\n🎉 SUCCESS! Fix is working - participant has all required fields');
            } else {
                console.log('\n❌ FAILED! Participant still has null values');
                console.log('  This means the fix did not work as expected');
            }
        } else {
            console.log('\n⚠️ No pending participants found');
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

testApiDirectly().catch(console.error);