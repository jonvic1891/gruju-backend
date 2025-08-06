#!/usr/bin/env node

const fetch = require('node-fetch');

const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com';

async function testFixedInvitations() {
    try {
        console.log('🧪 Testing fixed activity invitations with parent IDs...');
        
        // Login as Wong family who should have connections
        const loginResponse = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: 'wong@example.com',
                password: 'demo123'
            })
        });
        
        const loginData = await loginResponse.json();
        if (!loginData.success) {
            console.error('❌ Login failed:', loginData);
            return;
        }
        
        console.log('✅ Logged in as Wong family');
        const token = loginData.token;
        
        // Get connections to see if they now include parent IDs
        const connectionsResponse = await fetch(`${API_BASE}/api/connections`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const connectionsData = await connectionsResponse.json();
        if (!connectionsData.success || !connectionsData.data?.length) {
            console.log('⚠️ No connections found for Wong family');
            return;
        }
        
        console.log('✅ Found connections:', connectionsData.data.length);
        
        // Check if parent IDs are now included
        const firstConnection = connectionsData.data[0];
        console.log('🔍 Connection structure:', {
            child1_parent_id: firstConnection.child1_parent_id,
            child1_parent_name: firstConnection.child1_parent_name,
            child2_parent_id: firstConnection.child2_parent_id,
            child2_parent_name: firstConnection.child2_parent_name,
        });
        
        if (!firstConnection.child1_parent_id || !firstConnection.child2_parent_id) {
            console.error('❌ Parent IDs are missing from connections');
            return;
        }
        
        console.log('✅ Parent IDs are now included in connections');
        
        // Get Wong's children to create an activity
        const childrenResponse = await fetch(`${API_BASE}/api/children`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const childrenData = await childrenResponse.json();
        if (!childrenData.success || !childrenData.data?.length) {
            console.error('❌ No children found for Wong');
            return;
        }
        
        const childId = childrenData.data[0].id;
        console.log('✅ Found child:', childrenData.data[0].name, 'ID:', childId);
        
        // Create a test activity
        const newActivity = {
            name: 'Test Activity with Fixed Invites',
            description: 'Testing fixed invitation functionality',
            start_date: '2025-08-10',
            end_date: '2025-08-10',
            start_time: '10:00',
            end_time: '11:00',
            location: 'Test Location'
        };
        
        const createActivityResponse = await fetch(`${API_BASE}/api/activities/${childId}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(newActivity)
        });
        
        const activityData = await createActivityResponse.json();
        if (!activityData.success) {
            console.error('❌ Failed to create activity:', activityData);
            return;
        }
        
        console.log('✅ Created test activity:', activityData.data.id);
        const activityId = activityData.data.id;
        
        // Now test sending an invitation with correct parent/child mapping
        // Get the first connected family to invite
        const targetConnection = connectionsData.data[0];
        
        // Determine which parent/child to invite (not the Wong family)
        let invitedParentId, invitedChildId;
        
        if (targetConnection.child1_parent_name !== 'wong') {
            invitedParentId = targetConnection.child1_parent_id;
            invitedChildId = targetConnection.child1_id;
        } else {
            invitedParentId = targetConnection.child2_parent_id;
            invitedChildId = targetConnection.child2_id;
        }
        
        console.log('🎯 Sending invitation to:', {
            parentId: invitedParentId,
            childId: invitedChildId
        });
        
        const inviteResponse = await fetch(`${API_BASE}/api/activities/${activityId}/invite`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                invited_parent_id: invitedParentId,
                child_id: invitedChildId,
                message: 'Test invitation with fixed parent/child ID mapping'
            })
        });
        
        const inviteData = await inviteResponse.json();
        
        if (inviteResponse.status === 200 && inviteData.success) {
            console.log('🎉 SUCCESS! Activity invitation sent with fixed mapping!');
            console.log('📋 Invitation response:', inviteData);
        } else {
            console.log('❌ Invitation failed');
            console.log('📡 Status:', inviteResponse.status);
            console.log('📡 Response:', inviteData);
        }
        
    } catch (error) {
        console.error('❌ Test error:', error.message);
    }
}

testFixedInvitations();