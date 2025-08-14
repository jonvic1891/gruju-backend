#!/usr/bin/env node

const fetch = require('node-fetch');
const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com';

async function testSpecificActivity() {
    try {
        console.log('🔍 TESTING SPECIFIC ACTIVITY PARTICIPANT LOADING');
        console.log('='.repeat(60));
        
        // Login as both users
        const hostLogin = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'roberts1@example.com', password: 'test123' })
        }).then(r => r.json());
        
        const guestLogin = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'roberts@example.com', password: 'test123' })
        }).then(r => r.json());
        
        console.log('✅ Logged in as both users');
        console.log(`Host: ${hostLogin.user.username} (ID: ${hostLogin.user.id})`);
        console.log(`Guest: ${guestLogin.user.username} (ID: ${guestLogin.user.id})`);
        
        // Create a new test activity to debug with
        console.log('\n📝 Creating fresh test activity...');
        
        // Get host's child
        const hostChildren = await fetch(`${API_BASE}/api/children`, {
            headers: { 'Authorization': `Bearer ${hostLogin.token}` }
        }).then(r => r.json());
        const hostChild = hostChildren.data[0];
        
        // Create activity
        const activityData = {
            name: 'Debug Activity Test',
            description: 'Debug participant loading issue',
            start_date: '2025-08-21',
            end_date: '2025-08-21',
            start_time: '17:00',
            end_time: '19:00',
            location: 'Debug Location',
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
        console.log(`✅ Created activity: "${createdActivity.data.name}" (ID: ${createdActivity.data.id})`);
        
        // Test 1: Host should be able to load participants (empty initially)
        console.log('\n🔍 Test 1: Host loading participants (should be empty)...');
        const hostTest1Response = await fetch(`${API_BASE}/api/activities/${createdActivity.data.id}/participants`, {
            headers: { 'Authorization': `Bearer ${hostLogin.token}` }
        });
        
        console.log(`Host response status: ${hostTest1Response.status}`);
        if (hostTest1Response.ok) {
            const hostTest1Data = await hostTest1Response.json();
            console.log(`✅ Host can load participants: ${hostTest1Data.data?.participants?.length || 0} found`);
        } else {
            console.log('❌ Host cannot load participants:', await hostTest1Response.text());
        }
        
        // Test 2: Guest should NOT be able to load participants (no permission yet)
        console.log('\n🔍 Test 2: Guest loading participants (should be permission denied)...');
        const guestTest1Response = await fetch(`${API_BASE}/api/activities/${createdActivity.data.id}/participants`, {
            headers: { 'Authorization': `Bearer ${guestLogin.token}` }
        });
        
        console.log(`Guest response status: ${guestTest1Response.status}`);
        if (guestTest1Response.ok) {
            console.log('⚠️  Guest can unexpectedly load participants');
        } else {
            console.log('✅ Expected: Guest cannot load participants:', await guestTest1Response.text());
        }
        
        // Add pending invitation
        console.log('\n📝 Adding pending invitation for guest...');
        const pendingResponse = await fetch(`${API_BASE}/api/activities/${createdActivity.data.id}/pending-invitations`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${hostLogin.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ pending_connections: [`pending-${guestLogin.user.id}`] })
        });
        
        if (pendingResponse.ok) {
            console.log('✅ Added pending invitation');
        } else {
            console.log('❌ Failed to add pending invitation:', await pendingResponse.text());
        }
        
        // Test 3: Host should see the pending invitation
        console.log('\n🔍 Test 3: Host loading participants (should see pending invitation)...');
        const hostTest2Response = await fetch(`${API_BASE}/api/activities/${createdActivity.data.id}/participants`, {
            headers: { 'Authorization': `Bearer ${hostLogin.token}` }
        });
        
        console.log(`Host response status: ${hostTest2Response.status}`);
        if (hostTest2Response.ok) {
            const hostTest2Data = await hostTest2Response.json();
            console.log(`✅ Host can load participants: ${hostTest2Data.data?.participants?.length || 0} found`);
            
            if (hostTest2Data.data?.participants?.length > 0) {
                hostTest2Data.data.participants.forEach((p, i) => {
                    console.log(`   ${i + 1}. ${p.child_name}: ${p.status} (${p.invitation_type})`);
                });
            }
        } else {
            console.log('❌ Host cannot load participants:', await hostTest2Response.text());
        }
        
        // Test 4: Guest should now be able to load participants (has pending invitation)
        console.log('\n🔍 Test 4: Guest loading participants (should work with pending invitation)...');
        const guestTest2Response = await fetch(`${API_BASE}/api/activities/${createdActivity.data.id}/participants`, {
            headers: { 'Authorization': `Bearer ${guestLogin.token}` }
        });
        
        console.log(`Guest response status: ${guestTest2Response.status}`);
        if (guestTest2Response.ok) {
            const guestTest2Data = await guestTest2Response.json();
            console.log(`✅ Guest can load participants: ${guestTest2Data.data?.participants?.length || 0} found`);
        } else {
            console.log('❌ Guest STILL cannot load participants - THIS IS THE BUG:', await guestTest2Response.text());
        }
        
        console.log('\n🎯 SUMMARY:');
        console.log('If Test 4 fails, the issue is that our pending invitation permission fix is not working properly');
        
        // Cleanup
        console.log('\n🧹 Cleaning up...');
        await fetch(`${API_BASE}/api/activities/${createdActivity.data.id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${hostLogin.token}` }
        });
        console.log('✅ Cleanup complete');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testSpecificActivity();