#!/usr/bin/env node

const fetch = require('node-fetch');

const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com';

async function debugInvitations() {
    try {
        console.log('🔍 Debugging invitation flow...');
        
        // Step 1: Login as Mia Davis parent (davis@example.com)
        console.log('\n--- Testing Mia Davis Parent ---');
        const davisLogin = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'davis@example.com', password: 'demo123' })
        });
        
        const davisData = await davisLogin.json();
        if (!davisData.success) {
            console.error('❌ Davis login failed:', davisData);
            return;
        }
        console.log('✅ Logged in as Davis family (Mia Davis parent)');
        const davisToken = davisData.token;
        
        // Step 2: Get Mia Davis invitations
        const davisInvitationsResponse = await fetch(`${API_BASE}/api/activity-invitations`, {
            headers: { 'Authorization': `Bearer ${davisToken}` }
        });
        
        if (davisInvitationsResponse.ok) {
            const davisInvitations = await davisInvitationsResponse.json();
            console.log(`📧 Mia Davis parent has ${davisInvitations.data?.length || 0} invitations:`);
            if (davisInvitations.data?.length > 0) {
                davisInvitations.data.forEach((invite, i) => {
                    console.log(`   ${i+1}. Activity: "${invite.activity_name}" - Status: ${invite.status}`);
                    console.log(`      From: ${invite.inviter_name || 'Unknown'} - Date: ${invite.start_date}`);
                });
            }
        } else {
            console.log('❌ Failed to get Davis invitations:', await davisInvitationsResponse.text());
        }
        
        // Step 3: Test invited activities endpoint for Davis family
        const davisInvitedResponse = await fetch(`${API_BASE}/api/calendar/invited-activities?start=2025-08-01&end=2025-08-31`, {
            headers: { 'Authorization': `Bearer ${davisToken}` }
        });
        
        if (davisInvitedResponse.ok) {
            const davisInvited = await davisInvitedResponse.json();
            console.log(`🗓️ Mia Davis parent calendar shows ${davisInvited.data?.length || 0} invited activities`);
        } else {
            console.log('❌ Davis invited activities failed:', davisInvitedResponse.status);
        }
        
        // Step 4: Login as Johnson family (Emma Johnson parent)
        console.log('\n--- Testing Emma Johnson Parent ---');
        const johnsonLogin = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'johnson@example.com', password: 'demo123' })
        });
        
        const johnsonData = await johnsonLogin.json();
        if (!johnsonData.success) {
            console.error('❌ Johnson login failed:', johnsonData);
            return;
        }
        console.log('✅ Logged in as Johnson family (Emma Johnson parent)');
        const johnsonToken = johnsonData.token;
        
        // Step 5: Get Emma Johnson parent invitations
        const johnsonInvitationsResponse = await fetch(`${API_BASE}/api/activity-invitations`, {
            headers: { 'Authorization': `Bearer ${johnsonToken}` }
        });
        
        if (johnsonInvitationsResponse.ok) {
            const johnsonInvitations = await johnsonInvitationsResponse.json();
            console.log(`📧 Emma Johnson parent has ${johnsonInvitations.data?.length || 0} invitations:`);
            if (johnsonInvitations.data?.length > 0) {
                johnsonInvitations.data.forEach((invite, i) => {
                    console.log(`   ${i+1}. Activity: "${invite.activity_name}" - Status: ${invite.status}`);
                    console.log(`      From: ${invite.inviter_name || 'Unknown'} - Date: ${invite.start_date}`);
                });
            }
        } else {
            console.log('❌ Failed to get Johnson invitations:', await johnsonInvitationsResponse.text());
        }
        
        // Step 6: Test invited activities endpoint for Johnson family
        const johnsonInvitedResponse = await fetch(`${API_BASE}/api/calendar/invited-activities?start=2025-08-01&end=2025-08-31`, {
            headers: { 'Authorization': `Bearer ${johnsonToken}` }
        });
        
        if (johnsonInvitedResponse.ok) {
            const johnsonInvited = await johnsonInvitedResponse.json();
            console.log(`🗓️ Emma Johnson parent calendar shows ${johnsonInvited.data?.length || 0} invited activities`);
        } else {
            console.log('❌ Johnson invited activities failed:', johnsonInvitedResponse.status);
        }
        
        console.log('\n🔍 Key Points:');
        console.log('- Invitations must be ACCEPTED to show in calendar');
        console.log('- Only accepted invitations appear in invited-activities endpoint');
        console.log('- Users need notifications to know about pending invitations');
        
    } catch (error) {
        console.error('❌ Debug error:', error.message);
    }
}

debugInvitations();