#!/usr/bin/env node

const fetch = require('node-fetch');
const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com';

async function checkSpecificDateActivity() {
    try {
        console.log('🔍 CHECKING ACTIVITY ON 15/08/2025 AT 09:00');
        console.log('='.repeat(60));
        
        // Login as both users
        const user10Login = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'roberts10@example.com', password: 'test123' })
        }).then(r => r.json());
        
        const user11Login = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'roberts11@example.com', password: 'test123' })
        }).then(r => r.json());
        
        console.log('✅ Logged in as both users');
        console.log(`   User 10 (Emilia): ${user10Login.user.username} (ID: ${user10Login.user.id})`);
        console.log(`   User 11 (Charlie): ${user11Login.user.username} (ID: ${user11Login.user.id})`);
        
        // Check calendar for the specific date range including 15/08/2025
        console.log('\n📅 Checking calendar for 15/08/2025...');
        const startDate = '2025-08-01';  // Start of August to make sure we catch it
        const endDate = '2025-08-31';    // End of August
        
        // Check User11's calendar (Charlie - the one who created the activity)
        const user11CalendarResponse = await fetch(`${API_BASE}/api/calendar/invitations?start=${startDate}&end=${endDate}&_t=${Date.now()}`, {
            headers: { 'Authorization': `Bearer ${user11Login.token}` }
        });
        
        if (user11CalendarResponse.ok) {
            const user11Calendar = await user11CalendarResponse.json();
            console.log(`📋 User11 (Charlie) has ${user11Calendar.data?.length || 0} calendar items in August 2025`);
            
            // Look for activities on 15/08/2025
            const august15Activities = user11Calendar.data?.filter(item => {
                const itemDate = new Date(item.start_date);
                return itemDate.getDate() === 15 && itemDate.getMonth() === 7 && itemDate.getFullYear() === 2025; // Month is 0-indexed
            }) || [];
            
            console.log(`🎯 Found ${august15Activities.length} activities on 15/08/2025:`);
            
            for (const activity of august15Activities) {
                console.log(`\n📋 Activity: "${activity.activity_name}" (ID: ${activity.id})`);
                console.log(`   Start time: ${activity.start_time}`);
                console.log(`   Status: ${activity.status}`);
                console.log(`   Host: ${activity.host_parent_username || 'N/A'}`);
                
                // Check if this is around 09:00
                if (activity.start_time && activity.start_time.includes('09:00')) {
                    console.log('   ⏰ This matches the 09:00 time slot!');
                    
                    // Test participants loading for this specific activity
                    console.log('\n🔍 Testing participant status for this activity...');
                    
                    const participantsResponse = await fetch(`${API_BASE}/api/activities/${activity.id}/participants`, {
                        headers: { 'Authorization': `Bearer ${user11Login.token}` }
                    });
                    
                    if (participantsResponse.ok) {
                        const participantsData = await participantsResponse.json();
                        console.log(`   👥 Participants (${participantsData.data?.participants?.length || 0} found):`);
                        
                        if (participantsData.data?.participants?.length > 0) {
                            participantsData.data.participants.forEach((p, i) => {
                                console.log(`\n      ${i + 1}. ${p.child_name}`);
                                console.log(`         Status: "${p.status}"`);
                                console.log(`         Invitation Type: "${p.invitation_type}"`);
                                console.log(`         Connection Status: "${p.connection_status || 'null'}"`);
                                console.log(`         Message: "${p.message}"`);
                                
                                // Check for the bug
                                if (p.child_name.includes('Emilia') && p.status === 'connected') {
                                    console.log('         🚨 BUG FOUND: Emilia shows as "connected"');
                                    console.log('         📝 Expected: Should be "pending_connection" since no connection accepted');
                                    
                                    // Check connection status to confirm
                                    if (!p.connection_status || p.connection_status !== 'active') {
                                        console.log('         🔍 Confirmed: connection_status is not "active", so should be pending');
                                    }
                                } else if (p.child_name.includes('Emilia') && p.status === 'pending_connection') {
                                    console.log('         ✅ Status correct: Shows as "pending_connection"');
                                }
                            });
                        }
                    } else {
                        console.log('   ❌ Cannot load participants:', await participantsResponse.text());
                    }
                    
                    // Check calendar color logic
                    console.log('\n🎨 Calendar Color Analysis:');
                    console.log(`   Activity status in calendar: "${activity.status}"`);
                    
                    if (activity.status === 'connected' || activity.has_connections) {
                        console.log('   🔵 Would show DARK BLUE (has connections)');
                        console.log('   🚨 BUG: Should show LIGHT BLUE if connections are pending only');
                    } else {
                        console.log('   🔷 Would show LIGHT BLUE (pending connections only)');
                    }
                }
            }
            
            if (august15Activities.length === 0) {
                console.log('📋 All calendar items in August 2025:');
                user11Calendar.data?.forEach(item => {
                    const itemDate = new Date(item.start_date);
                    console.log(`   - ${item.activity_name} on ${itemDate.toISOString().split('T')[0]} at ${item.start_time}`);
                });
            }
            
        } else {
            console.log('❌ Cannot load user11 calendar:', await user11CalendarResponse.text());
        }
        
        // Also check User10's calendar (Emilia) to see if she has the invitation
        console.log('\n📧 Checking User10 (Emilia) invitations...');
        const user10InvitationsResponse = await fetch(`${API_BASE}/api/calendar/invitations?start=${startDate}&end=${endDate}&_t=${Date.now()}`, {
            headers: { 'Authorization': `Bearer ${user10Login.token}` }
        });
        
        if (user10InvitationsResponse.ok) {
            const user10Invitations = await user10InvitationsResponse.json();
            console.log(`📩 User10 (Emilia) has ${user10Invitations.data?.length || 0} invitations in August 2025`);
            
            const august15Invitations = user10Invitations.data?.filter(item => {
                const itemDate = new Date(item.start_date);
                return itemDate.getDate() === 15 && itemDate.getMonth() === 7 && itemDate.getFullYear() === 2025;
            }) || [];
            
            if (august15Invitations.length > 0) {
                console.log(`📨 Found ${august15Invitations.length} invitations for 15/08/2025:`);
                august15Invitations.forEach(inv => {
                    console.log(`   - ${inv.activity_name} at ${inv.start_time} - Status: ${inv.status}`);
                });
            } else {
                console.log('📭 No invitations found for 15/08/2025');
            }
        }
        
    } catch (error) {
        console.error('❌ Check failed:', error.message);
    }
}

checkSpecificDateActivity();