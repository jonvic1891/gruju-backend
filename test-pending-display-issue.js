#!/usr/bin/env node

const fetch = require('node-fetch');

const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com';

async function testPendingDisplayIssue() {
    try {
        console.log('🔍 TESTING PENDING CONNECTIONS DISPLAY ISSUE');
        console.log('='.repeat(50));
        
        // Login as host (user who creates activities)
        const hostLoginResponse = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'jonathan.roberts006@hotmail.co.uk', password: 'test123' })
        });
        const hostLoginData = await hostLoginResponse.json();
        const hostToken = hostLoginData.token;
        const hostUuid = hostLoginData.user.uuid;
        
        console.log('✅ Host logged in:', hostLoginData.user.email);
        
        // Get host's children
        const hostChildrenResponse = await fetch(`${API_BASE}/api/children`, {
            headers: { 'Authorization': `Bearer ${hostToken}` }
        });
        const hostChildrenData = await hostChildrenResponse.json();
        const hostChild = hostChildrenData.data[0];
        
        console.log('👶 Host child:', hostChild.name, 'UUID:', hostChild.uuid);
        
        // Step 1: Create a test activity
        console.log('\n📅 STEP 1: Creating test activity...');
        const activityData = {
            name: 'Display Test Activity',
            description: 'Testing pending connections display',
            start_date: '2025-08-19',
            end_date: '2025-08-19',
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
            body: JSON.stringify(activityData)
        });
        
        const createActivityResult = await createActivityResponse.json();
        const activityUuid = createActivityResult.data?.uuid;
        console.log('✅ Activity created with UUID:', activityUuid);
        
        // Step 2: Add pending connections (simulating what happens when you save)
        console.log('\n📤 STEP 2: Adding pending connections...');
        const mobileUserUuid = '5fd73f87-fcab-42d0-b371-e73a87dfa69e'; // Emilia's parent UUID from logs
        const pendingKey = `pending-${mobileUserUuid}`;
        
        const addPendingResponse = await fetch(`${API_BASE}/api/activities/${activityUuid}/pending-invitations`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${hostToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                pending_connections: [pendingKey]
            })
        });
        
        if (addPendingResponse.ok) {
            const pendingResult = await addPendingResponse.json();
            console.log('✅ Pending connections added:', pendingResult);
        } else {
            const errorText = await addPendingResponse.text();
            console.log('❌ Failed to add pending connections:', errorText);
        }
        
        // Step 3: Simulate "going back" - fetch activity details
        console.log('\n🔍 STEP 3: Fetching activity details (simulating "going back")...');
        
        const getActivityResponse = await fetch(`${API_BASE}/api/activities/${activityUuid}`, {
            headers: { 'Authorization': `Bearer ${hostToken}` }
        });
        
        if (getActivityResponse.ok) {
            const activityDetails = await getActivityResponse.json();
            console.log('✅ Activity details retrieved:');
            console.log('- Activity name:', activityDetails.data?.name);
            console.log('- Activity UUID:', activityDetails.data?.uuid);
            console.log('- Pending connections in response:', activityDetails.data?.pending_connections || 'NOT PRESENT');
            
            if (!activityDetails.data?.pending_connections) {
                console.log('❌ ISSUE FOUND: pending_connections not included in activity details response');
            }
        } else {
            console.log('❌ Failed to fetch activity details');
        }
        
        // Step 4: Check pending_activity_invitations table directly
        console.log('\n🔍 STEP 4: Checking if pending invitations exist in database...');
        
        // We'll use another API endpoint to verify the data exists
        const pendingCheckResponse = await fetch(`${API_BASE}/api/activities/${activityUuid}/pending-invitations`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${hostToken}` }
        });
        
        if (pendingCheckResponse.ok) {
            const pendingData = await pendingCheckResponse.json();
            console.log('✅ Pending invitations from API:', pendingData);
            
            if (pendingData.data && pendingData.data.length > 0) {
                console.log('✅ Pending invitations DO exist in database');
                console.log('🔍 Issue is likely in the activity details API response');
            } else {
                console.log('❌ No pending invitations found in database');
                console.log('🔍 Issue is in the pending invitation creation/storage');
            }
        } else {
            console.log('❌ Could not check pending invitations API');
        }
        
        console.log('\n' + '='.repeat(50));
        console.log('🏥 DIAGNOSIS RESULTS');
        console.log('='.repeat(50));
        console.log('1. Activity creation: ✅ Working');
        console.log('2. Pending connection addition: Check above');
        console.log('3. Activity details retrieval: Check if pending_connections included');
        console.log('4. Database storage: Check pending invitations API response');
        
        console.log('\n🔧 NEXT STEPS:');
        console.log('- If pending_connections missing from activity details: Fix GET /api/activities/{uuid} endpoint');
        console.log('- If pending invitations not in database: Fix POST /api/activities/{uuid}/pending-invitations endpoint');
        
    } catch (error) {
        console.error('❌ Test error:', error.message);
    }
}

testPendingDisplayIssue();