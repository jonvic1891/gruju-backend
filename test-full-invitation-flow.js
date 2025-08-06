#!/usr/bin/env node

const fetch = require('node-fetch');

const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com';

async function testFullInvitationFlow() {
    try {
        console.log('🎯 Testing complete invitation-to-calendar flow...');
        
        // Step 1: Login as Wong family (Mia's parent)
        const wongLogin = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'wong@example.com', password: 'demo123' })
        });
        
        const wongData = await wongLogin.json();
        if (!wongData.success) {
            console.error('❌ Wong login failed:', wongData);
            return;
        }
        console.log('✅ Logged in as Wong family');
        const wongToken = wongData.token;
        
        // Step 2: Get Wong's children
        const childrenResponse = await fetch(`${API_BASE}/api/children`, {
            headers: { 'Authorization': `Bearer ${wongToken}` }
        });
        const childrenData = await childrenResponse.json();
        if (!childrenData.success || !childrenData.data?.length) {
            console.error('❌ No children found for Wong');
            return;
        }
        const miaChildId = childrenData.data[0].id; // Mia Wong
        console.log(`✅ Found child: ${childrenData.data[0].name} (ID: ${miaChildId})`);
        
        // Step 3: Create a test activity
        const newActivity = {
            name: 'Calendar Test Activity',
            description: 'Testing invitation display in calendar',
            start_date: '2025-08-15',
            end_date: '2025-08-15',
            start_time: '14:00',
            end_time: '15:30',
            location: 'Test Location'
        };
        
        const createResponse = await fetch(`${API_BASE}/api/activities/${miaChildId}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${wongToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(newActivity)
        });
        
        const activityData = await createResponse.json();
        if (!activityData.success) {
            console.error('❌ Failed to create activity:', activityData);
            return;
        }
        console.log(`✅ Created activity: "${activityData.data.name}" (ID: ${activityData.data.id})`);
        const activityId = activityData.data.id;
        
        // Step 4: Send invitation to Johnson family (Emma's parent) 
        const inviteResponse = await fetch(`${API_BASE}/api/activities/${activityId}/invite`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${wongToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                invited_parent_id: 3, // Johnson family (parent of Emma)
                child_id: 1, // Emma Johnson (child ID 1)
                message: 'Would love for Emma to join Mia at this activity!'
            })
        });
        
        const inviteData = await inviteResponse.json();
        if (!inviteData.success) {
            console.error('❌ Failed to send invitation:', inviteData);
            return;
        }
        console.log('✅ Sent invitation to Johnson family');
        
        // Step 5: Login as Johnson family
        const johnsonLogin = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'johnson@example.com', password: 'demo123' })
        });
        
        const johnsonData = await johnsonLogin.json();
        if (!johnsonData.success) {
            console.error('❌ Johnson login failed:', johnsonData);
            return;
        }
        console.log('✅ Logged in as Johnson family');
        const johnsonToken = johnsonData.token;
        
        // Step 6: Get Johnson's invitations
        const invitationsResponse = await fetch(`${API_BASE}/api/activity-invitations`, {
            headers: { 'Authorization': `Bearer ${johnsonToken}` }
        });
        
        const invitationsData = await invitationsResponse.json();
        if (!invitationsData.success) {
            console.error('❌ Failed to get invitations:', invitationsData);
            return;
        }
        
        const pendingInvite = invitationsData.data?.find(invite => 
            invite.activity_id === activityId && invite.status === 'pending'
        );
        
        if (!pendingInvite) {
            console.error('❌ No pending invitation found');
            return;
        }
        console.log('✅ Found pending invitation');
        
        // Step 7: Accept the invitation
        const acceptResponse = await fetch(`${API_BASE}/api/activity-invitations/${pendingInvite.id}/respond`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${johnsonToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ action: 'accept' })
        });
        
        const acceptData = await acceptResponse.json();
        if (!acceptData.success) {
            console.error('❌ Failed to accept invitation:', acceptData);
            return;
        }
        console.log('✅ Accepted invitation');
        
        // Step 8: Test the new invited activities endpoint
        console.log('🔍 Testing invited activities appear in calendar...');
        
        // Wait a moment for database to update
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const invitedActivitiesResponse = await fetch(`${API_BASE}/api/calendar/invited-activities?start=2025-08-01&end=2025-08-31`, {
            headers: { 'Authorization': `Bearer ${johnsonToken}` }
        });
        
        if (invitedActivitiesResponse.status === 404) {
            console.log('⏳ Endpoint not yet deployed. Checking manually...');
            
            // Fallback: check invitations directly
            const checkResponse = await fetch(`${API_BASE}/api/activity-invitations`, {
                headers: { 'Authorization': `Bearer ${johnsonToken}` }
            });
            const checkData = await checkResponse.json();
            
            const acceptedInvite = checkData.data?.find(invite => 
                invite.activity_id === activityId && invite.status === 'accepted'
            );
            
            if (acceptedInvite) {
                console.log('🎉 SUCCESS! Invitation flow works:');
                console.log(`   - Activity "${acceptedInvite.activity_name}" was accepted`);
                console.log(`   - From: ${acceptedInvite.inviter_name || 'Wong family'}`);
                console.log(`   - Date: ${acceptedInvite.start_date}`);
                console.log('   - Ready for calendar integration once endpoint deploys');
            }
            return;
        }
        
        const invitedData = await invitedActivitiesResponse.json();
        if (invitedData.success && invitedData.data?.length > 0) {
            console.log('🎉 COMPLETE SUCCESS! Calendar integration works:');
            invitedData.data.forEach((activity, index) => {
                console.log(`   ${index + 1}. "${activity.name}" by ${activity.host_parent_username}`);
                console.log(`      Date: ${activity.start_date}, Time: ${activity.start_time}-${activity.end_time}`);
                if (activity.invitation_message) {
                    console.log(`      Message: "${activity.invitation_message}"`);
                }
            });
        } else {
            console.log('⚠️ Endpoint works but no activities found');
        }
        
    } catch (error) {
        console.error('❌ Test error:', error.message);
    }
}

testFullInvitationFlow();