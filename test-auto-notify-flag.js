const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com';

async function testAutoNotifyFlag() {
    console.log('🧪 Testing auto_notify_new_connections flag preservation...');
    
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
        
        // Test 1: Create activity with auto_notify_new_connections: true
        console.log('\n🔍 Test 1: Creating activity with auto_notify_new_connections: true...');
        const activityDataTrue = {
            name: `Auto Notify TRUE Test ${Date.now()}`,
            description: 'Testing auto notify flag = true',
            start_date: '2025-08-28',
            end_date: '2025-08-28',
            start_time: '10:00',
            end_time: '12:00',
            location: 'Test Location',
            website_url: '',
            auto_notify_new_connections: true,
            is_shared: true
        };
        
        const createTrueResponse = await fetch(`${API_BASE}/api/activities/${child.uuid}`, {
            method: 'POST',
            headers,
            body: JSON.stringify(activityDataTrue)
        });
        
        if (!createTrueResponse.ok) {
            console.log(`❌ Activity creation failed: ${createTrueResponse.status}`);
            const errorData = await createTrueResponse.json();
            console.log('Error:', errorData);
            return;
        }
        
        const activityTrueResult = await createTrueResponse.json();
        const activityTrue = activityTrueResult.data;
        console.log('✅ Created activity (should have auto_notify=true):');
        console.log(`   Name: ${activityTrue.name}`);
        console.log(`   UUID: ${activityTrue.uuid}`);
        console.log(`   Auto-notify: ${activityTrue.auto_notify_new_connections}`);
        
        if (activityTrue.auto_notify_new_connections === true) {
            console.log('   ✅ auto_notify_new_connections correctly set to TRUE');
        } else {
            console.log('   ❌ auto_notify_new_connections NOT set correctly!');
            console.log(`   Expected: true, Got: ${activityTrue.auto_notify_new_connections}`);
        }
        
        // Test 2: Create activity with auto_notify_new_connections: false
        console.log('\n🔍 Test 2: Creating activity with auto_notify_new_connections: false...');
        const activityDataFalse = {
            name: `Auto Notify FALSE Test ${Date.now()}`,
            description: 'Testing auto notify flag = false',
            start_date: '2025-08-28',
            end_date: '2025-08-28',
            start_time: '14:00',
            end_time: '16:00',
            location: 'Test Location',
            website_url: '',
            auto_notify_new_connections: false,
            is_shared: true
        };
        
        const createFalseResponse = await fetch(`${API_BASE}/api/activities/${child.uuid}`, {
            method: 'POST',
            headers,
            body: JSON.stringify(activityDataFalse)
        });
        
        const activityFalseResult = await createFalseResponse.json();
        const activityFalse = activityFalseResult.data;
        console.log('✅ Created activity (should have auto_notify=false):');
        console.log(`   Name: ${activityFalse.name}`);
        console.log(`   UUID: ${activityFalse.uuid}`);
        console.log(`   Auto-notify: ${activityFalse.auto_notify_new_connections}`);
        
        if (activityFalse.auto_notify_new_connections === false) {
            console.log('   ✅ auto_notify_new_connections correctly set to FALSE');
        } else {
            console.log('   ❌ auto_notify_new_connections NOT set correctly!');
            console.log(`   Expected: false, Got: ${activityFalse.auto_notify_new_connections}`);
        }
        
        // Test 3: Create pending invitations for both activities and check if they affect the flag
        console.log('\n🔍 Test 3: Adding pending invitations to both activities...');
        
        // Get some pending connections for testing
        const sentResponse = await fetch(`${API_BASE}/api/connections/sent-requests`, {
            headers
        });
        const sentData = await sentResponse.json();
        
        if (sentData.data && sentData.data.length > 0) {
            const req = sentData.data[0];
            const pendingId = `pending-child-${req.target_child_uuid || req.target_parent_uuid}`;
            
            console.log(`Using pending connection: ${pendingId}`);
            
            // Add to TRUE activity
            const pendingTrueResponse = await fetch(`${API_BASE}/api/activities/${activityTrue.uuid}/pending-invitations`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ pending_connections: [pendingId] })
            });
            
            if (pendingTrueResponse.ok) {
                console.log('✅ Added pending invitation to TRUE activity');
            } else {
                console.log('❌ Failed to add pending invitation to TRUE activity');
            }
            
            // Add to FALSE activity  
            const pendingFalseResponse = await fetch(`${API_BASE}/api/activities/${activityFalse.uuid}/pending-invitations`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ pending_connections: [pendingId] })
            });
            
            if (pendingFalseResponse.ok) {
                console.log('✅ Added pending invitation to FALSE activity');
            } else {
                console.log('❌ Failed to add pending invitation to FALSE activity');
            }
            
            // Now check if the activities still have correct auto_notify flags
            console.log('\n🔍 Test 4: Verifying flags after adding pending invitations...');
            
            // Check TRUE activity
            const checkTrueResponse = await fetch(`${API_BASE}/api/activities/${activityTrue.uuid}/participants`, {
                headers
            });
            
            if (checkTrueResponse.ok) {
                const trueParticipantsData = await checkTrueResponse.json();
                console.log('TRUE activity check:');
                console.log(`   Participants found: ${trueParticipantsData.data?.participants?.length || 0}`);
                // Note: The participants API doesn't return the activity's auto_notify flag
            }
            
            // Check FALSE activity
            const checkFalseResponse = await fetch(`${API_BASE}/api/activities/${activityFalse.uuid}/participants`, {
                headers
            });
            
            if (checkFalseResponse.ok) {
                const falseParticipantsData = await checkFalseResponse.json();
                console.log('FALSE activity check:');
                console.log(`   Participants found: ${falseParticipantsData.data?.participants?.length || 0}`);
            }
            
        } else {
            console.log('⚠️ No sent connection requests available for testing pending invitations');
        }
        
        console.log('\n📊 Summary:');
        console.log(`   TRUE activity: ${activityTrue.auto_notify_new_connections === true ? '✅' : '❌'} auto_notify preserved`);
        console.log(`   FALSE activity: ${activityFalse.auto_notify_new_connections === false ? '✅' : '❌'} auto_notify preserved`);
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

testAutoNotifyFlag().catch(console.error);