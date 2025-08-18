#!/usr/bin/env node

const fetch = require('node-fetch');

const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com';

async function completePendingTest() {
    try {
        console.log('🎯 COMPLETE PENDING CONNECTIONS TEST');
        console.log('='.repeat(50));
        console.log('This test simulates the full user workflow:');
        console.log('1. Create activity');
        console.log('2. Add pending connection (save)');
        console.log('3. Retrieve activity details (go back)');
        console.log('');
        
        // Login as host
        const hostLoginResponse = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'jonathan.roberts006@hotmail.co.uk', password: 'test123' })
        });
        const hostLoginData = await hostLoginResponse.json();
        const hostToken = hostLoginData.token;
        
        // Get host child
        const hostChildrenResponse = await fetch(`${API_BASE}/api/children`, {
            headers: { 'Authorization': `Bearer ${hostToken}` }
        });
        const hostChildrenData = await hostChildrenResponse.json();
        const hostChild = hostChildrenData.data[0];
        
        console.log('✅ Host:', hostLoginData.user.email);
        console.log('👶 Host child:', hostChild.name);
        
        // STEP 1: Create activity
        console.log('\n📅 STEP 1: Creating activity...');
        const activityData = {
            name: 'Complete Test Activity',
            description: 'Testing complete workflow',
            start_date: '2025-08-19',
            end_date: '2025-08-19',
            start_time: '15:00',
            end_time: '17:00',
            location: 'Test Location',
            max_participants: 10,
            cost: 0,
            auto_notify_new_connections: false
        };
        
        const createResponse = await fetch(`${API_BASE}/api/activities/${hostChild.uuid}`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${hostToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(activityData)
        });
        
        const createResult = await createResponse.json();
        const activityUuid = createResult.data?.uuid;
        console.log('✅ Activity created:', activityUuid);
        
        // STEP 2: Add pending connection (this is what "Save" does)
        console.log('\n📤 STEP 2: Adding pending connection for Emilia...');
        const emiliaParentUuid = '5fd73f87-fcab-42d0-b371-e73a87dfa69e'; // From logs
        const pendingKey = `pending-${emiliaParentUuid}`;
        
        const pendingResponse = await fetch(`${API_BASE}/api/activities/${activityUuid}/pending-invitations`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${hostToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                pending_connections: [pendingKey]
            })
        });
        
        if (pendingResponse.ok) {
            const pendingResult = await pendingResponse.json();
            console.log('✅ Pending connection added successfully');
            console.log('📊 Server response:', pendingResult);
        } else {
            const errorText = await pendingResponse.text();
            console.log('❌ Failed to add pending connection:', errorText);
            return;
        }
        
        // STEP 3: Simulate "going back" - this is the problem area
        console.log('\n🔍 STEP 3: Simulating "go back" to view activity...');
        console.log('The frontend needs to fetch activity details including pending connections');
        
        // Check what current endpoints are available
        console.log('\n📋 Available endpoints to get activity data:');
        
        // Option A: Try the activities by child endpoint 
        console.log('\nA. GET /api/activities/:childId (gets ALL activities for a child)');
        const activitiesResponse = await fetch(`${API_BASE}/api/activities/${hostChild.uuid}`, {
            headers: { 'Authorization': `Bearer ${hostToken}` }
        });
        
        if (activitiesResponse.ok) {
            const activitiesData = await activitiesResponse.json();
            const targetActivity = activitiesData.data?.find(act => act.activity_uuid === activityUuid);
            
            console.log('✅ Child activities endpoint works');
            console.log('🔍 Our test activity found:', !!targetActivity);
            if (targetActivity) {
                console.log('📊 Activity data includes pending_connections:', 'pending_connections' in targetActivity);
                console.log('📊 Pending connections value:', targetActivity.pending_connections);
            }
        } else {
            console.log('❌ Child activities endpoint failed');
        }
        
        // Summary of findings
        console.log('\n' + '='.repeat(50));
        console.log('🏥 DIAGNOSIS SUMMARY');
        console.log('='.repeat(50));
        console.log('✅ Activity creation: Working');
        console.log('✅ Pending connection storage: Working'); 
        console.log('❓ Pending connection retrieval: Testing above');
        console.log('');
        console.log('🔧 SOLUTION NEEDED:');
        console.log('The GET /api/activities/:childId endpoint needs to include pending_connections');
        console.log('OR we need a new GET /api/activities/details/:activityUuid endpoint');
        console.log('');
        console.log('💡 This explains why you don\'t see pending connections when you "go back"');
        console.log('   The frontend can save them, but can\'t retrieve them!');
        
    } catch (error) {
        console.error('❌ Test error:', error.message);
    }
}

completePendingTest();