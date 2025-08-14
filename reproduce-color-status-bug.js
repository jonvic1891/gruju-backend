#!/usr/bin/env node

const fetch = require('node-fetch');
const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com';

async function reproduceColorStatusBug() {
    try {
        console.log('🔍 REPRODUCING CALENDAR COLOR & STATUS BUG');
        console.log('='.repeat(60));
        
        // Test with the newly created users
        console.log('\n👤 Step 1: Login as roberts10@example.com (Emilia 10)...');
        const user10Login = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'roberts10@example.com', password: 'test123' })
        }).then(r => r.json());
        
        if (!user10Login.success) {
            console.log('❌ User roberts10 login failed, probably doesn\'t exist yet');
            return;
        }
        
        console.log('👤 Step 2: Login as roberts11@example.com (Charlie 11)...');
        const user11Login = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'roberts11@example.com', password: 'test123' })
        }).then(r => r.json());
        
        if (!user11Login.success) {
            console.log('❌ User roberts11 login failed, probably doesn\'t exist yet');
            return;
        }
        
        console.log(`✅ Logged in as both users:`);
        console.log(`   User 10: ${user10Login.user.username} (ID: ${user10Login.user.id})`);
        console.log(`   User 11: ${user11Login.user.username} (ID: ${user11Login.user.id})`);
        
        // Get their children
        const user10Children = await fetch(`${API_BASE}/api/children`, {
            headers: { 'Authorization': `Bearer ${user10Login.token}` }
        }).then(r => r.json());
        
        const user11Children = await fetch(`${API_BASE}/api/children`, {
            headers: { 'Authorization': `Bearer ${user11Login.token}` }
        }).then(r => r.json());
        
        const emilia10 = user10Children.data.find(c => c.name.includes('Emilia'));
        const charlie11 = user11Children.data.find(c => c.name.includes('Charlie'));
        
        console.log(`   Children: ${emilia10?.name || 'No Emilia found'}, ${charlie11?.name || 'No Charlie found'}`);
        
        if (!emilia10 || !charlie11) {
            console.log('❌ Cannot find expected children');
            return;
        }
        
        // Look for the "charlie 1" activity
        console.log('\n🔍 Step 3: Looking for "charlie 1" activity...');
        
        // Get user11's calendar to find the activity
        const today = new Date();
        const startDate = today.toISOString().split('T')[0];
        const endDate = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        const user11CalendarResponse = await fetch(`${API_BASE}/api/calendar/invitations?start=${startDate}&end=${endDate}&_t=${Date.now()}`, {
            headers: { 'Authorization': `Bearer ${user11Login.token}` }
        });
        
        if (user11CalendarResponse.ok) {
            const user11Calendar = await user11CalendarResponse.json();
            console.log(`📅 User11 has ${user11Calendar.data?.length || 0} calendar items`);
            
            // Look for "charlie 1" activity
            const charlie1Activity = user11Calendar.data?.find(item => 
                item.activity_name && item.activity_name.toLowerCase().includes('charlie 1')
            );
            
            if (charlie1Activity) {
                console.log(`✅ Found "charlie 1" activity: ID ${charlie1Activity.id}`);
                console.log(`   Status in calendar: ${charlie1Activity.status}`);
                console.log(`   Activity name: ${charlie1Activity.activity_name}`);
                
                // Test participants loading for this activity
                console.log('\n🔍 Step 4: Testing participant status...');
                
                // Load as the host (user11/Charlie)
                const hostParticipantsResponse = await fetch(`${API_BASE}/api/activities/${charlie1Activity.id}/participants`, {
                    headers: { 'Authorization': `Bearer ${user11Login.token}` }
                });
                
                if (hostParticipantsResponse.ok) {
                    const hostParticipantsData = await hostParticipantsResponse.json();
                    console.log(`✅ Host can load participants: ${hostParticipantsData.data?.participants?.length || 0} found`);
                    
                    if (hostParticipantsData.data?.participants?.length > 0) {
                        console.log('📊 Participant details:');
                        hostParticipantsData.data.participants.forEach((p, i) => {
                            console.log(`   ${i + 1}. ${p.child_name}`);
                            console.log(`      Status: ${p.status}`);
                            console.log(`      Invitation Type: ${p.invitation_type}`);
                            console.log(`      Connection Status: ${p.connection_status}`);
                            console.log(`      Message: ${p.message}`);
                            
                            // Identify the issues
                            if (p.child_name.includes('Emilia')) {
                                if (p.status === 'connected' && p.connection_status !== 'active') {
                                    console.log(`      🚨 BUG: Shows as "connected" but connection_status is "${p.connection_status}"`);
                                    console.log(`           Should show as "pending_connection" since no active connection exists`);
                                }
                                
                                if (p.status === 'connected' && !p.connection_status) {
                                    console.log(`      🚨 BUG: Shows as "connected" but connection_status is null/undefined`);
                                    console.log(`           This means no connection exists yet - should be "pending_connection"`);
                                }
                            }
                        });
                    }
                } else {
                    console.log('❌ Host cannot load participants:', await hostParticipantsResponse.text());
                }
                
                // Check connection status between the two users
                console.log('\n🔍 Step 5: Checking actual connection status...');
                
                // Check if there's an active connection between Emilia10 and Charlie11
                console.log(`   Checking connection between Emilia10 (${emilia10.id}) and Charlie11 (${charlie11.id})`);
                
                // This would require a direct database query, but we can infer from the participant data
                const emiliaParticipant = hostParticipantsData.data?.participants?.find(p => p.child_name.includes('Emilia'));
                if (emiliaParticipant) {
                    console.log(`   Emilia's connection_status in database: ${emiliaParticipant.connection_status || 'null/undefined'}`);
                    
                    if (emiliaParticipant.status === 'connected' && !emiliaParticipant.connection_status) {
                        console.log(`   🚨 ROOT CAUSE: Logic incorrectly shows "connected" when no actual connection exists`);
                        console.log(`   📝 EXPECTED: Should show "pending_connection" status`);
                    }
                }
                
                console.log('\n🎯 CALENDAR COLOR ANALYSIS:');
                console.log('The calendar color is determined by the activity status and participant status.');
                console.log('If showing dark blue instead of light blue:');
                console.log('- Dark blue = has active connections');  
                console.log('- Light blue = has pending connections only');
                console.log(`Current status returned: ${charlie1Activity.status}`);
                
            } else {
                console.log('❌ "charlie 1" activity not found in calendar');
                console.log('Available activities:');
                user11Calendar.data?.forEach(item => {
                    console.log(`   - ${item.activity_name || 'Unnamed'} (ID: ${item.id})`);
                });
            }
        } else {
            console.log('❌ Cannot load user11 calendar:', await user11CalendarResponse.text());
        }
        
    } catch (error) {
        console.error('❌ Reproduction failed:', error.message);
    }
}

reproduceColorStatusBug();