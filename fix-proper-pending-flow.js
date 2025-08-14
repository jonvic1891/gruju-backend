#!/usr/bin/env node

const fetch = require('node-fetch');

const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com';

async function fixProperPendingFlow() {
    try {
        console.log('🔄 SETTING UP PROPER PENDING INVITATIONS FLOW');
        console.log('=' .repeat(60));
        
        // Step 1: Login as test 3
        console.log('\n👤 Step 1: Login as test 3...');
        const loginResponse = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'jonathan.roberts006@hotmail.co.uk', password: 'test123' })
        });
        
        const loginData = await loginResponse.json();
        if (!loginData.success) {
            console.log('❌ Login failed');
            return;
        }
        console.log('✅ Login successful');
        const token = loginData.token;
        
        // Step 2: Delete existing connection with Emilia
        console.log('\n🗑️ Step 2: Deleting existing connection with Emilia...');
        
        const connectionsResponse = await fetch(`${API_BASE}/api/connections`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const connectionsData = await connectionsResponse.json();
        
        const emiliaConnection = connectionsData.data.find(conn => 
            conn.child1_name === 'Emilia' || conn.child2_name === 'Emilia'
        );
        
        if (emiliaConnection) {
            console.log(`Found connection: ${emiliaConnection.child1_name} <-> ${emiliaConnection.child2_name} (ID: ${emiliaConnection.id})`);
            
            const deleteResponse = await fetch(`${API_BASE}/api/connections/${emiliaConnection.id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (deleteResponse.ok) {
                console.log('✅ Connection deleted successfully');
            } else {
                console.log('❌ Failed to delete connection');
                const errorText = await deleteResponse.text();
                console.log('Error:', errorText);
                return;
            }
        } else {
            console.log('No existing connection found with Emilia');
        }
        
        // Step 3: Clear any existing invitations
        console.log('\n🧹 Step 3: Clearing existing invitations...');
        
        // Check if there are existing invitations to clear
        const today = new Date();
        const oneYearLater = new Date();
        oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
        const startDate = today.toISOString().split('T')[0];
        const endDate = oneYearLater.toISOString().split('T')[0];
        
        const invitationsResponse = await fetch(`${API_BASE}/api/calendar/invitations?start=${startDate}&end=${endDate}&_t=${Date.now()}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const invitationsData = await invitationsResponse.json();
        
        const toEmilia = invitationsData.data?.filter(inv => inv.invited_child_name === 'Emilia') || [];
        console.log(`Found ${toEmilia.length} existing invitations to Emilia`);
        
        // Delete existing invitations (we'll need to do this via responding "decline" or similar)
        for (const invitation of toEmilia) {
            // We can't directly delete invitations, but we can decline them to clear the state
            console.log(`Invitation: "${invitation.activity_name}" - Status: ${invitation.status}`);
        }
        
        // Step 4: Create activity with pending connection selection
        console.log('\n📋 Step 4: Creating new activity with pending invitation setup...');
        
        const childrenResponse = await fetch(`${API_BASE}/api/children`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const childrenData = await childrenResponse.json();
        const test3Child = childrenData.data[0];
        
        // Create a new test activity
        const newActivityData = {
            name: 'Test Pending Flow Activity',
            description: 'Testing the proper pending invitations flow',
            start_date: '2025-08-15',
            end_date: '2025-08-15',
            start_time: '14:00',
            end_time: '16:00',
            location: 'Test Location',
            cost: '0',
            max_participants: '10',
            auto_notify_new_connections: false
        };
        
        const createActivityResponse = await fetch(`${API_BASE}/api/activities/${test3Child.id}`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(newActivityData)
        });
        
        if (!createActivityResponse.ok) {
            console.log('❌ Failed to create activity');
            const errorText = await createActivityResponse.text();
            console.log('Error:', errorText);
            return;
        }
        
        const createActivityResult = await createActivityResponse.json();
        const newActivity = createActivityResult.data;
        console.log(`✅ Created activity: "${newActivity.name}" (ID: ${newActivity.id})`);
        
        // Step 5: Create pending invitation entry for Emilia (parent ID 67)
        console.log('\n📤 Step 5: Setting up pending invitation for Emilia...');
        
        const pendingConnections = ['pending-67']; // Emilia's parent ID
        
        const pendingResponse = await fetch(`${API_BASE}/api/activities/${newActivity.id}/pending-invitations`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ pending_connections: pendingConnections })
        });
        
        if (pendingResponse.ok) {
            const pendingResult = await pendingResponse.json();
            console.log('✅ Pending invitation setup successful!');
            console.log(`Stored pending connection: ${pendingConnections[0]}`);
        } else {
            console.log('❌ Failed to setup pending invitation');
            const errorText = await pendingResponse.text();
            console.log('Error:', errorText);
            return;
        }
        
        // Step 6: Send connection request to Emilia
        console.log('\n🤝 Step 6: Sending connection request to Emilia...');
        
        // Get Emilia's child ID
        const emiliaLoginResponse = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'roberts@example.com', password: 'test123' })
        });
        const emiliaLoginData = await emiliaLoginResponse.json();
        
        const emiliaChildrenResponse = await fetch(`${API_BASE}/api/children`, {
            headers: { 'Authorization': `Bearer ${emiliaLoginData.token}` }
        });
        const emiliaChildrenData = await emiliaChildrenResponse.json();
        const emiliaChild = emiliaChildrenData.data.find(child => child.name === 'Emilia');
        
        console.log(`Found Emilia: ${emiliaChild.name} (ID: ${emiliaChild.id})`);
        
        // Send connection request from test 3 to Emilia
        const connectionRequestData = {
            target_parent_id: emiliaLoginData.user.id, // Emilia's parent ID
            child_id: test3Child.id,
            target_child_id: emiliaChild.id,
            message: 'Connection request for pending invitation test'
        };
        
        const connectionRequestResponse = await fetch(`${API_BASE}/api/connections/request`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(connectionRequestData)
        });
        
        if (connectionRequestResponse.ok) {
            const connectionRequestResult = await connectionRequestResponse.json();
            console.log('✅ Connection request sent successfully!');
            console.log(`Request ID: ${connectionRequestResult.data?.id}`);
        } else {
            console.log('❌ Failed to send connection request');
            const errorText = await connectionRequestResponse.text();
            console.log('Error:', errorText);
            return;
        }
        
        console.log('\n' + '=' .repeat(60));
        console.log('🎯 PROPER PENDING FLOW SETUP COMPLETE!');
        console.log('');
        console.log('✅ STATE CONFIGURED:');
        console.log('   1. ✅ Deleted existing test 3 ↔ Emilia connection');
        console.log('   2. ✅ Created new test activity: "Test Pending Flow Activity"');
        console.log('   3. ✅ Set up pending invitation entry for Emilia (pending-67)');
        console.log('   4. ✅ Sent fresh connection request from test 3 to Emilia');
        console.log('');
        console.log('📱 NOW TEST THE PROPER FLOW:');
        console.log('');
        console.log('   1. 🌐 Login as: roberts@example.com / test123');
        console.log('   2. 📬 Accept the connection request from test 3');
        console.log('   3. 📋 Go to Children screen → Emilia\'s card');
        console.log('   4. 👀 Should see: 1 pending invitation for "Test Pending Flow Activity"');
        console.log('   5. ✅ Accept the invitation');
        console.log('   6. 📅 Check: Emilia\'s calendar should show the activity as connected');
        console.log('');
        console.log('🔧 WHAT SHOULD HAPPEN:');
        console.log('   - When Emilia accepts connection → processAutoNotifications runs');
        console.log('   - Finds pending invitation entry (pending-67)');
        console.log('   - Creates invitation from "Test Pending Flow Activity" to Emilia');
        console.log('   - Emilia sees invitation in Children screen');
        console.log('   - Emilia accepts → activity shows in her calendar');
        
    } catch (error) {
        console.error('❌ Setup error:', error.message);
    }
}

fixProperPendingFlow();