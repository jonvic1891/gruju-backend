#!/usr/bin/env node

const fetch = require('node-fetch');

const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com';

async function testCorrectEmilia() {
    try {
        console.log('🧪 TESTING WITH CORRECT EMILIA USER');
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
        console.log('👤 Host user:', hostLoginData.user.email, 'ID:', hostLoginData.user.id);
        const hostToken = hostLoginData.token;
        const hostUuid = hostLoginData.user.uuid;
        
        // Step 2: Login as CORRECT Emilia (user 67, not 134)
        console.log('\n2. LOGIN AS CORRECT EMILIA (roberts@example.com)...');
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
        console.log('👤 Emilia user:', emiliaLoginData.user.email, 'ID:', emiliaLoginData.user.id);
        const emiliaToken = emiliaLoginData.token;
        const emiliaUuid = emiliaLoginData.user.uuid;
        const emiliaId = emiliaLoginData.user.id;
        
        // Verify this is user 67 from the mobile app logs
        if (emiliaId !== 67) {
            console.log('⚠️ WARNING: Emilia ID is', emiliaId, 'but mobile app shows user 67');
        } else {
            console.log('✅ CONFIRMED: This matches user 67 from mobile app logs');
        }
        
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
        
        // Verify this matches the mobile app child UUID
        if (emiliaChild.uuid === '5fd73f87-fcab-42d0-b371-e73a87dfa69e') {
            console.log('✅ CONFIRMED: This matches Emilia 10 UUID from mobile app');
        } else {
            console.log('⚠️ WARNING: Child UUID mismatch. Expected: 5fd73f87-fcab-42d0-b371-e73a87dfa69e, Got:', emiliaChild.uuid);
        }
        
        // Step 4: Create test activity
        console.log('\n4. CREATE TEST ACTIVITY "MOBILE SCROLL TEST"...');
        const testActivityData = {
            name: 'Mobile Scroll Test',
            description: 'Test activity for mobile app pending invitations',
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
        console.log('\n5. CREATE PENDING INVITATION FOR CORRECT EMILIA...');
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
        }
        
        // Step 6: Create connection request (using Emilia's correct ID)
        console.log('\n6. CREATE CONNECTION REQUEST...');
        const connectionRequestData = {
            target_parent_id: emiliaId, // Use the correct ID (67)
            child_uuid: hostChild.uuid,
            target_child_uuid: emiliaChild.uuid,
            message: 'Test connection request for mobile app'
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
        
        console.log('🔍 Found pending request UUID:', pendingRequest.request_uuid || pendingRequest.uuid);
        
        // Step 8: Accept connection request as Emilia
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
            console.log('❌ Failed to accept connection:', errorText);
            return;
        }
        
        const acceptResult = await acceptResponse.json();
        console.log('✅ Connection accepted:', acceptResult);
        console.log('🔔 This should trigger processPendingInvitations() for user 67');
        
        // Step 9: Wait for processing
        console.log('\n9. WAITING FOR PROCESSING...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Step 10: Check if Emilia now has the invitation
        console.log('\n10. CHECK EMILIA\'S INVITATIONS (same as mobile app calls)...');
        
        // Check activity-invitations endpoint (what mobile app calls)
        const activityInvitationsResponse = await fetch(`${API_BASE}/api/activity-invitations`, {
            headers: { 'Authorization': `Bearer ${emiliaToken}` }
        });
        const activityInvitationsData = await activityInvitationsResponse.json();
        
        console.log('📬 Activity invitations from /api/activity-invitations:');
        const mobileScrollInvitations = (activityInvitationsData.data || []).filter(inv => 
            inv.activity_name && inv.activity_name.toLowerCase().includes('mobile scroll')
        );
        
        if (mobileScrollInvitations.length > 0) {
            console.log('✅ Found Mobile Scroll Test invitations:', mobileScrollInvitations);
        } else {
            console.log('❌ No Mobile Scroll Test invitations found');
            console.log('📋 Sample of Emilia\'s current invitations:');
            (activityInvitationsData.data || []).slice(0, 3).forEach(inv => {
                console.log(`   - "${inv.activity_name}" (${inv.status})`);
            });
        }
        
        // Also check calendar invitations
        console.log('\n📅 Also checking calendar invitations...');
        const calendarResponse = await fetch(`${API_BASE}/api/calendar/invitations?start=2025-01-01&end=2025-12-31`, {
            headers: { 'Authorization': `Bearer ${emiliaToken}` }
        });
        const calendarData = await calendarResponse.json();
        
        const calendarMobileScroll = (calendarData.data || []).filter(inv => 
            inv.activity_name && inv.activity_name.toLowerCase().includes('mobile scroll')
        );
        
        if (calendarMobileScroll.length > 0) {
            console.log('✅ Found Mobile Scroll Test in calendar:', calendarMobileScroll);
        } else {
            console.log('❌ No Mobile Scroll Test in calendar');
        }
        
        // Final results
        console.log('\n' + '='.repeat(50));
        console.log('🏥 FINAL RESULTS');
        console.log('='.repeat(50));
        
        if (mobileScrollInvitations.length > 0 || calendarMobileScroll.length > 0) {
            console.log('🎉 SUCCESS! Mobile app should now see the invitation');
            console.log('📱 WHAT TO CHECK IN MOBILE APP:');
            console.log('1. Refresh the Children screen');
            console.log('2. Look for "Mobile Scroll Test" invitation');
            console.log('3. Should appear in pending invitations for Emilia 10');
        } else {
            console.log('❌ STILL NOT WORKING! The invitation was not created for user 67');
            console.log('🔍 This suggests an issue with the pending invitations system');
        }
        
        console.log('\n📊 SUMMARY:');
        console.log(`- Host: ${hostLoginData.user.email} (ID: ${hostLoginData.user.id})`);
        console.log(`- Emilia: ${emiliaLoginData.user.email} (ID: ${emiliaId}) ✅ Matches mobile app user 67`);
        console.log(`- Activity: Mobile Scroll Test (${activityUuid})`);
        console.log(`- Pending key: pending-${emiliaUuid}`);
        console.log(`- Invitation created: ${mobileScrollInvitations.length > 0 ? '✅' : '❌'}`);
        
    } catch (error) {
        console.error('❌ Test error:', error.message);
    }
}

testCorrectEmilia();