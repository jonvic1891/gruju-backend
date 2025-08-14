#!/usr/bin/env node

const fetch = require('node-fetch');
const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com';

async function debugGuestParticipants() {
    try {
        console.log('🔍 DEBUGGING GUEST "UNABLE TO LOAD PARTICIPANTS" ERROR');
        console.log('=' .repeat(70));
        
        // Login as guest (Emilia's parent)
        const guestLogin = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'roberts@example.com', password: 'test123' })
        }).then(r => r.json());
        
        console.log('✅ Logged in as guest (Emilia\'s parent)');
        console.log(`User: ${guestLogin.user.username} (ID: ${guestLogin.user.id})`);
        
        // Get guest's invitations to find an activity to test with
        console.log('\n📋 Getting guest\'s invitations...');
        const today = new Date();
        const oneYearLater = new Date();
        oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
        const startDate = today.toISOString().split('T')[0];
        const endDate = oneYearLater.toISOString().split('T')[0];
        
        const invitationsResponse = await fetch(`${API_BASE}/api/calendar/invitations?start=${startDate}&end=${endDate}&_t=${Date.now()}`, {
            headers: { 'Authorization': `Bearer ${guestLogin.token}` }
        });
        const invitations = await invitationsResponse.json();
        
        console.log(`Found ${invitations.data?.length || 0} invitations`);
        
        if (invitations.data?.length > 0) {
            const testInvitation = invitations.data[0];
            console.log(`Testing with invitation: "${testInvitation.activity_name}" (Activity ID: ${testInvitation.id})`);
            
            // Try to load participants for this activity
            console.log('\n🔍 Testing participants endpoint as guest...');
            const participantsResponse = await fetch(`${API_BASE}/api/activities/${testInvitation.id}/participants`, {
                headers: { 'Authorization': `Bearer ${guestLogin.token}` }
            });
            
            console.log(`Participants response status: ${participantsResponse.status}`);
            
            if (participantsResponse.ok) {
                const participantsData = await participantsResponse.json();
                console.log('✅ SUCCESS: Guest can load participants');
                console.log(`Found ${participantsData.data?.participants?.length || 0} participants`);
            } else {
                console.log('❌ FAILED: Guest cannot load participants');
                const errorText = await participantsResponse.text();
                console.log('Error response:', errorText);
                
                console.log('\n🔍 ANALYZING THE PERMISSION CHECK...');
                console.log('The participants endpoint checks:');
                console.log('1. User is activity host (owns the activity)');
                console.log('2. OR user is invited to the activity');
                console.log('');
                console.log('For guests, they should pass check #2 (invited to activity)');
                console.log(`Guest user ID: ${guestLogin.user.id}`);
                console.log(`Activity ID: ${testInvitation.id}`);
                console.log('');
                console.log('The permission query should find a match in activity_invitations');
                console.log('where invited_parent_id = guest user ID and activity_id = activity ID');
            }
        } else {
            console.log('❌ No invitations found for guest to test with');
        }
        
        console.log('\n🎯 ROOT CAUSE ANALYSIS:');
        console.log('The guest "unable to load participants" error is likely due to:');
        console.log('1. Permission check failing in the participants endpoint');
        console.log('2. Activity ID mismatch between invitation data and actual activity');
        console.log('3. Database inconsistency in activity_invitations table');
        
    } catch (error) {
        console.error('❌ Debug failed:', error.message);
    }
}

debugGuestParticipants();