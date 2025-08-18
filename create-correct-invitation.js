#!/usr/bin/env node

const fetch = require('node-fetch');

const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com';

async function createCorrectInvitation() {
    try {
        console.log('🎯 CREATE CORRECT INVITATION FOR MOBILE APP');
        console.log('='.repeat(50));
        console.log('🔐 Using correct API parameters: invited_parent_uuid + child_uuid');
        
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
        
        // Step 2: Login as mobile app user (roberts11@example.com - user 134)
        console.log('\n2. LOGIN AS MOBILE APP USER (user 134)...');
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
        console.log('\n4. CREATE TEST ACTIVITY...');
        const testActivityData = {
            name: 'Correct API Test',
            description: 'Testing correct invitation API parameters',
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
        
        // Step 5: Create invitation with CORRECT parameters
        console.log('\n5. CREATE INVITATION WITH CORRECT API PARAMETERS...');
        const invitationData = {
            invited_parent_uuid: mobileUserUuid, // Parent UUID of the person being invited
            child_uuid: mobileChild.uuid,        // Child UUID of the child being invited
            message: 'Correct API test invitation'
        };
        
        console.log('📤 Invitation data:', invitationData);
        console.log('🔐 All parameters are UUIDs (no database IDs)');
        
        const inviteResponse = await fetch(`${API_BASE}/api/activities/${activityUuid}/invite`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${hostToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(invitationData)
        });
        
        if (inviteResponse.ok) {
            const inviteResult = await inviteResponse.json();
            console.log('✅ Invitation created successfully:', inviteResult);
        } else {
            const errorText = await inviteResponse.text();
            console.log('❌ Invitation failed:', errorText);
            return;
        }
        
        // Step 6: Wait for processing
        console.log('\n6. WAITING FOR PROCESSING...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Step 7: Check if mobile user can see the invitation
        console.log('\n7. CHECK MOBILE USER INVITATIONS...');
        
        const activityInvitationsResponse = await fetch(`${API_BASE}/api/activity-invitations`, {
            headers: { 'Authorization': `Bearer ${mobileToken}` }
        });
        const activityInvitationsData = await activityInvitationsResponse.json();
        
        const correctApiInvitations = (activityInvitationsData.data || []).filter(inv => 
            inv.activity_name && inv.activity_name.toLowerCase().includes('correct api')
        );
        
        console.log('📬 Correct API Test invitations found:', correctApiInvitations.length);
        if (correctApiInvitations.length > 0) {
            console.log('✅ Invitation visible to mobile user:', correctApiInvitations);
        } else {
            console.log('❌ Invitation not visible to mobile user');
            console.log('📋 Total invitations:', (activityInvitationsData.data || []).length);
            console.log('🔍 Sample invitations:');
            (activityInvitationsData.data || []).slice(0, 3).forEach(inv => {
                console.log(`   - "${inv.activity_name}" (${inv.status})`);
            });
        }
        
        // Final results
        console.log('\n' + '='.repeat(50));
        console.log('🏥 CORRECT API TEST RESULTS');
        console.log('='.repeat(50));
        
        if (correctApiInvitations.length > 0) {
            console.log('🎉 SUCCESS! Mobile app CAN see invitations when created correctly');
            console.log('📱 Mobile app invitation display system works');
            console.log('🔍 Now we can focus on the pending invitations system');
            console.log('📝 Refresh the mobile app to see "Correct API Test" invitation');
        } else {
            console.log('❌ ISSUE: Even correct API calls don\'t show in mobile app');
            console.log('🔍 This indicates a deeper invitation display problem');
        }
        
        console.log('\n📊 SUMMARY:');
        console.log(`- Host: ${hostLoginData.user.email} (UUID: ${hostUuid})`);
        console.log(`- Mobile: ${mobileLoginData.user.email} (UUID: ${mobileUserUuid})`);
        console.log(`- Activity: Correct API Test (UUID: ${activityUuid})`);
        console.log(`- Invitation parameters: ✅ All UUIDs, correct format`);
        console.log(`- Invitation visible: ${correctApiInvitations.length > 0 ? '✅' : '❌'}`);
        
    } catch (error) {
        console.error('❌ Test error:', error.message);
    }
}

createCorrectInvitation();