#!/usr/bin/env node

const fetch = require('node-fetch');
const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com';

async function checkCalendarActivities() {
    try {
        console.log('🔍 CHECKING CALENDAR ACTIVITIES ENDPOINT');
        console.log('='.repeat(60));
        console.log('Using the correct /api/calendar/activities endpoint');
        
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
        
        // Check the calendar/activities endpoint for User11 (Charlie - activity host)
        console.log('\n📅 Checking /api/calendar/activities for User11 (Charlie)...');
        const user11CalendarResponse = await fetch(`${API_BASE}/api/calendar/activities?start=2025-07-31&end=2025-08-30`, {
            headers: { 'Authorization': `Bearer ${user11Login.token}` }
        });
        
        if (user11CalendarResponse.ok) {
            const user11Calendar = await user11CalendarResponse.json();
            console.log(`📋 User11 has ${user11Calendar.data?.length || 0} activities in the date range`);
            
            // Look for "charlie 1" activity
            const charlie1Activity = user11Calendar.data?.find(activity => 
                activity.name && (
                    activity.name.toLowerCase().includes('charlie 1') ||
                    activity.name.toLowerCase().includes('charlie1')
                )
            );
            
            if (charlie1Activity) {
                console.log(`\n🎯 FOUND "charlie 1" activity!`);
                console.log(`   ID: ${charlie1Activity.id}`);
                console.log(`   Name: "${charlie1Activity.name}"`);
                console.log(`   Date: ${charlie1Activity.start_date}`);
                console.log(`   Time: ${charlie1Activity.start_time} - ${charlie1Activity.end_time}`);
                console.log(`   Calendar Status: ${charlie1Activity.status || 'no status'}`);
                console.log(`   Has Connections: ${charlie1Activity.has_connections || 'undefined'}`);
                
                // This is the key part - check the calendar color logic
                console.log('\n🎨 CALENDAR COLOR ANALYSIS:');
                if (charlie1Activity.status === 'active' || charlie1Activity.has_connections) {
                    console.log('   🔵 Shows DARK BLUE (has connections/active status)');
                    console.log('   🚨 BUG: This should be LIGHT BLUE if connections are pending only');
                } else {
                    console.log('   🔷 Shows LIGHT BLUE (pending connections only)');
                }
                
                // Now check the participants for this activity
                console.log('\n👥 CHECKING PARTICIPANTS:');
                const participantsResponse = await fetch(`${API_BASE}/api/activities/${charlie1Activity.id}/participants`, {
                    headers: { 'Authorization': `Bearer ${user11Login.token}` }
                });
                
                if (participantsResponse.ok) {
                    const participantsData = await participantsResponse.json();
                    console.log(`   Found ${participantsData.data?.participants?.length || 0} participants:`);
                    
                    if (participantsData.data?.participants?.length > 0) {
                        participantsData.data.participants.forEach((p, i) => {
                            console.log(`\n   ${i + 1}. ${p.child_name}`);
                            console.log(`      Status: "${p.status}"`);
                            console.log(`      Invitation Type: "${p.invitation_type}"`);
                            console.log(`      Connection Status: "${p.connection_status || 'null'}"`);
                            console.log(`      Pending ID: ${p.pending_id || 'null'}`);
                            console.log(`      Invitation ID: ${p.invitation_id || 'null'}`);
                            
                            // Check for the specific bug you reported
                            if (p.child_name.includes('Emilia')) {
                                if (p.status === 'connected' && !p.connection_status) {
                                    console.log('      🚨 BUG CONFIRMED: Shows "connected" but connection_status is null');
                                    console.log('      📝 Should show "pending_connection" since Emilia hasn\'t accepted');
                                } else if (p.status === 'connected' && p.connection_status !== 'active') {
                                    console.log(`      🚨 BUG CONFIRMED: Shows "connected" but connection_status is "${p.connection_status}"`);
                                    console.log('      📝 Should show "pending_connection" since connection not active');
                                } else if (p.status === 'pending_connection') {
                                    console.log('      ✅ CORRECT: Shows "pending_connection"');
                                }
                                
                                // Check if this participant has pending_id (meaning it's from pending_activity_invitations)
                                if (p.pending_id && !p.invitation_id) {
                                    console.log('      📍 This is a PENDING invitation (not sent yet)');
                                    if (p.status === 'connected') {
                                        console.log('      🔧 ROOT CAUSE: Pending invitations incorrectly showing as "connected"');
                                    }
                                }
                            }
                        });
                    }
                } else {
                    console.log('   ❌ Cannot load participants:', await participantsResponse.text());
                }
                
                console.log('\n🔍 DEBUGGING THE LOGIC:');
                console.log('The issue seems to be in the participants query that determines status.');
                console.log('When there\'s a pending invitation, it should check:');
                console.log('1. Is there an actual active connection between the children?');
                console.log('2. If NO active connection → status should be "pending_connection"');
                console.log('3. If YES active connection → status should be "connected"');
                
            } else {
                console.log('\n❌ "charlie 1" activity not found');
                console.log('📋 Available activities:');
                user11Calendar.data?.slice(0, 10).forEach(activity => {
                    console.log(`   - "${activity.name}" (ID: ${activity.id}) on ${activity.start_date} at ${activity.start_time}`);
                });
            }
        } else {
            console.log('❌ Cannot load calendar/activities:', await user11CalendarResponse.text());
        }
        
    } catch (error) {
        console.error('❌ Check failed:', error.message);
    }
}

checkCalendarActivities();