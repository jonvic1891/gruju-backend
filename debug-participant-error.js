#!/usr/bin/env node

const fetch = require('node-fetch');
const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com';

async function debugParticipantError() {
    try {
        console.log('🔍 DEBUGGING "UNABLE TO LOAD PARTICIPANT INFORMATION" ERROR');
        console.log('='.repeat(70));
        
        // Login as host first to see which activities exist
        const hostLogin = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'roberts1@example.com', password: 'test123' })
        }).then(r => r.json());
        
        console.log('✅ Logged in as host');
        console.log(`Host: ${hostLogin.user.username} (ID: ${hostLogin.user.id})`);
        
        // Get host's recent activities to find test activities
        const today = new Date();
        const startDate = today.toISOString().split('T')[0];
        const endDate = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        const calendarResponse = await fetch(`${API_BASE}/api/calendar?start=${startDate}&end=${endDate}&_t=${Date.now()}`, {
            headers: { 'Authorization': `Bearer ${hostLogin.token}` }
        });
        
        if (calendarResponse.ok) {
            const calendarData = await calendarResponse.json();
            console.log(`📅 Found ${calendarData.data?.length || 0} activities in calendar`);
            
            // Look for Host-Guest View Test activity
            const testActivity = calendarData.data?.find(a => a.name.includes('Host-Guest View Test') || a.name.includes('Test'));
            
            if (testActivity) {
                console.log(`\n🎯 Found test activity: "${testActivity.name}" (ID: ${testActivity.id})`);
                
                // Test the participants endpoint as host
                console.log('\n🔍 Testing participants endpoint as HOST...');
                const hostParticipantsResponse = await fetch(`${API_BASE}/api/activities/${testActivity.id}/participants`, {
                    headers: { 'Authorization': `Bearer ${hostLogin.token}` }
                });
                
                console.log(`Host participants response status: ${hostParticipantsResponse.status}`);
                
                if (hostParticipantsResponse.ok) {
                    const hostData = await hostParticipantsResponse.json();
                    console.log('✅ Host can load participants successfully');
                    console.log(`📊 Host sees ${hostData.data?.participants?.length || 0} participants`);
                    
                    if (hostData.data?.participants?.length > 0) {
                        hostData.data.participants.forEach((p, i) => {
                            console.log(`   ${i + 1}. ${p.child_name}: ${p.status} (${p.invitation_type})`);
                        });
                    }
                } else {
                    console.log('❌ Host cannot load participants');
                    const errorText = await hostParticipantsResponse.text();
                    console.log('Host error:', errorText);
                }
                
                // Now test as guest
                const guestLogin = await fetch(`${API_BASE}/api/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: 'roberts@example.com', password: 'test123' })
                }).then(r => r.json());
                
                console.log(`\n✅ Logged in as guest: ${guestLogin.user.username} (ID: ${guestLogin.user.id})`);
                
                console.log('\n🔍 Testing participants endpoint as GUEST...');
                const guestParticipantsResponse = await fetch(`${API_BASE}/api/activities/${testActivity.id}/participants`, {
                    headers: { 'Authorization': `Bearer ${guestLogin.token}` }
                });
                
                console.log(`Guest participants response status: ${guestParticipantsResponse.status}`);
                
                if (guestParticipantsResponse.ok) {
                    const guestData = await guestParticipantsResponse.json();
                    console.log('✅ Guest can load participants successfully');
                    console.log(`📊 Guest sees ${guestData.data?.participants?.length || 0} participants`);
                } else {
                    console.log('❌ Guest cannot load participants');
                    const errorText = await guestParticipantsResponse.text();
                    console.log('Guest error:', errorText);
                    
                    // Check if guest has permission via invitations
                    console.log('\n🔍 Checking guest\'s invitations...');
                    const invitationsResponse = await fetch(`${API_BASE}/api/calendar/invitations?start=${startDate}&end=${endDate}&_t=${Date.now()}`, {
                        headers: { 'Authorization': `Bearer ${guestLogin.token}` }
                    });
                    
                    const invitations = await invitationsResponse.json();
                    console.log(`Guest has ${invitations.data?.length || 0} invitations`);
                    
                    const relevantInvitation = invitations.data?.find(inv => inv.id === testActivity.id);
                    if (relevantInvitation) {
                        console.log(`✅ Guest has invitation for activity ${testActivity.id}`);
                        console.log(`   Status: ${relevantInvitation.status}`);
                        console.log(`   Invitation ID: ${relevantInvitation.invitation_id}`);
                    } else {
                        console.log(`❌ Guest has no invitation for activity ${testActivity.id}`);
                        console.log('   This explains the permission denied error');
                    }
                }
                
            } else {
                console.log('❌ No test activities found');
                console.log('Available activities:');
                calendarData.data?.forEach(a => console.log(`   - ${a.name} (ID: ${a.id})`));
            }
        } else {
            console.log('❌ Cannot load calendar:', await calendarResponse.text());
        }
        
    } catch (error) {
        console.error('❌ Debug failed:', error.message);
    }
}

debugParticipantError();