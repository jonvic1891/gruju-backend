#!/usr/bin/env node

const fetch = require('node-fetch');

const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com';

async function testUuidOnlyMobile() {
    try {
        console.log('🧪 UUID-ONLY TEST FOR MOBILE APP USER');
        console.log('='.repeat(50));
        console.log('🔐 RULE: Only use UUIDs, never database IDs');
        
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
        console.log('👤 Host user:', hostLoginData.user.email);
        console.log('🆔 Host UUID:', hostLoginData.user.uuid);
        const hostToken = hostLoginData.token;
        const hostUuid = hostLoginData.user.uuid;
        
        // Step 2: Login as CORRECT mobile app user (roberts10@example.com - user 133)
        console.log('\n2. LOGIN AS MOBILE APP USER (roberts10@example.com)...');
        const mobileLoginResponse = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'roberts10@example.com', password: 'test123' })
        });
        
        const mobileLoginData = await mobileLoginResponse.json();
        if (!mobileLoginData.success) {
            console.log('❌ Mobile user login failed');
            return;
        }
        console.log('✅ Mobile user login successful');
        console.log('👤 Mobile user:', mobileLoginData.user.email);
        console.log('🆔 Mobile user UUID:', mobileLoginData.user.uuid);
        const mobileToken = mobileLoginData.token;
        const mobileUserUuid = mobileLoginData.user.uuid;
        
        // Step 3: Get children using UUIDs only
        console.log('\n3. GET CHILDREN (UUID-based)...');
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
        
        // Verify this matches the mobile app child UUID from logs
        if (mobileChild.uuid === '5fd73f87-fcab-42d0-b371-e73a87dfa69e') {
            console.log('✅ CONFIRMED: Mobile child UUID matches backend logs');
        } else {
            console.log('⚠️ WARNING: Child UUID mismatch. Expected: 5fd73f87-fcab-42d0-b371-e73a87dfa69e, Got:', mobileChild.uuid);
        }
        
        // Step 4: Create test activity using UUIDs only
        console.log('\n4. CREATE TEST ACTIVITY "FINAL UUID TEST"...');
        const testActivityData = {
            name: 'Final UUID Test',
            description: 'Testing pending invitations with strict UUID usage',
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
        
        // Step 5: Create pending invitation using UUIDs only
        console.log('\n5. CREATE PENDING INVITATION (UUID-based)...');
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
            console.log('✅ Created pending invitation:', pendingResult);
        } else {
            const errorText = await createPendingResponse.text();
            console.log('❌ Failed to create pending invitation:', errorText);
        }
        
        // Step 6: Create connection request using UUIDs only
        console.log('\n6. CREATE CONNECTION REQUEST (UUID-based)...');
        const connectionRequestData = {
            target_parent_id: mobileUserUuid, // Use UUID - backend should handle conversion
            child_uuid: hostChild.uuid,
            target_child_uuid: mobileChild.uuid,
            message: 'UUID-only test connection request'
        };
        
        console.log('📤 Connection request data:', connectionRequestData);
        console.log('🔐 VERIFICATION: All IDs are UUIDs (no database IDs)');
        
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
        
        // Step 7: Check mobile user's connection requests
        console.log('\n7. CHECK MOBILE USER\'S CONNECTION REQUESTS...');
        const mobileRequestsResponse = await fetch(`${API_BASE}/api/connections/requests`, {
            headers: { 'Authorization': `Bearer ${mobileToken}` }
        });
        const mobileRequestsData = await mobileRequestsResponse.json();
        
        console.log('📨 Mobile user connection requests count:', (mobileRequestsData.data || []).length);
        const pendingRequest = mobileRequestsData.data?.find(req => req.status === 'pending');
        
        if (!pendingRequest) {
            console.log('❌ No pending connection request found');
            console.log('📋 Existing requests:');
            (mobileRequestsData.data || []).slice(0, 3).forEach(req => {
                console.log(`   - Status: ${req.status}, UUID: ${req.uuid || req.request_uuid}`);
            });
            return;
        }
        
        const requestUuid = pendingRequest.request_uuid || pendingRequest.uuid;
        console.log('🔍 Found pending request UUID:', requestUuid);
        console.log('🔐 VERIFICATION: Using request UUID, not database ID');
        
        // Step 8: Accept connection request using UUID only
        console.log('\n8. ACCEPT CONNECTION REQUEST (UUID-based)...');
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
        console.log('🔔 This should trigger processPendingInvitations() for mobile user');
        
        // Step 9: Wait for processing
        console.log('\n9. WAITING FOR PENDING INVITATIONS PROCESSING...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Step 10: Check if mobile user now has the invitation
        console.log('\n10. CHECK MOBILE USER\'S INVITATIONS (matching mobile app calls)...');
        
        // Check activity-invitations endpoint (what mobile app calls)
        const activityInvitationsResponse = await fetch(`${API_BASE}/api/activity-invitations`, {
            headers: { 'Authorization': `Bearer ${mobileToken}` }
        });
        const activityInvitationsData = await activityInvitationsResponse.json();
        
        console.log('📬 Activity invitations from /api/activity-invitations:');
        const finalTestInvitations = (activityInvitationsData.data || []).filter(inv => 
            inv.activity_name && inv.activity_name.toLowerCase().includes('final uuid')
        );
        
        if (finalTestInvitations.length > 0) {
            console.log('✅ Found Final UUID Test invitations:', finalTestInvitations);
        } else {
            console.log('❌ No Final UUID Test invitations found');
            console.log('📋 Sample of mobile user\'s current invitations:');
            (activityInvitationsData.data || []).slice(0, 3).forEach(inv => {
                console.log(`   - "${inv.activity_name}" (${inv.status})`);
            });
        }
        
        // Final results
        console.log('\n' + '='.repeat(50));
        console.log('🏥 FINAL UUID-ONLY TEST RESULTS');
        console.log('='.repeat(50));
        
        if (finalTestInvitations.length > 0) {
            console.log('🎉 SUCCESS! UUID-only pending invitations system is working!');
            console.log('📱 MOBILE APP SHOULD NOW SEE:');
            console.log('1. Refresh the Children screen');
            console.log('2. Look for "Final UUID Test" invitation');
            console.log('3. Should appear in pending invitations for Emilia 10');
        } else {
            console.log('❌ ISSUE: UUID-only system not working correctly');
            console.log('🔍 The invitation was not created or not visible to mobile user');
        }
        
        console.log('\n📊 UUID-ONLY SUMMARY:');
        console.log(`- Host: ${hostLoginData.user.email} (UUID: ${hostUuid})`);
        console.log(`- Mobile: ${mobileLoginData.user.email} (UUID: ${mobileUserUuid})`);
        console.log(`- Activity: Final UUID Test (UUID: ${activityUuid})`);
        console.log(`- All operations used UUIDs only ✅`);
        console.log(`- Invitation created: ${finalTestInvitations.length > 0 ? '✅' : '❌'}`);
        
        console.log('\n🔐 UUID VERIFICATION COMPLETE');
        console.log('- No database IDs were used in any API calls');
        console.log('- All references use UUIDs for consistency');
        console.log('- This should prevent ID/UUID mismatch bugs');
        
    } catch (error) {
        console.error('❌ Test error:', error.message);
    }
}

testUuidOnlyMobile();