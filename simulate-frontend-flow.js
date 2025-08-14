#!/usr/bin/env node

const fetch = require('node-fetch');
const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com';

async function simulateFrontendFlow() {
    try {
        console.log('🎭 SIMULATING EXACT FRONTEND FLOW');
        console.log('='.repeat(60));
        console.log('This test simulates exactly what the frontend does when loading participant information');
        
        // Login as host (this is what you'd do in the frontend)
        console.log('\n👤 Step 1: User logs in as host...');
        const hostLogin = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'roberts1@example.com', password: 'test123' })
        }).then(r => r.json());
        
        console.log(`✅ Logged in: ${hostLogin.user.username} (ID: ${hostLogin.user.id})`);
        
        // Create a new activity with pending invitation (simulates user creating activity)
        console.log('\n📝 Step 2: User creates activity with pending invitation...');
        
        // Get host's children (frontend does this first)
        const childrenResponse = await fetch(`${API_BASE}/api/children`, {
            headers: { 'Authorization': `Bearer ${hostLogin.token}` }
        });
        const children = await childrenResponse.json();
        const hostChild = children.data[0];
        console.log(`   Host's child: ${hostChild.name} (ID: ${hostChild.id})`);
        
        // Create activity (exactly like frontend would)
        const activityData = {
            name: 'Frontend Simulation Test',
            description: 'Testing exact frontend flow',
            start_date: '2025-08-22',
            end_date: '2025-08-22',
            start_time: '18:00',
            end_time: '20:00',
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
        
        // Add pending invitation (user selects someone from pending connections)
        const pendingResponse = await fetch(`${API_BASE}/api/activities/${createdActivity.data.id}/pending-invitations`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${hostLogin.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ pending_connections: [`pending-67`] }) // Guest user ID 67
        });
        
        console.log('✅ Added pending invitation for guest (user ID 67)');
        
        // Save activity and navigate back to it (what frontend does)
        console.log('\n💾 Step 3: User saves activity and navigates back to view it...');
        
        // Simulate what happens when user goes back to view the activity
        // Frontend typically makes these calls in sequence:
        
        // 1. Load activity details
        console.log('   📋 Loading activity details...');
        const activityDetailsResponse = await fetch(`${API_BASE}/api/activities/${createdActivity.data.id}`, {
            headers: { 'Authorization': `Bearer ${hostLogin.token}` }
        });
        
        if (activityDetailsResponse.ok) {
            console.log('   ✅ Activity details loaded');
        } else {
            console.log('   ❌ Activity details failed:', await activityDetailsResponse.text());
        }
        
        // 2. Load participants (this is where the error happens)
        console.log('   👥 Loading participants...');
        const participantsResponse = await fetch(`${API_BASE}/api/activities/${createdActivity.data.id}/participants`, {
            headers: { 
                'Authorization': `Bearer ${hostLogin.token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log(`   Participants request status: ${participantsResponse.status}`);
        
        if (participantsResponse.ok) {
            const participantsData = await participantsResponse.json();
            console.log(`   ✅ SUCCESS: Participants loaded - ${participantsData.data?.participants?.length || 0} found`);
            
            if (participantsData.data?.participants?.length > 0) {
                console.log('   📊 Participant details:');
                participantsData.data.participants.forEach((p, i) => {
                    console.log(`      ${i + 1}. ${p.child_name}: ${p.status} (${p.invitation_type})`);
                    console.log(`         Message: ${p.message}`);
                });
            }
        } else {
            const errorText = await participantsResponse.text();
            console.log(`   ❌ FAILED: ${errorText}`);
            console.log('   🚨 THIS IS THE "unable to load participant information" ERROR!');
        }
        
        // Now test what happens if guest user tries to view the same activity
        console.log('\n👤 Step 4: Guest user tries to view the same activity...');
        
        const guestLogin = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'roberts@example.com', password: 'test123' })
        }).then(r => r.json());
        
        console.log(`✅ Guest logged in: ${guestLogin.user.username} (ID: ${guestLogin.user.id})`);
        
        const guestParticipantsResponse = await fetch(`${API_BASE}/api/activities/${createdActivity.data.id}/participants`, {
            headers: { 'Authorization': `Bearer ${guestLogin.token}` }
        });
        
        if (guestParticipantsResponse.ok) {
            console.log('   ✅ Guest can access participants (our fix is working)');
        } else {
            console.log('   ❌ Guest cannot access participants:', await guestParticipantsResponse.text());
        }
        
        console.log('\n🎯 DIAGNOSIS:');
        if (participantsResponse.ok) {
            console.log('✅ The backend is working correctly - no "unable to load participant information" error found');
            console.log('💡 Possible causes for user\'s issue:');
            console.log('   1. Frontend caching - try hard refresh (Ctrl+F5)');
            console.log('   2. Different activity ID than tested');
            console.log('   3. Race condition in frontend (authentication token not ready)');
            console.log('   4. Browser-specific issue');
        } else {
            console.log('❌ Found the backend error - this matches the user\'s issue');
        }
        
        // Cleanup
        console.log('\n🧹 Cleaning up...');
        await fetch(`${API_BASE}/api/activities/${createdActivity.data.id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${hostLogin.token}` }
        });
        console.log('✅ Cleanup complete');
        
    } catch (error) {
        console.error('❌ Simulation failed:', error.message);
    }
}

simulateFrontendFlow();