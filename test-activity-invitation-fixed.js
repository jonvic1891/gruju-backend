#!/usr/bin/env node

const fetch = require('node-fetch');

const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com';

async function testActivityInvitationFixed() {
    try {
        console.log('🧪 Testing fixed activity invitation creation...');
        
        // Login as admin who has activities
        const loginResponse = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: 'admin@parentactivityapp.com',
                password: 'demo123'
            })
        });
        
        const loginData = await loginResponse.json();
        if (!loginData.success) {
            console.error('❌ Admin login failed:', loginData);
            return;
        }
        
        console.log('✅ Logged in as Admin');
        const token = loginData.token;
        
        // Get admin's children
        const childrenResponse = await fetch(`${API_BASE}/api/children`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const childrenData = await childrenResponse.json();
        if (!childrenData.success || !childrenData.data?.length) {
            console.error('❌ No children found for Admin:', childrenData);
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
        
        // Search for Johnson family to invite
        const searchResponse = await fetch(`${API_BASE}/api/connections/search?q=johnson@example.com`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const searchData = await searchResponse.json();
        if (!searchData.success || !searchData.data?.length) {
            console.error('❌ Could not find Johnson family:', searchData);
            return;
        }
        
        const johnsonParentId = searchData.data[0].id;
        const johnsonChildId = searchData.data[0].children[0]?.id;
        console.log('✅ Found Johnson parent ID:', johnsonParentId);
        console.log('✅ Found Johnson child ID:', johnsonChildId);
        
        // Send the invitation
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
                message: 'Test invitation after column name fix'
            })
        });
        
        const inviteData = await inviteResponse.json();
        
        if (inviteResponse.status === 200 && inviteData.success) {
            console.log('🎉 SUCCESS! Activity invitation sent successfully');
            console.log('📋 Response:', inviteData);
        } else {
            console.log('❌ Invitation failed');
            console.log('📡 Status:', inviteResponse.status);
            console.log('📡 Response:', inviteData);
        }
        
    } catch (error) {
        console.error('❌ Test error:', error.message);
    }
}

testActivityInvitationFixed();