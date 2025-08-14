#!/usr/bin/env node

const fetch = require('node-fetch');
const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com';

async function debugInvitationStatus() {
    try {
        console.log('🔍 DEBUGGING INVITATION ACCEPTANCE STATUS');
        console.log('='.repeat(70));
        
        // Login as Emilia
        const emilaLogin = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'roberts10@example.com', password: 'test123' })
        }).then(r => r.json());
        
        console.log('✅ Logged in as Emilia');
        console.log(`   User: ${emilaLogin.user.username} (ID: ${emilaLogin.user.id})`);
        
        // Check all invitations for Emilia
        console.log('\n📧 Checking Emilia\'s invitations...');
        const invitationsResponse = await fetch(`${API_BASE}/api/calendar/invitations?start=2025-07-31&end=2025-08-30`, {
            headers: { 'Authorization': `Bearer ${emilaLogin.token}` }
        });
        
        if (invitationsResponse.ok) {
            const invitations = await invitationsResponse.json();
            console.log(`📨 Found ${invitations.data?.length || 0} invitations:`);
            
            if (invitations.data?.length > 0) {
                invitations.data.forEach((inv, i) => {
                    console.log(`\n   ${i + 1}. "${inv.activity_name}" (Activity ID: ${inv.id})`);
                    console.log(`      Invitation ID: ${inv.invitation_id}`);
                    console.log(`      Status: ${inv.status}`);
                    console.log(`      Host: ${inv.host_parent_username}`);
                    console.log(`      Child: ${inv.child_name}`);
                    console.log(`      Date: ${inv.start_date} at ${inv.start_time}`);
                    
                    if (inv.activity_name === 'charlie 1') {
                        console.log(`      🎯 This is the "charlie 1" activity!`);
                        if (inv.status === 'pending') {
                            console.log(`      ❌ Status is still 'pending' - invitation was NOT accepted`);
                            console.log(`      📝 Need to manually accept this invitation`);
                        } else if (inv.status === 'accepted') {
                            console.log(`      ✅ Status is 'accepted' - invitation was properly accepted`);
                        }
                    }
                });
                
                // Try to accept the "charlie 1" invitation if it's still pending
                const charlie1Invitation = invitations.data.find(inv => inv.activity_name === 'charlie 1');
                if (charlie1Invitation && charlie1Invitation.status === 'pending') {
                    console.log(`\n🔄 ATTEMPTING TO ACCEPT "charlie 1" INVITATION...`);
                    console.log(`   Invitation ID: ${charlie1Invitation.invitation_id}`);
                    
                    const acceptResponse = await fetch(`${API_BASE}/api/invitations/${charlie1Invitation.invitation_id}/respond`, {
                        method: 'POST',
                        headers: { 
                            'Authorization': `Bearer ${emilaLogin.token}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ action: 'accept' })
                    });
                    
                    console.log(`   Accept response status: ${acceptResponse.status}`);
                    if (acceptResponse.ok) {
                        const acceptResult = await acceptResponse.json();
                        console.log(`   ✅ SUCCESS: ${acceptResult.message || 'Invitation accepted'}`);
                        
                        // Check invitations again to see if status updated
                        console.log('\n🔄 Checking invitations after acceptance...');
                        const updatedInvitationsResponse = await fetch(`${API_BASE}/api/calendar/invitations?start=2025-07-31&end=2025-08-30&_t=${Date.now()}`, {
                            headers: { 'Authorization': `Bearer ${emilaLogin.token}` }
                        });
                        
                        if (updatedInvitationsResponse.ok) {
                            const updatedInvitations = await updatedInvitationsResponse.json();
                            const updatedCharlie1 = updatedInvitations.data?.find(inv => inv.activity_name === 'charlie 1');
                            
                            if (updatedCharlie1) {
                                console.log(`   Updated status: ${updatedCharlie1.status}`);
                                if (updatedCharlie1.status === 'accepted') {
                                    console.log(`   ✅ Invitation is now properly accepted!`);
                                } else {
                                    console.log(`   ❌ Status still not updated to 'accepted'`);
                                }
                            }
                        }
                    } else {
                        const errorText = await acceptResponse.text();
                        console.log(`   ❌ FAILED: ${errorText}`);
                    }
                }
                
            } else {
                console.log('❌ No invitations found');
            }
        } else {
            console.log('❌ Failed to load invitations:', await invitationsResponse.text());
        }
        
        console.log('\n🎯 SUMMARY:');
        console.log('The issue is likely that the invitation was never properly accepted.');
        console.log('Once accepted, it should appear in the child calendar via getInvitedActivities().');
        
    } catch (error) {
        console.error('❌ Debug failed:', error.message);
    }
}

debugInvitationStatus();