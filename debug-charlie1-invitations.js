#!/usr/bin/env node

const fetch = require('node-fetch');
const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com';

async function debugCharlie1Invitations() {
    try {
        console.log('🔍 DEBUGGING CHARLIE 1 INVITATIONS');
        console.log('='.repeat(70));
        
        // Login as Charlie (the host)
        const charlieLogin = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'roberts11@example.com', password: 'test123' })
        }).then(r => r.json());
        
        console.log('✅ Logged in as Charlie');
        console.log(`   User: ${charlieLogin.user.username} (ID: ${charlieLogin.user.id})`);
        
        // Get participants for charlie 1 activity
        console.log('\n📊 CHECKING ACTIVITY PARTICIPANTS:');
        
        // First find the charlie 1 activity ID
        const activitiesResponse = await fetch(`${API_BASE}/api/calendar/activities?start=2025-07-31&end=2025-08-30`, {
            headers: { 'Authorization': `Bearer ${charlieLogin.token}` }
        });
        const activities = await activitiesResponse.json();
        const charlie1Activity = activities.data?.find(a => a.name === 'charlie 1');
        
        if (!charlie1Activity) {
            console.log('❌ Charlie 1 activity not found');
            return;
        }
        
        console.log(`📅 Charlie 1 Activity ID: ${charlie1Activity.id}`);
        
        // Get participants for this activity
        const participantsResponse = await fetch(`${API_BASE}/api/activities/${charlie1Activity.id}/participants`, {
            headers: { 'Authorization': `Bearer ${charlieLogin.token}` }
        });
        
        const participants = await participantsResponse.json();
        console.log(`👥 Participants response:`, participants);
        
        if (participants.success && participants.data) {
            console.log(`\n📋 PARTICIPANTS FOR CHARLIE 1:`);
            console.log(`   Total participants: ${participants.data.participants?.length || 0}`);
            
            participants.data.participants?.forEach((participant, i) => {
                console.log(`\n   ${i + 1}. ${participant.child_name || 'Unknown'}`);
                console.log(`      Parent: ${participant.parent_username || 'Unknown'}`);
                console.log(`      Status: ${participant.status}`);
                console.log(`      Child ID: ${participant.child_id}`);
                console.log(`      Invitation ID: ${participant.invitation_id}`);
            });
        }
        
        // Also check from Emilia's perspective
        console.log('\n\n🔄 CHECKING FROM EMILIA\'S PERSPECTIVE:');
        const emilaLogin = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'roberts10@example.com', password: 'test123' })
        }).then(r => r.json());
        
        console.log('✅ Logged in as Emilia');
        
        // Check Emilia's invitations
        const invitationsResponse = await fetch(`${API_BASE}/api/calendar/invitations?start=2025-07-31&end=2025-08-30`, {
            headers: { 'Authorization': `Bearer ${emilaLogin.token}` }
        });
        
        const invitations = await invitationsResponse.json();
        console.log(`📧 Emilia's invitations for charlie 1:`);
        
        if (invitations.success && invitations.data) {
            const charlie1Invitations = invitations.data.filter(inv => inv.activity_name === 'charlie 1');
            console.log(`   Found ${charlie1Invitations.length} invitations for charlie 1`);
            
            charlie1Invitations.forEach((inv, i) => {
                console.log(`\n   ${i + 1}. Invitation ID: ${inv.invitation_id}`);
                console.log(`      Status: ${inv.status}`);
                console.log(`      Activity ID: ${inv.id}`);
                console.log(`      Invited Child: ${inv.invited_child_name}`);
            });
        }
        
        console.log('\n🎯 SUMMARY:');
        console.log('If there are multiple invitations for the same activity/child, we have duplicates.');
        console.log('The issue is likely in the invitation accept/decline logic.');
        
    } catch (error) {
        console.error('❌ Debug failed:', error.message);
    }
}

debugCharlie1Invitations();