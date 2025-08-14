#!/usr/bin/env node

const fetch = require('node-fetch');
const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com';

async function createPendingConnectionTest() {
    try {
        console.log('🧪 CREATING PENDING CONNECTION TEST SCENARIO');
        console.log('='.repeat(60));
        console.log('This reproduces the exact issue: calendar shows dark blue instead of light blue');
        console.log('and participants show as connected when they should be pending');
        
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
        
        // Get their children
        const user10Children = await fetch(`${API_BASE}/api/children`, {
            headers: { 'Authorization': `Bearer ${user10Login.token}` }
        }).then(r => r.json());
        
        const user11Children = await fetch(`${API_BASE}/api/children`, {
            headers: { 'Authorization': `Bearer ${user11Login.token}` }
        }).then(r => r.json());
        
        const emilia10 = user10Children.data[0]; // First child should be Emilia 10
        const charlie11 = user11Children.data[0]; // First child should be Charlie 11
        
        console.log(`   Children: ${emilia10.name} (${emilia10.id}), ${charlie11.name} (${charlie11.id})`);
        
        // Step 1: Create activity as User11 (Charlie's parent)
        console.log('\n📝 Step 1: Creating activity "Test Pending Connection"...');
        
        const activityData = {
            name: 'Test Pending Connection',
            description: 'Testing calendar color and status bug',
            start_date: '2025-08-25',
            end_date: '2025-08-25',
            start_time: '10:00',
            end_time: '12:00',
            location: 'Test Location',
            cost: '0',
            max_participants: '5',
            auto_notify_new_connections: false
        };
        
        const createResponse = await fetch(`${API_BASE}/api/activities/${charlie11.id}`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${user11Login.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(activityData)
        });
        
        const createdActivity = await createResponse.json();
        console.log(`✅ Created activity: "${createdActivity.data.name}" (ID: ${createdActivity.data.id})`);
        
        // Step 2: Add pending invitation for User10 (Emilia's parent)
        console.log('\n📝 Step 2: Adding pending invitation for Emilia 10...');
        
        const pendingResponse = await fetch(`${API_BASE}/api/activities/${createdActivity.data.id}/pending-invitations`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${user11Login.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ pending_connections: [`pending-${user10Login.user.id}`] })
        });
        
        if (pendingResponse.ok) {
            console.log('✅ Added pending invitation for Emilia 10');
        } else {
            console.log('❌ Failed to add pending invitation:', await pendingResponse.text());
        }
        
        // Step 3: Check participants as the host (this is where the bug shows up)
        console.log('\n🔍 Step 3: Checking participants from host perspective...');
        
        const hostParticipantsResponse = await fetch(`${API_BASE}/api/activities/${createdActivity.data.id}/participants`, {
            headers: { 'Authorization': `Bearer ${user11Login.token}` }
        });
        
        if (hostParticipantsResponse.ok) {
            const hostParticipantsData = await hostParticipantsResponse.json();
            console.log(`📊 Host sees ${hostParticipantsData.data?.participants?.length || 0} participants:`);
            
            if (hostParticipantsData.data?.participants?.length > 0) {
                hostParticipantsData.data.participants.forEach((p, i) => {
                    console.log(`\n   ${i + 1}. ${p.child_name}`);
                    console.log(`      Status: "${p.status}"`);
                    console.log(`      Invitation Type: "${p.invitation_type}"`);
                    console.log(`      Connection Status: "${p.connection_status || 'null'}"`);
                    console.log(`      Message: "${p.message}"`);
                    
                    // Analyze the bug
                    if (p.status === 'connected') {
                        console.log('      🚨 BUG DETECTED:');
                        console.log('         - Shows as "connected" but no connection request was made');
                        console.log('         - This should be "pending_connection" instead');
                        console.log('         - Calendar will show DARK BLUE instead of LIGHT BLUE');
                        
                        if (p.connection_status === 'active') {
                            console.log('         - connection_status shows "active" incorrectly');
                        } else if (!p.connection_status) {
                            console.log('         - connection_status is null, confirming no real connection');
                        }
                    } else if (p.status === 'pending_connection') {
                        console.log('      ✅ CORRECT: Shows as "pending_connection" as expected');
                        console.log('         - Calendar should show LIGHT BLUE');
                    }
                });
            }
        } else {
            console.log('❌ Cannot load participants:', await hostParticipantsResponse.text());
        }
        
        // Step 4: Check what the calendar API returns for color determination
        console.log('\n🎨 Step 4: Checking calendar data for color determination...');
        
        const today = new Date();
        const startDate = today.toISOString().split('T')[0];
        const endDate = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        const calendarResponse = await fetch(`${API_BASE}/api/calendar/invitations?start=${startDate}&end=${endDate}&_t=${Date.now()}`, {
            headers: { 'Authorization': `Bearer ${user11Login.token}` }
        });
        
        if (calendarResponse.ok) {
            const calendarData = await calendarResponse.json();
            const ourActivity = calendarData.data?.find(item => item.id === createdActivity.data.id);
            
            if (ourActivity) {
                console.log(`📅 Calendar entry found for activity ${createdActivity.data.id}:`);
                console.log(`   Activity Name: ${ourActivity.activity_name}`);
                console.log(`   Status: ${ourActivity.status}`);
                console.log(`   Has connections: ${ourActivity.has_connections || 'not specified'}`);
                
                console.log('\n🎯 COLOR DETERMINATION LOGIC:');
                if (ourActivity.status === 'connected' || ourActivity.has_connections) {
                    console.log('   🔵 DARK BLUE - Activity has active connections');
                } else {
                    console.log('   🔷 LIGHT BLUE - Activity has pending connections only');
                }
            } else {
                console.log('❌ Activity not found in calendar response');
            }
        }
        
        console.log('\n🔧 ROOT CAUSE ANALYSIS:');
        console.log('The issue is in the participants query logic:');
        console.log('1. It checks if there is a connection between children');
        console.log('2. If ANY connection exists, it marks status as "connected"');  
        console.log('3. But it should check if the connection is ACTIVE, not just existing');
        console.log('4. Pending connections (not accepted yet) should show "pending_connection"');
        
        // Cleanup
        console.log('\n🧹 Cleaning up...');
        await fetch(`${API_BASE}/api/activities/${createdActivity.data.id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${user11Login.token}` }
        });
        console.log('✅ Cleanup complete');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

createPendingConnectionTest();