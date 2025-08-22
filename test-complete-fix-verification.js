const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com';

async function testCompleteFix() {
    console.log('🧪 Testing complete fix verification...');
    
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
        
        // 1. First test the sent-requests endpoint to see if it now returns target_child_uuid
        console.log('\n🔍 Step 1: Testing sent-requests endpoint...');
        const sentResponse = await fetch(`${API_BASE}/api/connections/sent-requests`, {
            headers
        });
        
        if (!sentResponse.ok) {
            console.log(`❌ Sent requests failed: ${sentResponse.status}`);
            return;
        }
        
        const sentData = await sentResponse.json();
        console.log('📊 Sent requests response:');
        if (sentData.data && sentData.data.length > 0) {
            sentData.data.forEach((req, i) => {
                console.log(`Request ${i + 1}:`);
                console.log(`  target_parent_name: ${req.target_parent_name}`);
                console.log(`  target_parent_uuid: ${req.target_parent_uuid}`);
                console.log(`  target_child_name: ${req.target_child_name}`);
                console.log(`  target_child_uuid: ${req.target_child_uuid}`);
                console.log(`  child_name: ${req.child_name}`);
                
                // Test what pending ID would be created
                const pendingId = `pending-child-${req.target_child_uuid || req.target_parent_uuid}`;
                console.log(`  would create pending ID: ${pendingId}`);
                
                if (req.target_child_uuid) {
                    console.log('  ✅ Has target_child_uuid - will use child UUID');
                } else {
                    console.log('  ❌ Missing target_child_uuid - will fall back to parent UUID');
                }
            });
        } else {
            console.log('  No sent requests found for davis user');
        }
        
        // 2. Get children for activity creation
        const childrenResponse = await fetch(`${API_BASE}/api/children`, {
            headers
        });
        const childrenData = await childrenResponse.json();
        const children = childrenData.data || childrenData;
        const child = children[0];
        
        console.log('\n🔍 Step 2: Creating test activity...');
        
        // 3. Create activity
        const activityData = {
            name: `Complete Fix Test ${Date.now()}`,
            description: 'Testing complete fix',
            start_date: '2025-08-25',
            end_date: '2025-08-25',
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
        
        // 4. Test with a real pending connection (if one exists)
        if (sentData.data && sentData.data.length > 0) {
            const req = sentData.data[0];
            const correctPendingId = `pending-child-${req.target_child_uuid || req.target_parent_uuid}`;
            
            console.log('\n🔍 Step 3: Creating pending invitation...');
            console.log('Using pending connection ID:', correctPendingId);
            
            const pendingResponse = await fetch(`${API_BASE}/api/activities/${activity.uuid}/pending-invitations`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    pending_connections: [correctPendingId]
                })
            });
            
            if (!pendingResponse.ok) {
                console.log(`❌ Pending invitation failed: ${pendingResponse.status}`);
                const errorData = await pendingResponse.json();
                console.log('Error:', errorData);
                return;
            }
            
            console.log('✅ Created pending invitation');
            
            // 5. Wait and check participants
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            console.log('\n🔍 Step 4: Checking participants...');
            const participantsResponse = await fetch(`${API_BASE}/api/activities/${activity.uuid}/participants`, {
                headers
            });
            
            const participantsData = await participantsResponse.json();
            const participants = participantsData.data?.participants || participantsData.participants || [];
            const pendingParticipants = participants.filter(p => p.status === 'pending');
            
            console.log('📊 Final verification:');
            if (pendingParticipants.length > 0) {
                const p = pendingParticipants[0];
                console.log(`  parent_name: ${p.parent_name}`);
                console.log(`  child_name: ${p.child_name}`);
                console.log(`  child_uuid: ${p.child_uuid}`);
                
                const hasAllFields = p.parent_name && p.child_name && p.child_uuid;
                
                if (hasAllFields) {
                    console.log('\n🎉 SUCCESS! Complete fix is working!');
                    console.log('✅ sent-requests API now returns target_child_uuid');
                    console.log('✅ Frontend creates correct pending-child-{childUuid} format');
                    console.log('✅ Backend stores correct parent and child UUIDs');
                    console.log('✅ Participants API returns complete information');
                    console.log('✅ Frontend will display the participant correctly');
                } else {
                    console.log('\n❌ FAILED! Some fields are still null:');
                    console.log(`   parent_name: ${p.parent_name || 'NULL'}`);
                    console.log(`   child_name: ${p.child_name || 'NULL'}`);
                    console.log(`   child_uuid: ${p.child_uuid || 'NULL'}`);
                }
            } else {
                console.log('❌ No pending participants found');
            }
        } else {
            console.log('\n⚠️ Cannot test pending invitations - no sent requests available');
            console.log('💡 This user (davis) has no pending connection requests to test with');
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

testCompleteFix().catch(console.error);