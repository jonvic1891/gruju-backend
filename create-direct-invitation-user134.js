#!/usr/bin/env node

const fetch = require('node-fetch');

const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com';

async function createDirectInvitationForUser134() {
    try {
        console.log('🎯 CREATE DIRECT INVITATION FOR MOBILE APP USER 134');
        console.log('='.repeat(50));
        console.log('📱 Target: roberts11@example.com (user 134 from mobile app logs)');
        
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
        
        // Step 2: Login as mobile app user (roberts11@example.com - user 134)
        console.log('\n2. LOGIN AS ACTUAL MOBILE APP USER (roberts11@example.com)...');
        const mobileLoginResponse = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'roberts11@example.com', password: 'test123' })
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
        console.log('\n4. CREATE TEST ACTIVITY "MOBILE DIRECT TEST"...');
        const testActivityData = {
            name: 'Mobile Direct Test',
            description: 'Direct invitation test for mobile app',
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
        
        // Step 5: Create DIRECT invitation (skipping pending system)
        console.log('\n5. CREATE DIRECT INVITATION FOR MOBILE USER...');
        console.log('🎯 Target child UUID from mobile logs:', mobileChild.uuid);
        console.log('🔐 Using UUIDs only, no database IDs');
        
        const directInviteResponse = await fetch(`${API_BASE}/api/activities/${activityUuid}/invite`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${hostToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                invited_child_uuid: mobileChild.uuid, // Use UUID instead of ID
                message: 'Direct invitation test for mobile app'
            })
        });
        
        if (directInviteResponse.ok) {
            const directResult = await directInviteResponse.json();
            console.log('✅ Direct invitation created:', directResult);
        } else {
            const errorText = await directInviteResponse.text();
            console.log('❌ Direct invitation failed:', errorText);
            console.log('🔄 Trying with child ID instead...');
            
            // Fallback: try with child ID
            const directInviteResponse2 = await fetch(`${API_BASE}/api/activities/${activityUuid}/invite`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${hostToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    invited_child_id: mobileChild.id, // Use ID as fallback
                    message: 'Direct invitation test for mobile app (ID fallback)'
                })
            });
            
            if (directInviteResponse2.ok) {
                const directResult2 = await directInviteResponse2.json();
                console.log('✅ Direct invitation created with ID:', directResult2);
            } else {
                const errorText2 = await directInviteResponse2.text();
                console.log('❌ Direct invitation with ID also failed:', errorText2);
                return;
            }
        }
        
        // Step 6: Wait a moment for processing
        console.log('\n6. WAITING FOR PROCESSING...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Step 7: Check if mobile user can see the invitation
        console.log('\n7. CHECK MOBILE USER INVITATIONS...');
        
        const activityInvitationsResponse = await fetch(`${API_BASE}/api/activity-invitations`, {
            headers: { 'Authorization': `Bearer ${mobileToken}` }
        });
        const activityInvitationsData = await activityInvitationsResponse.json();
        
        const mobileDirectInvitations = (activityInvitationsData.data || []).filter(inv => 
            inv.activity_name && inv.activity_name.toLowerCase().includes('mobile direct')
        );
        
        console.log('📬 Mobile Direct Test invitations found:', mobileDirectInvitations.length);
        if (mobileDirectInvitations.length > 0) {
            console.log('✅ Mobile user can see direct invitations:', mobileDirectInvitations);
        } else {
            console.log('❌ Mobile user cannot see direct invitations');
            console.log('📋 Total invitations for mobile user:', (activityInvitationsData.data || []).length);
        }
        
        // Final results
        console.log('\n' + '='.repeat(50));
        console.log('🏥 DIRECT INVITATION TEST RESULTS');
        console.log('='.repeat(50));
        
        if (mobileDirectInvitations.length > 0) {
            console.log('🎉 SUCCESS! Mobile app CAN see direct invitations');
            console.log('📱 This proves the mobile app invitation display works');
            console.log('🔍 Issue is specifically with the pending invitations system');
        } else {
            console.log('❌ CRITICAL: Mobile app CANNOT see even direct invitations');
            console.log('🔍 This indicates a broader invitation display issue');
        }
        
        console.log('\n📊 SUMMARY:');
        console.log(`- Mobile user: ${mobileLoginData.user.email} (UUID: ${mobileUserUuid})`);
        console.log(`- Target child: ${mobileChild.name} (UUID: ${mobileChild.uuid})`);
        console.log(`- Activity: Mobile Direct Test (UUID: ${activityUuid})`);
        console.log(`- Direct invitation visible: ${mobileDirectInvitations.length > 0 ? '✅' : '❌'}`);
        
        console.log('\n🔐 NEXT STEPS:');
        if (mobileDirectInvitations.length > 0) {
            console.log('1. Focus on debugging the pending invitations system');
            console.log('2. Check processPendingInvitations() function execution');
            console.log('3. Verify pending invitation creation and lookup logic');
        } else {
            console.log('1. Debug basic invitation display in mobile app');
            console.log('2. Check API response format and filtering');
            console.log('3. Verify mobile app invitation loading logic');
        }
        
    } catch (error) {
        console.error('❌ Test error:', error.message);
    }
}

createDirectInvitationForUser134();