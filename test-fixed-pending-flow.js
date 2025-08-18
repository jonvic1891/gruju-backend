#!/usr/bin/env node

const fetch = require('node-fetch');

const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com';

async function testFixedPendingFlow() {
    try {
        console.log('🧪 FIXED PENDING INVITATIONS FLOW TEST');
        console.log('='.repeat(50));
        
        // Step 1: Login as host user
        console.log('\n1. LOGIN AS HOST USER...');
        const hostLoginResponse = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'jonathan.roberts006@hotmail.co.uk', password: 'test123' })
        });
        
        const hostLoginData = await hostLoginResponse.json();
        if (!hostLoginData.success) {
            console.log('❌ Host login failed');
            return;
        }
        console.log('✅ Host login successful');
        const hostToken = hostLoginData.token;
        const hostUuid = hostLoginData.user.uuid;
        
        // Step 2: Login as Emilia
        console.log('\n2. LOGIN AS EMILIA...');
        const emiliaLoginResponse = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'roberts@example.com', password: 'test123' })
        });
        
        const emiliaLoginData = await emiliaLoginResponse.json();
        if (!emiliaLoginData.success) {
            console.log('❌ Emilia login failed');
            return;
        }
        console.log('✅ Emilia login successful');
        const emiliaToken = emiliaLoginData.token;
        const emiliaUuid = emiliaLoginData.user.uuid;
        const emiliaId = emiliaLoginData.user.id;
        
        // Step 3: Get children
        console.log('\n3. GET CHILDREN...');
        const hostChildrenResponse = await fetch(`${API_BASE}/api/children`, {
            headers: { 'Authorization': `Bearer ${hostToken}` }
        });
        const hostChildrenData = await hostChildrenResponse.json();
        const hostChild = hostChildrenData.data[0];
        
        const emiliaChildrenResponse = await fetch(`${API_BASE}/api/children`, {
            headers: { 'Authorization': `Bearer ${emiliaToken}` }
        });
        const emiliaChildrenData = await emiliaChildrenResponse.json();
        const emiliaChild = emiliaChildrenData.data[0];
        
        console.log('👶 Host child:', hostChild.name);
        console.log('👶 Emilia child:', emiliaChild.name);
        
        // Step 4: Create test activity
        console.log('\n4. CREATE TEST ACTIVITY...');
        const testActivityData = {
            name: 'scroll1',
            description: 'Test activity for pending invitations',
            start_date: '2025-01-15',
            end_date: '2025-01-15',
            start_time: '14:00',
            end_time: '16:00',
            location: 'Test Location',
            max_participants: 10,
            cost: 0,
            auto_notify_new_connections: false
        };
        
        const createActivityResponse = await fetch(`${API_BASE}/api/activities/${hostChild.uuid}`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${hostToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(testActivityData)
        });
        
        const createActivityResult = await createActivityResponse.json();
        console.log('✅ Created activity result:', createActivityResult);
        
        // Get the correct activity UUID/ID from the response
        const activityUuid = createActivityResult.data?.uuid;
        const activityId = createActivityResult.data?.id;
        
        if (!activityUuid) {
            console.log('❌ No activity UUID found in response');
            return;
        }
        
        console.log('🎯 Activity UUID:', activityUuid);
        console.log('🎯 Activity ID:', activityId);
        
        // Step 5: Create pending invitation (using UUID as the endpoint expects)
        console.log('\n5. CREATE PENDING INVITATION...');
        const pendingKey = `pending-${emiliaUuid}`;
        console.log('🔑 Pending key:', pendingKey);
        
        const createPendingResponse = await fetch(`${API_BASE}/api/activities/${activityUuid}/pending-invitations`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${hostToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                pending_connections: [pendingKey]
            })
        });
        
        if (createPendingResponse.ok) {
            const pendingResult = await createPendingResponse.json();
            console.log('✅ Created pending invitation:', pendingResult);
        } else {
            const errorText = await createPendingResponse.text();
            console.log('❌ Failed to create pending invitation:', errorText);
            // Continue anyway to test other parts
        }
        
        // Step 6: Create connection request (using target_parent_id as ID, not email)
        console.log('\n6. CREATE CONNECTION REQUEST...');
        const connectionRequestData = {
            target_parent_id: emiliaId, // Use ID, not email
            child_uuid: hostChild.uuid,
            target_child_uuid: emiliaChild.uuid,
            message: 'Test connection request for pending invitations'
        };
        
        console.log('📤 Connection request data:', connectionRequestData);
        
        const createConnectionResponse = await fetch(`${API_BASE}/api/connections/request`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${hostToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(connectionRequestData)
        });
        
        if (createConnectionResponse.ok) {
            const connectionResult = await createConnectionResponse.json();
            console.log('✅ Created connection request:', connectionResult);
        } else {
            const errorText = await createConnectionResponse.text();
            console.log('❌ Failed to create connection request:', errorText);
            return;
        }
        
        // Step 7: Check Emilia's connection requests
        console.log('\n7. CHECK EMILIA\'S CONNECTION REQUESTS...');
        const emiliaRequestsResponse = await fetch(`${API_BASE}/api/connections/requests`, {
            headers: { 'Authorization': `Bearer ${emiliaToken}` }
        });
        const emiliaRequestsData = await emiliaRequestsResponse.json();
        console.log('📨 Emilia\'s connection requests:', emiliaRequestsData.data);
        
        const pendingRequest = emiliaRequestsData.data?.find(req => req.status === 'pending');
        if (!pendingRequest) {
            console.log('❌ No pending connection request found');
            return;
        }
        
        console.log('🔍 Found pending request UUID:', pendingRequest.uuid);
        
        // Step 8: Accept connection request as Emilia
        console.log('\n8. ACCEPT CONNECTION REQUEST...');
        const acceptResponse = await fetch(`${API_BASE}/api/connections/respond/${pendingRequest.uuid}`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${emiliaToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ action: 'accept' })
        });
        
        if (!acceptResponse.ok) {
            const errorText = await acceptResponse.text();
            console.log('❌ Failed to accept connection:', errorText);
            return;
        }
        
        const acceptResult = await acceptResponse.json();
        console.log('✅ Connection accepted:', acceptResult);
        
        // Step 9: Wait for processing
        console.log('\n9. WAITING FOR PROCESSING...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Step 10: Check Emilia's invitations
        console.log('\n10. CHECK EMILIA\'S INVITATIONS...');
        const today = new Date();
        const oneYearLater = new Date();
        oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
        const startDate = today.toISOString().split('T')[0];
        const endDate = oneYearLater.toISOString().split('T')[0];
        
        const invitationsResponse = await fetch(`${API_BASE}/api/calendar/invitations?start=${startDate}&end=${endDate}`, {
            headers: { 'Authorization': `Bearer ${emiliaToken}` }
        });
        const invitationsData = await invitationsResponse.json();
        
        console.log('📬 Emilia\'s invitations:', invitationsData.data);
        
        const scroll1Invitation = invitationsData.data?.find(inv => 
            inv.activity_name && inv.activity_name.toLowerCase().includes('scroll1')
        );
        
        // Results
        console.log('\n' + '='.repeat(50));
        console.log('🏥 RESULTS');
        console.log('='.repeat(50));
        
        if (scroll1Invitation) {
            console.log('🎉 SUCCESS! Emilia has the scroll1 invitation:', scroll1Invitation);
        } else {
            console.log('❌ FAILED! Emilia does not have the scroll1 invitation');
            
            // Try manual invitation as backup
            console.log('\n🔧 CREATING MANUAL INVITATION...');
            const manualInviteResponse = await fetch(`${API_BASE}/api/activities/${activityUuid}/invite`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${hostToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    invited_child_id: emiliaChild.id,
                    message: 'Manual invitation for scroll1 activity'
                })
            });
            
            if (manualInviteResponse.ok) {
                const manualResult = await manualInviteResponse.json();
                console.log('✅ Manual invitation created:', manualResult);
            } else {
                const errorText = await manualInviteResponse.text();
                console.log('❌ Manual invitation failed:', errorText);
            }
        }
        
        console.log('\n📋 DEBUGGING INFO:');
        console.log(`- Host UUID: ${hostUuid}`);
        console.log(`- Emilia UUID: ${emiliaUuid}`);
        console.log(`- Emilia ID: ${emiliaId}`);
        console.log(`- Activity UUID: ${activityUuid}`);
        console.log(`- Pending key used: pending-${emiliaUuid}`);
        
    } catch (error) {
        console.error('❌ Test error:', error.message);
    }
}

testFixedPendingFlow();