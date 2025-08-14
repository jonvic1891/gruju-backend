#!/usr/bin/env node

const fetch = require('node-fetch');

const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com';

async function debugUnifiedInvitations() {
    try {
        console.log('🧪 DEBUGGING UNIFIED CALENDAR INVITATIONS ENDPOINT');
        console.log('=' .repeat(60));
        
        // Login as Johnson family to test
        console.log('\n👤 Logging in as Johnson family (Emma\'s parent)...');
        const loginResponse = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'johnson@example.com', password: 'demo123' })
        });
        
        const loginData = await loginResponse.json();
        if (!loginData.success) {
            console.error('❌ Login failed:', loginData);
            return;
        }
        console.log('✅ Login successful, User ID:', loginData.user?.id);
        const token = loginData.token;
        
        // Test the unified invitations endpoint
        console.log('\n📅 Testing /api/calendar/invitations endpoint...');
        const invitationsResponse = await fetch(`${API_BASE}/api/calendar/invitations?start=2025-08-01&end=2025-08-31&_t=${Date.now()}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (invitationsResponse.ok) {
            const invitationsData = await invitationsResponse.json();
            console.log(`✅ Total invitations found: ${invitationsData.data?.length || 0}`);
            
            if (invitationsData.data?.length > 0) {
                console.log('\n📋 All Invitations:');
                invitationsData.data.forEach((invitation, i) => {
                    console.log(`   ${i+1}. "${invitation.activity_name}" by ${invitation.host_parent_username}`);
                    console.log(`      📅 Date: ${invitation.start_date} ${invitation.start_time || ''}`);
                    console.log(`      👶 Child: ${invitation.invited_child_name}`);
                    console.log(`      📩 Message: "${invitation.invitation_message || 'None'}"`);
                    console.log(`      ⏳ Status: ${invitation.status}`);
                    console.log(`      🆔 Invitation ID: ${invitation.invitation_id}`);
                    console.log('');
                });
                
                // Group by status
                const pending = invitationsData.data.filter(inv => inv.status === 'pending');
                const accepted = invitationsData.data.filter(inv => inv.status === 'accepted');
                const declined = invitationsData.data.filter(inv => inv.status === 'declined');
                
                console.log(`📊 Summary by status:`);
                console.log(`   ⏳ Pending: ${pending.length}`);
                console.log(`   ✅ Accepted: ${accepted.length}`);
                console.log(`   ❌ Declined: ${declined.length}`);
            } else {
                console.log('📭 No invitations found for this date range');
            }
        } else {
            console.log('❌ Invitations endpoint failed');
            const errorData = await invitationsResponse.text();
            console.log('Error:', errorData);
            return;
        }
        
        // Also test the old activity-invitations endpoint for comparison
        console.log('\n📋 Testing old /api/activity-invitations endpoint...');
        const oldResponse = await fetch(`${API_BASE}/api/activity-invitations`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (oldResponse.ok) {
            const oldData = await oldResponse.json();
            console.log(`✅ Old endpoint found: ${oldData.data?.length || 0} invitations`);
            
            if (oldData.data?.length > 0) {
                console.log('📋 Old endpoint invitations:');
                oldData.data.forEach((invitation, i) => {
                    console.log(`   ${i+1}. "${invitation.activity_name}" - Status: ${invitation.status}`);
                });
            }
        } else {
            console.log('❌ Old endpoint failed');
        }
        
        console.log('\n' + '=' .repeat(60));
        console.log('🔍 DIAGNOSIS:');
        
        if (invitationsData.data?.length === 0) {
            console.log('❌ NO INVITATIONS FOUND - Possible issues:');
            console.log('   1. No invitations created in database');
            console.log('   2. Date range filtering issue');
            console.log('   3. User ID filtering issue');
            console.log('   4. Database query issue');
        } else {
            console.log('✅ Invitations found in database');
        }
        
    } catch (error) {
        console.error('❌ Test error:', error.message);
    }
}

debugUnifiedInvitations();