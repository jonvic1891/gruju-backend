#!/usr/bin/env node

const fetch = require('node-fetch');

const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com';

async function testFinalPendingFlow() {
    try {
        console.log('🧪 FINAL PENDING INVITATIONS FLOW TEST');
        console.log('='.repeat(50));
        
        // Step 1: Login as host (test3 user)
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
        
        console.log('👶 Host child:', hostChild.name, 'UUID:', hostChild.uuid);
        console.log('👶 Emilia child:', emiliaChild.name, 'UUID:', emiliaChild.uuid);
        
        // Step 4: Create test activity
        console.log('\n4. CREATE TEST ACTIVITY "SCROLL1"...');
        const testActivityData = {
            name: 'scroll1',
            description: 'Test activity for pending invitations system',
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
        
        if (!createActivityResponse.ok) {
            const errorText = await createActivityResponse.text();
            console.log('❌ Failed to create activity:', errorText);
            return;
        }
        
        const createActivityResult = await createActivityResponse.json();
        const activityUuid = createActivityResult.data?.uuid;
        console.log('✅ Created activity:', activityUuid);
        
        // Step 5: Create pending invitation
        console.log('\n5. CREATE PENDING INVITATION FOR EMILIA...');
        const pendingKey = `pending-${emiliaUuid}`;
        console.log('🔑 Using pending key:', pendingKey);
        
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
            console.log('✅ Pending invitation response:', pendingResult);
            if (pendingResult.data?.inserted_count > 0) {
                console.log('✅ Successfully created pending invitations');
            } else {
                console.log('⚠️ Pending invitation created but count is 0 - may already exist');
            }
        } else {
            const errorText = await createPendingResponse.text();
            console.log('❌ Failed to create pending invitation:', errorText);
        }
        
        // Step 6: Create connection request using UUID for target_parent_id
        console.log('\n6. CREATE CONNECTION REQUEST...');
        const connectionRequestData = {
            target_parent_id: emiliaUuid, // Use UUID - backend will convert to DB ID
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
        
        if (!createConnectionResponse.ok) {
            const errorText = await createConnectionResponse.text();
            console.log('❌ Failed to create connection request:', errorText);
            return;
        }
        
        const connectionResult = await createConnectionResponse.json();
        console.log('✅ Created connection request:', connectionResult);
        
        // Step 7: Check Emilia's connection requests
        console.log('\n7. CHECK EMILIA\'S CONNECTION REQUESTS...');
        const emiliaRequestsResponse = await fetch(`${API_BASE}/api/connections/requests`, {
            headers: { 'Authorization': `Bearer ${emiliaToken}` }
        });
        const emiliaRequestsData = await emiliaRequestsResponse.json();
        console.log('📨 Emilia\'s connection requests:', emiliaRequestsData.data);
        
        const pendingRequest = emiliaRequestsData.data?.find(req => req.status === 'pending');
        if (!pendingRequest) {
            console.log('❌ No pending connection request found for Emilia');
            return;
        }
        
        console.log('🔍 Found pending request UUID:', pendingRequest.request_uuid || pendingRequest.uuid);
        
        // Step 8: Accept the connection request as Emilia
        console.log('\n8. ACCEPT CONNECTION REQUEST AS EMILIA...');
        const acceptResponse = await fetch(`${API_BASE}/api/connections/respond/${pendingRequest.request_uuid || pendingRequest.uuid}`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${emiliaToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ action: 'accept' })
        });
        
        if (!acceptResponse.ok) {
            const errorText = await acceptResponse.text();
            console.log('❌ Failed to accept connection request:', errorText);
            return;
        }
        
        const acceptResult = await acceptResponse.json();
        console.log('✅ Connection request accepted:', acceptResult);
        console.log('🔔 This should trigger processPendingInvitations() in backend');
        
        // Step 9: Wait for pending invitations processing
        console.log('\n9. WAITING FOR PENDING INVITATIONS PROCESSING...');
        console.log('⏳ Waiting 3 seconds for backend processing...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Step 10: Check if Emilia now has the scroll1 invitation
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
        
        console.log('📬 All of Emilia\'s invitations:');
        (invitationsData.data || []).forEach(inv => {
            console.log(`   - "${inv.activity_name}" (Status: ${inv.status}, From: ${inv.inviter_parent_username || inv.host_parent_username})`);
        });
        
        const scroll1Invitation = invitationsData.data?.find(inv => 
            inv.activity_name && inv.activity_name.toLowerCase().includes('scroll1')
        );
        
        // Step 11: Final results and diagnosis
        console.log('\n' + '='.repeat(50));
        console.log('🏥 DIAGNOSIS RESULTS');
        console.log('='.repeat(50));
        
        if (scroll1Invitation) {
            console.log('🎉 SUCCESS! Pending invitations system is working correctly!');
            console.log('✅ Emilia received the scroll1 invitation:', {
                name: scroll1Invitation.activity_name,
                status: scroll1Invitation.status,
                from: scroll1Invitation.inviter_parent_username || scroll1Invitation.host_parent_username,
                message: scroll1Invitation.message
            });
            
            console.log('\n📱 EMILIA SHOULD NOW SEE IN HER APP:');
            console.log('1. Login as roberts@example.com / test123');
            console.log('2. Go to Children screen');
            console.log('3. Check pending invitations for Emilia');
            console.log('4. Should see invitation for "scroll1" activity');
            
        } else {
            console.log('❌ ISSUE CONFIRMED: Pending invitations system is not working correctly');
            console.log('🔍 Emilia did not receive the scroll1 invitation after connection acceptance');
            
            console.log('\n📋 POSSIBLE ROOT CAUSES:');
            console.log('1. processPendingInvitations() function not being called');
            console.log('2. Pending invitation was not stored correctly in pending_activity_invitations table');
            console.log('3. Wrong pending connection key format');
            console.log('4. Database constraint preventing invitation creation');
            console.log('5. Logic error in invitation creation process');
            
            console.log('\n🔧 MANUAL FIX - CREATE INVITATION DIRECTLY:');
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
                console.log('✅ Manual invitation created successfully:', manualResult);
                console.log('📱 Emilia should now see the invitation (reload app)');
            } else {
                const errorText = await manualInviteResponse.text();
                console.log('❌ Manual invitation also failed:', errorText);
            }
        }
        
        console.log('\n📊 TEST SUMMARY:');
        console.log(`- Host: ${hostLoginData.user.username} (${hostUuid})`);
        console.log(`- Target: ${emiliaLoginData.user.username} (${emiliaUuid})`);
        console.log(`- Activity UUID: ${activityUuid}`);
        console.log(`- Pending key: pending-${emiliaUuid}`);
        console.log(`- Connection created: ✅`);
        console.log(`- Connection accepted: ✅`);
        console.log(`- Invitation received: ${scroll1Invitation ? '✅' : '❌'}`);
        
        if (!scroll1Invitation) {
            console.log('\n🔧 NEXT STEPS FOR DEBUGGING:');
            console.log('1. Check Heroku logs during connection acceptance');
            console.log('2. Verify pending_activity_invitations table has the entry');
            console.log('3. Debug processPendingInvitations() function execution');
            console.log('4. Check if invitation creation logic has constraints preventing success');
        }
        
    } catch (error) {
        console.error('❌ Test error:', error.message);
        console.error('Stack trace:', error.stack);
    }
}

testFinalPendingFlow();