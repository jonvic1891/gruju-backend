#!/usr/bin/env node

const fetch = require('node-fetch');

const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com';

async function testHostConnectedActivities() {
    try {
        console.log('🧪 TESTING HOST CONNECTED ACTIVITIES DISPLAY');
        console.log('=' .repeat(60));
        
        // Login as Davis family to test host activities
        console.log('\n👤 Logging in as Davis family (Mia\'s parent - HOST)...');
        const loginResponse = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'davis@example.com', password: 'demo123' })
        });
        
        const loginData = await loginResponse.json();
        if (!loginData.success) {
            console.error('❌ Login failed:', loginData);
            return;
        }
        console.log('✅ Login successful, User ID:', loginData.user?.id);
        const token = loginData.token;
        
        // 1. Get children (same API call ChildActivityScreen makes)
        console.log('\n📋 Step 1: Getting children list...');
        const childrenResponse = await fetch(`${API_BASE}/api/children`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const childrenData = await childrenResponse.json();
        
        if (childrenData.success && childrenData.data) {
            console.log(`✅ Found ${childrenData.data.length} children`);
            childrenData.data.forEach(child => {
                console.log(`   - ${child.name} (ID: ${child.id})`);
            });
        } else {
            console.log('❌ Failed to get children');
            return;
        }
        
        // Test for Mia Davis's activities
        const miaChild = childrenData.data.find(child => child.name === 'Mia Davis');
        if (!miaChild) {
            console.log('❌ Could not find Mia Davis child');
            return;
        }
        
        console.log(`\n📋 Testing activities for ${miaChild.name} (ID: ${miaChild.id})`);
        
        // 2. Get regular activities (host's own activities)
        console.log('\n📅 Step 2: Getting regular activities...');
        const today = new Date();
        const oneYearLater = new Date();
        oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
        
        const startDate = today.toISOString().split('T')[0];
        const endDate = oneYearLater.toISOString().split('T')[0];
        
        const activitiesResponse = await fetch(`${API_BASE}/api/activities/${miaChild.id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const activitiesData = await activitiesResponse.json();
        
        if (activitiesData.success && activitiesData.data) {
            console.log(`✅ Found ${activitiesData.data.length} regular activities`);
            activitiesData.data.forEach((activity, i) => {
                console.log(`   ${i+1}. "${activity.name}" on ${activity.start_date}`);
            });
        }
        
        // 3. Get connected activities (accepted invitations by others)
        console.log('\n🔗 Step 3: Getting connected activities...');
        const connectedResponse = await fetch(`${API_BASE}/api/calendar/connected-activities?start=${startDate}&end=${endDate}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const connectedData = await connectedResponse.json();
        
        if (connectedResponse.ok && connectedData.success && connectedData.data) {
            console.log(`✅ Found ${connectedData.data.length} connected activities`);
            connectedData.data.forEach((activity, i) => {
                console.log(`   ${i+1}. "${activity.name}" on ${activity.start_date} - ${activity.participants || 0} participants`);
            });
        } else {
            console.log(`❌ Connected activities request failed: ${connectedData.error || 'Unknown error'}`);
        }
        
        // 4. Get invitations (to see who accepted our invitations)
        console.log('\n📩 Step 4: Getting invitations we sent...');
        const invitationsResponse = await fetch(`${API_BASE}/api/calendar/invitations?start=${startDate}&end=${endDate}&_t=${Date.now()}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const invitationsData = await invitationsResponse.json();
        
        if (invitationsData.success && invitationsData.data) {
            console.log(`✅ Found ${invitationsData.data.length} invitations`);
            
            // Filter for invitations we sent (where we are the host)
            const sentInvitations = invitationsData.data.filter(invitation => 
                invitation.host_parent_username === loginData.user.username
            );
            
            console.log(`📤 We sent ${sentInvitations.length} invitations:`);
            sentInvitations.forEach((invitation, i) => {
                console.log(`   ${i+1}. "${invitation.activity_name}" to ${invitation.invited_child_name} - Status: ${invitation.status}`);
            });
            
            const acceptedInvitations = sentInvitations.filter(inv => inv.status === 'accepted');
            console.log(`✅ ${acceptedInvitations.length} accepted invitations (these should show as connected activities)`);
        }
        
        console.log('\n' + '=' .repeat(60));
        console.log('🔍 DIAGNOSIS FOR HOST CONNECTED ACTIVITIES:');
        
        if (!connectedData.success || connectedData.data?.length === 0) {
            console.log('❌ ISSUE: Connected activities not showing for host');
            console.log('   📝 Expected: Activities with accepted invitations should show participants');
            console.log('   📝 Actual: Connected activities endpoint returned 0 results');
            console.log('\n🔧 POSSIBLE SOLUTIONS:');
            console.log('   1. Check /api/calendar/connected-activities endpoint implementation');
            console.log('   2. Verify it includes activities with accepted participants');
            console.log('   3. Check if host activities show participant counts');
        } else {
            console.log('✅ Connected activities working for host');
        }
        
    } catch (error) {
        console.error('❌ Test error:', error.message);
    }
}

testHostConnectedActivities();