#!/usr/bin/env node

const fetch = require('node-fetch');
const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com';

async function debugDuplicateInvitations() {
    try {
        console.log('🔍 DEBUGGING DUPLICATE INVITATIONS ISSUE');
        console.log('='.repeat(60));
        
        // Login as host
        const hostLogin = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'roberts1@example.com', password: 'test123' })
        }).then(r => r.json());
        
        console.log('✅ Logged in as host');
        console.log(`Host: ${hostLogin.user.username} (ID: ${hostLogin.user.id})`);
        
        // Search for the "Host-Guest View Test" activity
        console.log('\n🔍 Looking for "Host-Guest View Test" activity...');
        
        // Get host's activities to find the test activity
        const activitiesResponse = await fetch(`${API_BASE}/api/activities?_t=${Date.now()}`, {
            headers: { 'Authorization': `Bearer ${hostLogin.token}` }
        });
        const activities = await activitiesResponse.json();
        
        const testActivity = activities.data?.find(a => a.name === 'Host-Guest View Test');
        
        if (testActivity) {
            console.log(`✅ Found activity: "${testActivity.name}" (ID: ${testActivity.id})`);
            
            // Get participants to see the duplicate issue
            const participantsResponse = await fetch(`${API_BASE}/api/activities/${testActivity.id}/participants`, {
                headers: { 'Authorization': `Bearer ${hostLogin.token}` }
            });
            
            if (participantsResponse.ok) {
                const participantsData = await participantsResponse.json();
                console.log(`\n📊 Current participants/invitations (${participantsData.data?.participants?.length || 0} total):`);
                
                if (participantsData.data?.participants?.length > 0) {
                    participantsData.data.participants.forEach((p, i) => {
                        console.log(`   ${i + 1}. ${p.child_name}`);
                        console.log(`      Status: ${p.status}`);
                        console.log(`      Type: ${p.invitation_type}`);
                        console.log(`      Message: ${p.message}`);
                        console.log(`      Invitation ID: ${p.invitation_id || 'N/A'}`);
                        console.log(`      Pending ID: ${p.pending_id || 'N/A'}`);
                        console.log('');
                    });
                }
                
                console.log('🎯 ISSUE ANALYSIS:');
                console.log('The problem is that when a pending invitation becomes an actual invitation,');
                console.log('both records show up:');
                console.log('1. Original pending invitation record (from pending_activity_invitations)');
                console.log('2. New actual invitation record (from activity_invitations)');
                console.log('');
                console.log('The system should clean up the pending record when the actual invitation is sent.');
                
            } else {
                console.log('❌ Cannot access participants:', await participantsResponse.text());
            }
        } else {
            console.log('❌ "Host-Guest View Test" activity not found');
            console.log('Available activities:');
            activities.data?.forEach(a => console.log(`   - ${a.name} (ID: ${a.id})`));
        }
        
    } catch (error) {
        console.error('❌ Debug failed:', error.message);
    }
}

debugDuplicateInvitations();