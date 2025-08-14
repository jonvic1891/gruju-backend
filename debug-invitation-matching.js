#!/usr/bin/env node

const fetch = require('node-fetch');
const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com';

async function debugInvitationMatching() {
    try {
        console.log('🔍 DEBUG INVITATION MATCHING');
        console.log('='.repeat(70));
        
        // Login as Emilia
        const emilaLogin = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'roberts10@example.com', password: 'test123' })
        }).then(r => r.json());
        
        console.log('✅ Logged in as Emilia');
        console.log(`   User: ${emilaLogin.user.username} (ID: ${emilaLogin.user.id})`);
        
        // Get Emilia's children
        const childrenResponse = await fetch(`${API_BASE}/api/children`, {
            headers: { 'Authorization': `Bearer ${emilaLogin.token}` }
        });
        
        const children = await childrenResponse.json();
        console.log('\n👶 EMILIA\'S CHILDREN:');
        const emiliaChildren = children.data || [];
        emiliaChildren.forEach((child, i) => {
            console.log(`   ${i + 1}. ${child.name} (ID: ${child.id})`);
        });
        
        // Check activities endpoint
        const dateRange = '?start=2025-07-31&end=2025-08-30';
        const activitiesResponse = await fetch(`${API_BASE}/api/calendar/activities${dateRange}`, {
            headers: { 'Authorization': `Bearer ${emilaLogin.token}` }
        });
        
        const activities = await activitiesResponse.json();
        console.log('\n📅 ACTIVITIES ENDPOINT RESPONSE:');
        console.log(`   Found ${activities.data?.length || 0} activities`);
        
        if (activities.data?.length > 0) {
            activities.data.forEach((activity, i) => {
                console.log(`\n   ${i + 1}. "${activity.name}" (Activity ID: ${activity.id})`);
                console.log(`      - child_id: ${activity.child_id} (${activity.child_name})`);
                console.log(`      - is_host: ${activity.is_host}`);
                console.log(`      - invitation_status: ${activity.invitation_status}`);
                console.log(`      - date: ${activity.start_date} at ${activity.start_time}`);
            });
        }
        
        // Check invitations endpoint for comparison
        const invitationsResponse = await fetch(`${API_BASE}/api/calendar/invitations${dateRange}`, {
            headers: { 'Authorization': `Bearer ${emilaLogin.token}` }
        });
        
        const invitations = await invitationsResponse.json();
        console.log('\n📧 INVITATIONS ENDPOINT RESPONSE (for comparison):');
        console.log(`   Found ${invitations.data?.length || 0} invitations`);
        
        if (invitations.data?.length > 0) {
            invitations.data.forEach((invitation, i) => {
                console.log(`\n   ${i + 1}. "${invitation.activity_name}" (Activity ID: ${invitation.id})`);
                console.log(`      - host_child: ${invitation.child_id} (${invitation.child_name})`);
                console.log(`      - invited_child: ${invitation.invited_child_id || 'NOT SET'} (${invitation.invited_child_name || 'NOT SET'})`);
                console.log(`      - status: ${invitation.status}`);
                console.log(`      - invitation_id: ${invitation.invitation_id}`);
            });
        }
        
        console.log('\n🔍 ANALYSIS:');
        console.log('The key question: In the activities endpoint, how do we know which child is invited?');
        console.log('We need to either:');
        console.log('1. Include invited_child_id in the activities query JOIN');
        console.log('2. Pass child_id as parameter to filter server-side');
        console.log('3. Fix the frontend filtering to properly match invited children');
        
    } catch (error) {
        console.error('❌ Debug failed:', error.message);
    }
}

debugInvitationMatching();