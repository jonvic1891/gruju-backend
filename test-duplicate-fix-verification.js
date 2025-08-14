#!/usr/bin/env node

const fetch = require('node-fetch');
const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com';

async function testDuplicateFixVerification() {
    try {
        console.log('🧪 TESTING DUPLICATE INVITATION FIX');
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
        
        // Get host's child
        const hostChildren = await fetch(`${API_BASE}/api/children`, {
            headers: { 'Authorization': `Bearer ${hostLogin.token}` }
        }).then(r => r.json());
        const hostChild = hostChildren.data[0];
        
        // Get guest's child (Emilia)
        const guestChildren = await fetch(`${API_BASE}/api/children`, {
            headers: { 'Authorization': `Bearer ${guestLogin.token}` }
        }).then(r => r.json());
        const emilia = guestChildren.data.find(c => c.name === 'Emilia');
        
        // Create activity with pending invitation
        console.log('\n📝 STEP 1: Creating activity with pending invitation...');
        const activityData = {
            name: 'Duplicate Fix Test',
            description: 'Testing that duplicates are cleaned up',
            start_date: '2025-08-20',
            end_date: '2025-08-20',
            start_time: '16:00',
            end_time: '18:00',
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
        
        // Check host view before sending actual invitation
        console.log('\n🔍 STEP 2: Host view BEFORE sending actual invitation...');
        const hostBeforeResponse = await fetch(`${API_BASE}/api/activities/${createdActivity.data.id}/participants`, {
            headers: { 'Authorization': `Bearer ${hostLogin.token}` }
        });
        
        const hostBeforeData = await hostBeforeResponse.json();
        console.log(`Host sees ${hostBeforeData.data?.participants?.length || 0} participants (should be 1 - just the pending invitation)`);
        
        // Send actual invitation
        console.log('\n📧 STEP 3: Sending actual invitation (this should trigger cleanup)...');
        const inviteResponse = await fetch(`${API_BASE}/api/activities/${createdActivity.data.id}/invite`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${hostLogin.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                invited_parent_id: guestLogin.user.id,
                child_id: emilia.id,
                message: 'Testing duplicate cleanup'
            })
        });
        
        const inviteResult = await inviteResponse.json();
        if (inviteResult.success) {
            console.log('✅ Sent invitation to guest');
        } else {
            console.log('❌ Failed to send invitation:', inviteResult.error);
        }
        
        // Check host view after sending actual invitation
        console.log('\n🔍 STEP 4: Host view AFTER sending actual invitation...');
        const hostAfterResponse = await fetch(`${API_BASE}/api/activities/${createdActivity.data.id}/participants`, {
            headers: { 'Authorization': `Bearer ${hostLogin.token}` }
        });
        
        const hostAfterData = await hostAfterResponse.json();
        console.log(`Host sees ${hostAfterData.data?.participants?.length || 0} participants (should be 1 - just the actual invitation, pending cleaned up)`);
        
        if (hostAfterData.data?.participants?.length > 0) {
            hostAfterData.data.participants.forEach((p, i) => {
                console.log(`   ${i + 1}. ${p.child_name}: ${p.status} (${p.invitation_type})`);
                if (p.pending_id) {
                    console.log(`      ❌ ERROR: Still has pending_id: ${p.pending_id} - cleanup failed`);
                } else if (p.invitation_id) {
                    console.log(`      ✅ Good: Has invitation_id: ${p.invitation_id} - actual invitation`);
                }
            });
        }
        
        // Check guest view
        console.log('\n🔍 STEP 5: Guest view after invitation sent...');
        const guestAfterResponse = await fetch(`${API_BASE}/api/activities/${createdActivity.data.id}/participants`, {
            headers: { 'Authorization': `Bearer ${guestLogin.token}` }
        });
        
        const guestAfterData = await guestAfterResponse.json();
        console.log(`Guest sees ${guestAfterData.data?.participants?.length || 0} participants (should be 1 - the actual invitation)`);
        
        console.log('\n🎯 DUPLICATE FIX VERIFICATION:');
        const beforeCount = hostBeforeData.data?.participants?.length || 0;
        const afterCount = hostAfterData.data?.participants?.length || 0;
        
        if (beforeCount === 1 && afterCount === 1) {
            console.log('✅ SUCCESS: No duplicates! Pending invitation was properly cleaned up');
        } else if (afterCount > beforeCount) {
            console.log('❌ FAILURE: Duplicate created - both pending and actual invitations showing');
        } else {
            console.log(`⚠️  UNEXPECTED: Before: ${beforeCount}, After: ${afterCount}`);
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

testDuplicateFixVerification();