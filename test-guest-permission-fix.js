#!/usr/bin/env node

const fetch = require('node-fetch');
const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com';

async function testGuestPermissionFix() {
    try {
        console.log('🧪 TESTING GUEST PERMISSION FIX');
        console.log('='.repeat(60));
        
        // Login as host and guest
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
        
        // Get host's child
        const hostChildren = await fetch(`${API_BASE}/api/children`, {
            headers: { 'Authorization': `Bearer ${hostLogin.token}` }
        }).then(r => r.json());
        const hostChild = hostChildren.data[0];
        
        // Create activity with pending invitation to guest
        console.log('\n📝 Creating activity with pending invitation...');
        const activityData = {
            name: 'Guest Permission Fix Test',
            description: 'Testing guest access to pending invitations',
            start_date: '2025-08-17',
            end_date: '2025-08-17',
            start_time: '14:00',
            end_time: '16:00',
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
        console.log(`✅ Created activity: "${createdActivity.data.name}" (ID: ${createdActivity.data.id})`);
        
        // Add pending invitation for guest
        const pendingResponse = await fetch(`${API_BASE}/api/activities/${createdActivity.data.id}/pending-invitations`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${hostLogin.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ pending_connections: [`pending-${guestLogin.user.id}`] })
        });
        
        console.log('✅ Added pending invitation for guest');
        
        // Test 1: Host should be able to see participants
        console.log('\n🔍 Test 1: Host accessing participants...');
        const hostParticipantsResponse = await fetch(`${API_BASE}/api/activities/${createdActivity.data.id}/participants`, {
            headers: { 'Authorization': `Bearer ${hostLogin.token}` }
        });
        
        if (hostParticipantsResponse.ok) {
            const hostData = await hostParticipantsResponse.json();
            console.log(`✅ Host can access participants (${hostData.data?.participants?.length || 0} found)`);
        } else {
            console.log('❌ Host cannot access participants:', await hostParticipantsResponse.text());
        }
        
        // Test 2: Guest should now be able to see participants (this was broken before)
        console.log('\n🔍 Test 2: Guest accessing participants with pending invitation...');
        const guestParticipantsResponse = await fetch(`${API_BASE}/api/activities/${createdActivity.data.id}/participants`, {
            headers: { 'Authorization': `Bearer ${guestLogin.token}` }
        });
        
        if (guestParticipantsResponse.ok) {
            const guestData = await guestParticipantsResponse.json();
            console.log('✅ SUCCESS: Guest can now access participants!');
            console.log(`📊 Guest sees ${guestData.data?.participants?.length || 0} participants/invitations`);
            
            if (guestData.data?.participants?.length > 0) {
                guestData.data.participants.forEach(p => {
                    console.log(`   - ${p.child_name}: ${p.status} (${p.invitation_type})`);
                });
            }
        } else {
            console.log('❌ FAILED: Guest still cannot access participants');
            console.log('Error:', await guestParticipantsResponse.text());
        }
        
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

testGuestPermissionFix();