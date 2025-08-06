#!/usr/bin/env node

const fetch = require('node-fetch');

const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com';

async function testActivityInvitation() {
    try {
        console.log('🧪 Testing activity invitation creation...');
        
        // Login as Davis first
        const loginResponse = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: 'davis@example.com',
                password: 'demo123'
            })
        });
        
        const loginData = await loginResponse.json();
        if (!loginData.success) {
            console.error('❌ Login failed:', loginData);
            return;
        }
        
        console.log('✅ Logged in as Davis');
        const token = loginData.token;
        
        // Get Davis's children to find an activity
        const childrenResponse = await fetch(`${API_BASE}/api/children`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const childrenData = await childrenResponse.json();
        if (!childrenData.success || !childrenData.data?.length) {
            console.error('❌ No children found for Davis:', childrenData);
            return;
        }
        
        const childId = childrenData.data[0].id;
        console.log('✅ Found child:', childrenData.data[0].name, 'ID:', childId);
        
        // Get activities for this child
        const activitiesResponse = await fetch(`${API_BASE}/api/activities/${childId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const activitiesData = await activitiesResponse.json();
        if (!activitiesData.success || !activitiesData.data?.length) {
            console.error('❌ No activities found for child:', activitiesData);
            return;
        }
        
        const activityId = activitiesData.data[0].id;
        console.log('✅ Found activity:', activitiesData.data[0].name, 'ID:', activityId);
        
        // Now try to send an invitation - first need Johnson's parent ID
        // Let's search for Johnson
        const searchResponse = await fetch(`${API_BASE}/api/connections/search?q=johnson@example.com`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const searchData = await searchResponse.json();
        if (!searchData.success || !searchData.data?.length) {
            console.error('❌ Could not find Johnson parent:', searchData);
            return;
        }
        
        const johnsonParentId = searchData.data[0].id;
        const johnsonChildId = searchData.data[0].children[0]?.id;
        console.log('✅ Found Johnson parent ID:', johnsonParentId);
        console.log('✅ Found Johnson child ID:', johnsonChildId);
        
        // Now send the invitation that should trigger the 500 error
        console.log('🔧 Sending activity invitation...');
        const inviteResponse = await fetch(`${API_BASE}/api/activities/${activityId}/invite`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                invited_parent_id: johnsonParentId,
                child_id: johnsonChildId,
                message: 'Test invitation from automated script'
            })
        });
        
        console.log('📡 Response status:', inviteResponse.status);
        const inviteData = await inviteResponse.text();
        console.log('📡 Response body:', inviteData);
        
        if (inviteResponse.status === 500) {
            console.log('❌ Got expected 500 error - check Heroku logs for detailed debugging info');
        } else {
            console.log('✅ Invitation sent successfully!');
        }
        
    } catch (error) {
        console.error('❌ Test error:', error.message);
    }
}

testActivityInvitation();