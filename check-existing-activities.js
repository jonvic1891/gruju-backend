#!/usr/bin/env node

const fetch = require('node-fetch');
const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com';

async function checkExistingActivities() {
    try {
        console.log('🔍 CHECKING EXISTING ACTIVITIES FOR ISSUES');
        console.log('='.repeat(60));
        
        // Login as host
        const hostLogin = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'roberts1@example.com', password: 'test123' })
        }).then(r => r.json());
        
        console.log('✅ Logged in as host');
        console.log(`Host: ${hostLogin.user.username} (ID: ${hostLogin.user.id})`);
        
        // Try to get host's invitations to see if there are recent activities
        console.log('\n📧 Checking host\'s sent invitations...');
        const today = new Date();
        const startDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 7 days ago
        const endDate = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 7 days ahead
        
        const hostInvitationsResponse = await fetch(`${API_BASE}/api/calendar/invitations?start=${startDate}&end=${endDate}&_t=${Date.now()}`, {
            headers: { 'Authorization': `Bearer ${hostLogin.token}` }
        });
        
        if (hostInvitationsResponse.ok) {
            const hostInvitations = await hostInvitationsResponse.json();
            console.log(`📤 Host has sent ${hostInvitations.data?.length || 0} invitations`);
            
            // Look for activities that might have issues
            const suspiciousActivities = hostInvitations.data?.filter(inv => 
                inv.activity_name.includes('Test') || 
                inv.activity_name.includes('Host-Guest')
            ) || [];
            
            console.log(`\n🔍 Found ${suspiciousActivities.length} test-related activities:`);
            for (const activity of suspiciousActivities) {
                console.log(`   - ${activity.activity_name} (ID: ${activity.id}) - Status: ${activity.status}`);
                
                // Test participants endpoint for this activity
                const participantsResponse = await fetch(`${API_BASE}/api/activities/${activity.id}/participants`, {
                    headers: { 'Authorization': `Bearer ${hostLogin.token}` }
                });
                
                if (participantsResponse.ok) {
                    const participantsData = await participantsResponse.json();
                    console.log(`     ✅ Participants load OK: ${participantsData.data?.participants?.length || 0} found`);
                } else {
                    console.log(`     ❌ Participants load FAILED: ${participantsResponse.status} - ${await participantsResponse.text()}`);
                }
            }
            
        } else {
            console.log('❌ Cannot load host invitations (expected - no /api/calendar endpoint)');
            
            // Alternative: Check guest's invitations to see activities
            console.log('\n📧 Checking guest\'s received invitations instead...');
            
            const guestLogin = await fetch(`${API_BASE}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: 'roberts@example.com', password: 'test123' })
            }).then(r => r.json());
            
            const guestInvitationsResponse = await fetch(`${API_BASE}/api/calendar/invitations?start=${startDate}&end=${endDate}&_t=${Date.now()}`, {
                headers: { 'Authorization': `Bearer ${guestLogin.token}` }
            });
            
            if (guestInvitationsResponse.ok) {
                const guestInvitations = await guestInvitationsResponse.json();
                console.log(`📥 Guest has ${guestInvitations.data?.length || 0} invitations`);
                
                const recentTestActivities = guestInvitations.data?.filter(inv => 
                    inv.activity_name.includes('Test') || 
                    inv.activity_name.includes('Host-Guest') ||
                    inv.host_parent_username === 'Jonathan Roberts1'
                ) || [];
                
                console.log(`\n🔍 Found ${recentTestActivities.length} test activities from host:`);
                for (const activity of recentTestActivities.slice(0, 5)) { // Check first 5
                    console.log(`   - ${activity.activity_name} (ID: ${activity.id}) - Status: ${activity.status}`);
                    
                    // Test participants endpoint for this activity as guest
                    const guestParticipantsResponse = await fetch(`${API_BASE}/api/activities/${activity.id}/participants`, {
                        headers: { 'Authorization': `Bearer ${guestLogin.token}` }
                    });
                    
                    if (guestParticipantsResponse.ok) {
                        const guestParticipantsData = await guestParticipantsResponse.json();
                        console.log(`     ✅ Guest can load participants: ${guestParticipantsData.data?.participants?.length || 0} found`);
                    } else {
                        console.log(`     ❌ Guest CANNOT load participants: ${guestParticipantsResponse.status} - ${await guestParticipantsResponse.text()}`);
                        
                        // Test as host for same activity
                        const hostParticipantsResponse = await fetch(`${API_BASE}/api/activities/${activity.id}/participants`, {
                            headers: { 'Authorization': `Bearer ${hostLogin.token}` }
                        });
                        
                        if (hostParticipantsResponse.ok) {
                            console.log(`     ✅ But host CAN load participants - permission issue for guest`);
                        } else {
                            console.log(`     ❌ Host ALSO cannot load participants - broader issue`);
                        }
                    }
                }
            } else {
                console.log('❌ Cannot load guest invitations either');
            }
        }
        
    } catch (error) {
        console.error('❌ Check failed:', error.message);
    }
}

checkExistingActivities();