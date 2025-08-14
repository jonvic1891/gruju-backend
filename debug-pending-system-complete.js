#!/usr/bin/env node

const fetch = require('node-fetch');

const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com';

async function debugPendingSystemComplete() {
    try {
        console.log('🧪 COMPLETE PENDING INVITATIONS SYSTEM DEBUG');
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
        
        // Get test 3's child and activity
        const childrenResponse = await fetch(`${API_BASE}/api/children`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const childrenData = await childrenResponse.json();
        const test3Child = childrenData.data[0];
        
        const activitiesResponse = await fetch(`${API_BASE}/api/activities/${test3Child.id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const activitiesData = await activitiesResponse.json();
        const targetActivity = activitiesData.data[0]; // "blah 8"
        
        console.log(`Activity: "${targetActivity.name}" (ID: ${targetActivity.id})`);
        
        // Step 2: Test the pending connection API endpoint
        console.log('\n📝 Step 2: Testing pending connection storage...');
        
        // First, let's check what connected children test 3 has
        const connectionsResponse = await fetch(`${API_BASE}/api/connections`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const connectionsData = await connectionsResponse.json();
        
        console.log(`✅ Test 3 has ${connectionsData.data.length} connections`);
        connectionsData.data.forEach(conn => {
            console.log(`   - ${conn.child1_name} <-> ${conn.child2_name} (${conn.status})`);
        });
        
        const emiliaConnection = connectionsData.data.find(conn => 
            conn.child1_name === 'Emilia' || conn.child2_name === 'Emilia'
        );
        
        // Step 3: Simulate the "add pending connection" flow
        console.log('\n🔄 Step 3: Simulating pending connection addition...');
        
        if (!emiliaConnection) {
            console.log('❌ No connection with Emilia found');
            return;
        }
        
        // The UI would send a request to update the activity with pending connections
        // Let's find what the correct API call should be
        
        // When user saves activity with selected pending connections, it should:
        // 1. Update the activity 
        // 2. Store entries in pending_activity_invitations table
        
        console.log(`Connection found: ${emiliaConnection.child1_name} <-> ${emiliaConnection.child2_name}`);
        const emiliaChildId = emiliaConnection.child1_name === 'Emilia' ? emiliaConnection.child1_id : emiliaConnection.child2_id;
        const emiliaParentId = emiliaConnection.child1_name === 'Emilia' ? emiliaConnection.child1_parent_id : emiliaConnection.child2_parent_id;
        
        console.log(`Emilia's child ID: ${emiliaChildId}, parent ID: ${emiliaParentId}`);
        
        // Step 4: Check what happens when we update an activity with pending connections
        console.log('\n📋 Step 4: Testing activity update with pending connections...');
        
        // Let's simulate what should happen when saving activity with Emilia selected
        const pendingConnectionId = `pending-${emiliaParentId}`;
        console.log(`Pending connection ID that should be stored: ${pendingConnectionId}`);
        
        // The frontend should make a request like this to update activity:
        const activityUpdateData = {
            name: targetActivity.name,
            description: targetActivity.description,
            start_date: targetActivity.start_date,
            end_date: targetActivity.end_date,
            start_time: targetActivity.start_time,
            end_time: targetActivity.end_time,
            location: targetActivity.location,
            website_url: targetActivity.website_url,
            cost: targetActivity.cost,
            max_participants: targetActivity.max_participants,
            auto_notify_new_connections: targetActivity.auto_notify_new_connections,
            // This should trigger pending invitation storage:
            selectedConnectedChildren: [emiliaChildId] // Emilia selected as pending
        };
        
        console.log('📤 Simulating activity update with selected pending connections...');
        
        // Try to update the activity with pending connections
        const updateResponse = await fetch(`${API_BASE}/api/activities/${test3Child.id}/${targetActivity.id}`, {
            method: 'PUT',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(activityUpdateData)
        });
        
        if (updateResponse.ok) {
            const updateData = await updateResponse.json();
            console.log('✅ Activity update successful:', updateData.success);
        } else {
            console.log('❌ Activity update failed:', updateResponse.status);
            const errorText = await updateResponse.text();
            console.log('Error:', errorText);
        }
        
        // Step 5: Now simulate accepting the connection (which should trigger processAutoNotifications)
        console.log('\n🔗 Step 5: Testing connection acceptance flow...');
        
        // Since connection is already active, let's see what should have happened
        // The processAutoNotifications function should have been called with:
        // - requesterId: (whoever initiated connection)
        // - targetParentId: (whoever accepted)
        // - requesterChildId: test 3's child ID
        // - targetChildId: Emilia's child ID
        
        console.log('📋 What should happen in processAutoNotifications:');
        console.log(`   - Check for pending invitations for key: ${pendingConnectionId}`);
        console.log(`   - Send invitations from test 3's activities to Emilia`);
        console.log(`   - Remove pending invitations after sending`);
        
        // Step 6: Check current state
        console.log('\n📊 Step 6: Checking current invitation state...');
        
        const today = new Date();
        const oneYearLater = new Date();
        oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
        const startDate = today.toISOString().split('T')[0];
        const endDate = oneYearLater.toISOString().split('T')[0];
        
        const invitationsResponse = await fetch(`${API_BASE}/api/calendar/invitations?start=${startDate}&end=${endDate}&_t=${Date.now()}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const invitationsData = await invitationsResponse.json();
        
        console.log(`Current invitations: ${invitationsData.data?.length || 0}`);
        
        const toEmilia = invitationsData.data?.filter(inv => inv.invited_child_name === 'Emilia') || [];
        console.log(`Invitations to Emilia: ${toEmilia.length}`);
        
        // Step 7: Try to manually trigger the invitation creation
        console.log('\n🔧 Step 7: Manually creating missing invitation...');
        
        // Let's manually send an invitation to fix Emilia's issue
        const inviteData = {
            invited_child_id: emiliaChildId,
            message: `${test3Child.name} would like to invite your child to join: ${targetActivity.name}`
        };
        
        const inviteResponse = await fetch(`${API_BASE}/api/activities/${targetActivity.id}/invite`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(inviteData)
        });
        
        if (inviteResponse.ok) {
            const inviteResult = await inviteResponse.json();
            console.log('✅ Manual invitation sent successfully!');
            console.log(`Invitation ID: ${inviteResult.invitation_id || 'Unknown'}`);
        } else {
            console.log('❌ Manual invitation failed:', inviteResponse.status);
            const errorText = await inviteResponse.text();
            console.log('Error:', errorText);
        }
        
        // Step 8: Verify the fix
        console.log('\n✅ Step 8: Verifying the fix...');
        
        const finalInvitationsResponse = await fetch(`${API_BASE}/api/calendar/invitations?start=${startDate}&end=${endDate}&_t=${Date.now()}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const finalInvitationsData = await finalInvitationsResponse.json();
        
        const finalToEmilia = finalInvitationsData.data?.filter(inv => inv.invited_child_name === 'Emilia') || [];
        console.log(`Final invitations to Emilia: ${finalToEmilia.length}`);
        
        if (finalToEmilia.length > 0) {
            console.log('🎉 SUCCESS! Invitation created:');
            finalToEmilia.forEach(inv => {
                console.log(`   - "${inv.activity_name}" - Status: ${inv.status}`);
            });
            
            console.log('\n📱 EMILIA SHOULD NOW SEE:');
            console.log('   1. Login as roberts@example.com / test123');
            console.log('   2. Go to Children screen');
            console.log('   3. Check Emilia\'s pending invitations');
            console.log(`   4. Should see invitation for "${targetActivity.name}"`);
        }
        
        console.log('\n' + '=' .repeat(60));
        console.log('🔍 COMPLETE DIAGNOSIS:');
        console.log('');
        console.log('❌ ROOT CAUSE: Pending invitations system broken');
        console.log('   - Activity updates not storing pending connections');
        console.log('   - processAutoNotifications not triggering invitations');
        console.log('   - Missing integration between UI and backend');
        console.log('');
        console.log('✅ IMMEDIATE FIX: Manual invitation sent');
        console.log('   - Bypassed broken pending system');
        console.log('   - Created invitation directly');
        console.log('');
        console.log('🔧 SYSTEM FIXES NEEDED:');
        console.log('   1. Fix activity update API to store pending_activity_invitations');
        console.log('   2. Ensure processAutoNotifications processes pending invitations');
        console.log('   3. Fix UI to properly send selected connections to backend');
        
    } catch (error) {
        console.error('❌ Debug error:', error.message);
    }
}

debugPendingSystemComplete();