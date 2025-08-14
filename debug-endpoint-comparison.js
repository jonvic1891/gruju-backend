#!/usr/bin/env node

const fetch = require('node-fetch');
const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com';

async function debugEndpointComparison() {
    try {
        console.log('🔍 COMPARING DIFFERENT INVITATION ENDPOINTS');
        console.log('='.repeat(70));
        
        // Login as Emilia
        const emilaLogin = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'roberts10@example.com', password: 'test123' })
        }).then(r => r.json());
        
        console.log('✅ Logged in as Emilia');
        console.log(`   User: ${emilaLogin.user.username} (ID: ${emilaLogin.user.id})`);
        
        const dateRange = '?start=2025-07-31&end=2025-08-30';
        
        // Test 1: /api/calendar/invitations (what getAllInvitations() calls)
        console.log('\n1️⃣ TESTING /api/calendar/invitations (used by getAllInvitations):');
        const calendarInvitationsResponse = await fetch(`${API_BASE}/api/calendar/invitations${dateRange}`, {
            headers: { 'Authorization': `Bearer ${emilaLogin.token}` }
        });
        
        console.log(`   Status: ${calendarInvitationsResponse.status}`);
        if (calendarInvitationsResponse.ok) {
            const calendarInvitations = await calendarInvitationsResponse.json();
            console.log(`   Success: ${calendarInvitations.success}`);
            console.log(`   Data length: ${calendarInvitations.data?.length || 0}`);
            
            if (calendarInvitations.data?.length > 0) {
                calendarInvitations.data.forEach((inv, i) => {
                    console.log(`      ${i + 1}. "${inv.activity_name}" (ID: ${inv.id}) - Status: ${inv.status}`);
                    console.log(`         invited_child_id: ${inv.invited_child_id || 'undefined'}`);
                    console.log(`         child_id: ${inv.child_id || 'undefined'}`);
                });
            }
        } else {
            console.log(`   Error: ${await calendarInvitationsResponse.text()}`);
        }
        
        // Test 2: /api/activity-invitations (what you said works)
        console.log('\n2️⃣ TESTING /api/activity-invitations (the one that shows data):');
        const activityInvitationsResponse = await fetch(`${API_BASE}/api/activity-invitations`, {
            headers: { 'Authorization': `Bearer ${emilaLogin.token}` }
        });
        
        console.log(`   Status: ${activityInvitationsResponse.status}`);
        if (activityInvitationsResponse.ok) {
            const activityInvitations = await activityInvitationsResponse.json();
            console.log(`   Success: ${activityInvitations.success}`);
            console.log(`   Data length: ${activityInvitations.data?.length || 0}`);
            
            if (activityInvitations.data?.length > 0) {
                activityInvitations.data.forEach((inv, i) => {
                    console.log(`      ${i + 1}. "${inv.activity_name}" (ID: ${inv.id}) - Status: ${inv.status}`);
                    console.log(`         invited_child_id: ${inv.invited_child_id || 'undefined'}`);
                    console.log(`         child_id: ${inv.child_id || 'undefined'}`);
                });
            }
        } else {
            console.log(`   Error: ${await activityInvitationsResponse.text()}`);
        }
        
        // Test 3: Check what child we're looking for
        console.log('\n3️⃣ EMILIA\'S CHILDREN:');
        const childrenResponse = await fetch(`${API_BASE}/api/children`, {
            headers: { 'Authorization': `Bearer ${emilaLogin.token}` }
        });
        
        if (childrenResponse.ok) {
            const children = await childrenResponse.json();
            console.log(`   Emilia has ${children.data?.length || 0} children:`);
            children.data?.forEach((child, i) => {
                console.log(`      ${i + 1}. ${child.name} (ID: ${child.id})`);
            });
        }
        
        console.log('\n🔍 ANALYSIS:');
        console.log('The issue might be:');
        console.log('1. Wrong endpoint being called by getAllInvitations()');
        console.log('2. Child ID filtering not matching the invitation data');
        console.log('3. Different data structure between endpoints');
        
    } catch (error) {
        console.error('❌ Debug failed:', error.message);
    }
}

debugEndpointComparison();