const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com';

async function testActualActivity() {
    console.log('🧪 Testing actual activity from your traces...');
    
    try {
        // We can't use the exact token from your trace (it expires), so let's just try to call the API directly
        // Using your activity ID from the traces
        const activityId = 'bba27f05-4a89-42e5-89ae-edab1c18a64c';
        
        // Login as a test user to get a token
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
        
        // Try to access the participants API for the activity from your trace
        console.log('🔍 Testing participants API for activity:', activityId);
        
        const participantsResponse = await fetch(`${API_BASE}/api/activities/${activityId}/participants`, {
            headers
        });
        
        if (participantsResponse.status === 403) {
            console.log('❌ Permission denied - davis user cannot access this activity (expected)');
            console.log('💡 This is normal - the activity belongs to a different user');
            return;
        }
        
        if (!participantsResponse.ok) {
            console.log(`❌ Participants API failed: ${participantsResponse.status}`);
            const errorData = await participantsResponse.json();
            console.log('Error:', errorData);
            return;
        }
        
        const participantsData = await participantsResponse.json();
        console.log('📊 Participants API response:', JSON.stringify(participantsData, null, 2));
        
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
            console.log(`  pending_connection_id from trace: pending-child-26ead642-0c1e-47e5-8d1f-0ad7dbf3c3b7`);
        });
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

testActualActivity().catch(console.error);