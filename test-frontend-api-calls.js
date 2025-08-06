#!/usr/bin/env node

const fetch = require('node-fetch');

const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com';

async function testFrontendAPICalls() {
    try {
        console.log('🔍 Testing frontend API calls for notifications...');
        
        // Login as Johnson family (Emma's parent) - they have 7 pending invitations
        const loginResponse = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'johnson@example.com', password: 'demo123' })
        });
        
        const loginData = await loginResponse.json();
        if (!loginData.success) {
            console.error('❌ Login failed:', loginData);
            return;
        }
        console.log('✅ Logged in as Johnson family (Emma\'s parent)');
        console.log('   User ID:', loginData.user?.id);
        const token = loginData.token;
        
        // Test 1: Connection requests (this works in NotificationBell)
        console.log('\n🔍 Testing /api/connections/requests...');
        const connectionsResponse = await fetch(`${API_BASE}/api/connections/requests`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (connectionsResponse.ok) {
            const connectionsData = await connectionsResponse.json();
            console.log(`✅ Connection requests work: ${connectionsData.data?.length || 0} requests`);
        } else {
            console.log('❌ Connection requests failed:', connectionsResponse.status);
        }
        
        // Test 2: Activity invitations (this is failing in NotificationBell)
        console.log('\n🔍 Testing /api/activity-invitations...');
        const invitationsResponse = await fetch(`${API_BASE}/api/activity-invitations`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        console.log('📡 Status:', invitationsResponse.status);
        console.log('📡 Content-Type:', invitationsResponse.headers.get('content-type'));
        
        if (invitationsResponse.ok) {
            const invitationsData = await invitationsResponse.json();
            console.log(`✅ Activity invitations work: ${invitationsData.data?.length || 0} invitations`);
            
            if (invitationsData.data?.length > 0) {
                console.log('📋 Sample invitation:');
                const sample = invitationsData.data[0];
                console.log(`   Activity: "${sample.activity_name}"`);
                console.log(`   From: ${sample.inviter_name || sample.host_parent_name}`);
                console.log(`   Status: ${sample.status}`);
                console.log(`   Message: "${sample.message || 'None'}"`);
            }
        } else {
            const errorText = await invitationsResponse.text();
            console.log('❌ Activity invitations failed');
            console.log('📋 Error details:', errorText.substring(0, 500));
        }
        
        // Test 3: Check what the raw database query returns
        console.log('\n🔍 Expected invitations from database check:');
        console.log('   - Johnson family should have 7 pending invitations');
        console.log('   - Including "test4" and "test5" from wong');
        console.log('   - These should appear as notifications with Accept/Reject buttons');
        
        console.log('\n🎯 Issue diagnosis:');
        if (invitationsResponse.status === 500) {
            console.log('❌ The /api/activity-invitations endpoint is returning server error');
            console.log('❌ This prevents NotificationBell from loading invitations');
            console.log('❌ Frontend shows no notifications because API call fails');
        }
        
    } catch (error) {
        console.error('❌ Test error:', error.message);
    }
}

testFrontendAPICalls();