#!/usr/bin/env node

const fetch = require('node-fetch');
const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com';

async function testCompletePendingFlow() {
    try {
        console.log('🧪 TESTING COMPLETE PENDING FLOW WITH EDIT SCREEN');
        console.log('=' .repeat(70));
        
        // Login as roberts1
        const hostLogin = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'roberts1@example.com', password: 'test123' })
        }).then(r => r.json());
        
        // Login as Emilia's parent (for pending connection)
        const guestLogin = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'roberts@example.com', password: 'test123' })
        }).then(r => r.json());
        
        console.log('✅ Logged in as both users');
        console.log(`Host: ${hostLogin.user.username} (ID: ${hostLogin.user.id})`);
        console.log(`Guest: ${guestLogin.user.username} (ID: ${guestLogin.user.id})`);
        
        // Get host child
        const hostChildren = await fetch(`${API_BASE}/api/children`, {
            headers: { 'Authorization': `Bearer ${hostLogin.token}` }
        }).then(r => r.json());
        const hostChild = hostChildren.data[0];
        
        console.log(`Host child: ${hostChild.name} (ID: ${hostChild.id})`);
        
        // Step 1: Create activity with pending invitation
        console.log('\n🎯 Step 1: Creating activity with pending invitation...');
        const activityData = {
            name: 'Test Edit Screen Activity',
            description: 'Testing edit screen with pending connections',
            start_date: '2025-08-16',
            end_date: '2025-08-16',
            start_time: '15:00',
            end_time: '17:00',
            location: 'Test Location',
            cost: '0',
            max_participants: '5',
            auto_notify_new_connections: false
        };
        
        const createResponse = await fetch(`${API_BASE}/api/activities/${hostChild.id}`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${hostLogin.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(activityData)
        });
        
        const createdActivity = await createResponse.json();
        if (!createdActivity.success) {
            throw new Error(`Failed to create activity: ${createdActivity.error}`);
        }
        
        console.log(`✅ Created activity: "${createdActivity.data.name}" (ID: ${createdActivity.data.id})`);
        
        // Step 2: Create pending invitation entry
        console.log('\n📋 Step 2: Creating pending invitation entry...');
        const pendingConnections = [`pending-${guestLogin.user.id}`];
        
        const pendingResponse = await fetch(`${API_BASE}/api/activities/${createdActivity.data.id}/pending-invitations`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${hostLogin.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ pending_connections: pendingConnections })
        });
        
        const pendingResult = await pendingResponse.json();
        if (!pendingResult.success) {
            throw new Error(`Failed to create pending invitations: ${pendingResult.error}`);
        }
        
        console.log('✅ Pending invitation created successfully');
        
        // Step 3: Test participants endpoint
        console.log('\n🔍 Step 3: Testing participants endpoint...');
        const participantsResponse = await fetch(`${API_BASE}/api/activities/${createdActivity.data.id}/participants`, {
            headers: { 'Authorization': `Bearer ${hostLogin.token}` }
        });
        
        if (!participantsResponse.ok) {
            throw new Error(`Participants endpoint failed: ${participantsResponse.status}`);
        }
        
        const participantsData = await participantsResponse.json();
        console.log(`✅ Participants endpoint working!`);
        console.log(`📊 Found ${participantsData.data?.participants?.length || 0} total participants/invitations`);
        
        if (participantsData.data?.participants?.length > 0) {
            console.log('\n👥 Participants/Invitations:');
            participantsData.data.participants.forEach((p, i) => {
                console.log(`  ${i + 1}. ${p.child_name || 'Unknown'} - Status: ${p.status} - Type: ${p.invitation_type || 'N/A'}`);
            });
        }
        
        // Step 4: Test activity visibility
        console.log('\n📱 Step 4: Testing activity in host\'s activity list...');
        const activitiesResponse = await fetch(`${API_BASE}/api/activities/${hostChild.id}`, {
            headers: { 'Authorization': `Bearer ${hostLogin.token}` }
        });
        const activities = await activitiesResponse.json();
        
        const testActivity = activities.data.find(a => a.name === 'Test Edit Screen Activity');
        if (testActivity) {
            console.log('✅ Activity appears in host\'s activity list');
        } else {
            console.log('❌ Activity not found in host\'s activity list');
        }
        
        console.log('\n' + '=' .repeat(70));
        console.log('🎯 TEST RESULTS:');
        
        const hasPendingConnections = participantsData.data?.participants?.some(p => p.status === 'pending_connection');
        if (hasPendingConnections) {
            console.log('✅ SUCCESS! Activity edit screen should now show pending connections');
            console.log('✅ No more "unable to load participant information" error');
            console.log('');
            console.log('📱 FRONTEND TEST:');
            console.log('1. Login as roberts1@example.com / test123');
            console.log('2. Go to activity "Test Edit Screen Activity"');  
            console.log('3. Click edit - should show pending connection to Emilia');
            console.log('4. Should show "Pending connection - invitation will be sent when connection is accepted"');
        } else {
            console.log('❌ No pending connections found in participants');
        }
        
        // Cleanup
        console.log('\n🧹 Cleaning up test activity...');
        await fetch(`${API_BASE}/api/activities/${createdActivity.data.id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${hostLogin.token}` }
        });
        console.log('✅ Cleanup complete');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testCompletePendingFlow();