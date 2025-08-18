#!/usr/bin/env node

const fetch = require('node-fetch');

const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com';

async function testPendingSystemUser134() {
    try {
        console.log('🧪 PENDING INVITATIONS SYSTEM TEST - USER 134');
        console.log('='.repeat(50));
        console.log('🎯 Target: roberts11@example.com (confirmed mobile app user)');
        console.log('🔐 Using only UUIDs and correct API parameters');
        
        // Step 1: Login as host
        console.log('\n1. LOGIN AS HOST USER...');
        const hostLoginResponse = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'jonathan.roberts006@hotmail.co.uk', password: 'test123' })
        });
        
        const hostLoginData = await hostLoginResponse.json();
        const hostToken = hostLoginData.token;
        const hostUuid = hostLoginData.user.uuid;
        console.log('✅ Host UUID:', hostUuid);
        
        // Step 2: Login as mobile app user (confirmed user 134)
        console.log('\n2. LOGIN AS MOBILE APP USER (roberts11@example.com)...');
        const mobileLoginResponse = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'roberts11@example.com', password: 'test123' })
        });
        
        const mobileLoginData = await mobileLoginResponse.json();
        const mobileToken = mobileLoginData.token;
        const mobileUserUuid = mobileLoginData.user.uuid;
        console.log('✅ Mobile user UUID:', mobileUserUuid);
        
        // Step 3: Get children
        console.log('\n3. GET CHILDREN...');
        const hostChildrenResponse = await fetch(`${API_BASE}/api/children`, {
            headers: { 'Authorization': `Bearer ${hostToken}` }
        });
        const hostChildrenData = await hostChildrenResponse.json();
        const hostChild = hostChildrenData.data[0];
        
        const mobileChildrenResponse = await fetch(`${API_BASE}/api/children`, {
            headers: { 'Authorization': `Bearer ${mobileToken}` }
        });
        const mobileChildrenData = await mobileChildrenResponse.json();
        const mobileChild = mobileChildrenData.data[0];
        
        console.log('👶 Host child:', hostChild.name, 'UUID:', hostChild.uuid);
        console.log('👶 Mobile child:', mobileChild.name, 'UUID:', mobileChild.uuid);
        
        // Step 4: Create test activity
        console.log('\n4. CREATE TEST ACTIVITY "PENDING FLOW TEST"...');
        const testActivityData = {
            name: 'Pending Flow Test',
            description: 'Testing complete pending invitations flow',
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
        const activityUuid = createActivityResult.data?.uuid;
        console.log('✅ Created activity UUID:', activityUuid);
        
        // Step 5: Create pending invitation
        console.log('\n5. CREATE PENDING INVITATION...');
        const pendingKey = `pending-${mobileUserUuid}`;
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
            console.log('✅ Pending invitation created:', pendingResult);
        } else {
            const errorText = await createPendingResponse.text();
            console.log('❌ Failed to create pending invitation:', errorText);
            return;
        }
        
        // Step 6: Create connection request (UUID-based)
        console.log('\n6. CREATE CONNECTION REQUEST...');
        const connectionRequestData = {
            target_parent_id: mobileUserUuid, // Use UUID
            child_uuid: hostChild.uuid,
            target_child_uuid: mobileChild.uuid,
            message: 'Test connection for pending invitations'
        };
        
        console.log('📤 Connection request data:', connectionRequestData);
        console.log('🔐 All parameters are UUIDs');
        
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
            console.log('✅ Connection request created:', connectionResult);
        } else {
            const errorText = await createConnectionResponse.text();
            console.log('❌ Failed to create connection request:', errorText);
            return;
        }
        
        // Step 7: Check connection requests
        console.log('\n7. CHECK MOBILE USER CONNECTION REQUESTS...');
        const connectionRequestsResponse = await fetch(`${API_BASE}/api/connections/requests`, {
            headers: { 'Authorization': `Bearer ${mobileToken}` }
        });
        const connectionRequestsData = await connectionRequestsResponse.json();
        
        const pendingRequest = connectionRequestsData.data?.find(req => req.status === 'pending');
        if (!pendingRequest) {
            console.log('❌ No pending connection request found');
            console.log('📋 Existing requests:', connectionRequestsData.data);
            return;
        }
        
        const requestUuid = pendingRequest.request_uuid || pendingRequest.uuid;
        console.log('🔍 Found pending request UUID:', requestUuid);
        
        // Step 8: Accept connection request
        console.log('\n8. ACCEPT CONNECTION REQUEST...');
        console.log('🔔 This should trigger processPendingInvitations()');
        
        const acceptResponse = await fetch(`${API_BASE}/api/connections/respond/${requestUuid}`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${mobileToken}`,
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
        
        // Step 9: Wait for backend processing
        console.log('\n9. WAITING FOR BACKEND PROCESSING...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Step 10: Check for the invitation
        console.log('\n10. CHECK FOR PENDING → REAL INVITATION...');
        
        const activityInvitationsResponse = await fetch(`${API_BASE}/api/activity-invitations`, {
            headers: { 'Authorization': `Bearer ${mobileToken}` }
        });
        const activityInvitationsData = await activityInvitationsResponse.json();
        
        const pendingFlowInvitations = (activityInvitationsData.data || []).filter(inv => 
            inv.activity_name && inv.activity_name.toLowerCase().includes('pending flow')
        );
        
        console.log('📬 Pending Flow Test invitations found:', pendingFlowInvitations.length);
        if (pendingFlowInvitations.length > 0) {
            console.log('✅ PENDING SYSTEM WORKS! Found invitation:', pendingFlowInvitations);
        } else {
            console.log('❌ PENDING SYSTEM FAILED! No invitation found');
            console.log('📋 Total invitations:', (activityInvitationsData.data || []).length);
        }
        
        // Final results
        console.log('\n' + '='.repeat(50));
        console.log('🏥 PENDING INVITATIONS SYSTEM RESULTS');
        console.log('='.repeat(50));
        
        if (pendingFlowInvitations.length > 0) {
            console.log('🎉 SUCCESS! Pending invitations system is working correctly!');
            console.log('📱 Mobile app should now show "Pending Flow Test" invitation');
            console.log('✅ The complete workflow: pending → connection → invitation works');
        } else {
            console.log('❌ FAILURE! Pending invitations system is not working');
            console.log('🔍 POSSIBLE ISSUES:');
            console.log('1. processPendingInvitations() not being called');
            console.log('2. Pending invitation lookup logic incorrect');
            console.log('3. Invitation creation failing silently');
            console.log('4. Database constraint issues');
        }
        
        console.log('\n📊 FINAL SUMMARY:');
        console.log(`- Host: ${hostLoginData.user.email} (UUID: ${hostUuid})`);
        console.log(`- Mobile: ${mobileLoginData.user.email} (UUID: ${mobileUserUuid})`);
        console.log(`- Activity: Pending Flow Test (UUID: ${activityUuid})`);
        console.log(`- Pending key: pending-${mobileUserUuid}`);
        console.log(`- Connection created: ✅`);
        console.log(`- Connection accepted: ✅`);
        console.log(`- Invitation created: ${pendingFlowInvitations.length > 0 ? '✅' : '❌'}`);
        
        if (pendingFlowInvitations.length === 0) {
            console.log('\n🔧 DEBUGGING NEEDED:');
            console.log('- Check backend logs for processPendingInvitations() execution');
            console.log('- Verify pending_activity_invitations table has the entry');
            console.log('- Debug invitation creation with correct parameters');
        }
        
    } catch (error) {
        console.error('❌ Test error:', error.message);
    }
}

testPendingSystemUser134();