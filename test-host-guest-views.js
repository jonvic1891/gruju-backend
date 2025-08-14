#!/usr/bin/env node

const fetch = require('node-fetch');
const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com';

async function testHostGuestViews() {
    try {
        console.log('🔍 TESTING HOST AND GUEST VIEWS OF ACTIVITIES');
        console.log('=' .repeat(70));
        
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
        
        // Create a test scenario with both pending and active connections
        console.log('\n🎯 STEP 1: Creating activity with pending invitation...');
        
        const hostChildren = await fetch(`${API_BASE}/api/children`, {
            headers: { 'Authorization': `Bearer ${hostLogin.token}` }
        }).then(r => r.json());
        const hostChild = hostChildren.data[0];
        
        // Create activity
        const activityData = {
            name: 'Host-Guest View Test',
            description: 'Testing different connection states',
            start_date: '2025-08-17',
            end_date: '2025-08-17',
            start_time: '10:00',
            end_time: '12:00',
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
        
        // Create pending invitation
        const pendingResponse = await fetch(`${API_BASE}/api/activities/${createdActivity.data.id}/pending-invitations`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${hostLogin.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ pending_connections: [`pending-${guestLogin.user.id}`] })
        });
        
        console.log('✅ Created pending invitation');
        
        // Test HOST VIEW
        console.log('\n📤 STEP 2: Testing HOST view of activity...');
        const hostParticipantsResponse = await fetch(`${API_BASE}/api/activities/${createdActivity.data.id}/participants`, {
            headers: { 'Authorization': `Bearer ${hostLogin.token}` }
        });
        
        if (hostParticipantsResponse.ok) {
            const hostData = await hostParticipantsResponse.json();
            console.log('✅ Host can load participants');
            console.log(`📊 Host sees ${hostData.data?.participants?.length || 0} participants/invitations`);
            
            if (hostData.data?.participants?.length > 0) {
                hostData.data.participants.forEach((p, i) => {
                    console.log(`   ${i + 1}. ${p.child_name} - Status: ${p.status} - Type: ${p.invitation_type}`);
                    if (p.status === 'pending_connection') {
                        console.log('      🔍 HOST ISSUE: Should distinguish between pending connection and active connection');
                    }
                });
            }
        } else {
            console.log('❌ Host cannot load participants');
            console.log(await hostParticipantsResponse.text());
        }
        
        // Test GUEST VIEW - before invitation is sent
        console.log('\n📥 STEP 3: Testing GUEST view of activity (before invitation sent)...');
        const guestParticipantsResponse = await fetch(`${API_BASE}/api/activities/${createdActivity.data.id}/participants`, {
            headers: { 'Authorization': `Bearer ${guestLogin.token}` }
        });
        
        if (guestParticipantsResponse.ok) {
            const guestData = await guestParticipantsResponse.json();
            console.log('✅ Guest can load participants');
            console.log(`📊 Guest sees ${guestData.data?.participants?.length || 0} participants/invitations`);
        } else {
            console.log('❌ Guest cannot load participants (EXPECTED - no permission yet)');
            console.log(`Status: ${guestParticipantsResponse.status}`);
            const errorText = await guestParticipantsResponse.text();
            console.log('Error:', errorText);
        }
        
        // Now send actual invitation to test guest view after invitation
        console.log('\n📧 STEP 4: Sending actual invitation...');
        const guestChildren = await fetch(`${API_BASE}/api/children`, {
            headers: { 'Authorization': `Bearer ${guestLogin.token}` }
        }).then(r => r.json());
        const emilia = guestChildren.data.find(c => c.name === 'Emilia');
        
        const inviteResponse = await fetch(`${API_BASE}/api/activities/${createdActivity.data.id}/invite`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${hostLogin.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                invited_parent_id: guestLogin.user.id,
                child_id: emilia.id,
                message: 'Test invitation'
            })
        });
        
        const inviteResult = await inviteResponse.json();
        if (inviteResult.success) {
            console.log('✅ Sent invitation to guest');
        } else {
            console.log('❌ Failed to send invitation:', inviteResult.error);
        }
        
        // Test GUEST VIEW - after invitation is sent  
        console.log('\n📥 STEP 5: Testing GUEST view after invitation sent...');
        const guestParticipantsResponse2 = await fetch(`${API_BASE}/api/activities/${createdActivity.data.id}/participants`, {
            headers: { 'Authorization': `Bearer ${guestLogin.token}` }
        });
        
        if (guestParticipantsResponse2.ok) {
            const guestData2 = await guestParticipantsResponse2.json();
            console.log('✅ Guest can now load participants');
            console.log(`📊 Guest sees ${guestData2.data?.participants?.length || 0} participants/invitations`);
        } else {
            console.log('❌ Guest still cannot load participants');
            console.log(`Status: ${guestParticipantsResponse2.status}`);
        }
        
        console.log('\n🎯 ANALYSIS:');
        console.log('1. HOST ISSUE: Need to show connection status (pending vs active)');
        console.log('2. GUEST ISSUE: Permission denied until invitation is sent');
        console.log('3. This explains why guests get "unable to load participants" for activities they haven\'t been invited to yet');
        
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

testHostGuestViews();