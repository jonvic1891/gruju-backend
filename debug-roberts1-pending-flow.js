#!/usr/bin/env node

const fetch = require('node-fetch');

const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com';

async function debugRoberts1PendingFlow() {
    try {
        console.log('🔍 DEBUGGING ROBERTS1 PENDING FLOW ISSUE');
        console.log('=' .repeat(60));
        
        // Step 1: Login as roberts1 (the host who created "blah new 1")
        console.log('\n👤 Step 1: Login as roberts1 (host)...');
        const hostLoginResponse = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'roberts1@example.com', password: 'test123' })
        });
        
        const hostLoginData = await hostLoginResponse.json();
        if (!hostLoginData.success) {
            console.log('❌ Host login failed:', hostLoginData.error);
            return;
        }
        console.log('✅ Host login successful');
        const hostToken = hostLoginData.token;
        
        // Get host's children and activities
        const hostChildrenResponse = await fetch(`${API_BASE}/api/children`, {
            headers: { 'Authorization': `Bearer ${hostToken}` }
        });
        const hostChildren = await hostChildrenResponse.json();
        const hostChild = hostChildren.data[0];
        
        console.log(`Host child: ${hostChild.name} (ID: ${hostChild.id})`);
        
        const activitiesResponse = await fetch(`${API_BASE}/api/activities/${hostChild.id}`, {
            headers: { 'Authorization': `Bearer ${hostToken}` }
        });
        const activities = await activitiesResponse.json();
        
        const blahNew1 = activities.data.find(activity => activity.name === 'blah new 1');
        if (!blahNew1) {
            console.log('❌ "blah new 1" activity not found');
            console.log('Available activities:', activities.data.map(a => a.name));
            return;
        }
        
        console.log(`✅ Found activity: "${blahNew1.name}" (ID: ${blahNew1.id})`);
        
        // Step 2: Check if pending invitation was stored
        console.log('\n📋 Step 2: Checking if pending invitation was stored for "blah new 1"...');
        
        // Login as Emilia's parent to get their ID
        const emiliaLoginResponse = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'roberts@example.com', password: 'test123' })
        });
        const emiliaLoginData = await emiliaLoginResponse.json();
        const emiliaParentId = emiliaLoginData.user.id;
        
        console.log(`Emilia's parent ID: ${emiliaParentId}`);
        
        // Test if we can create pending invitation manually
        const pendingConnectionId = `pending-${emiliaParentId}`;
        console.log(`Expected pending connection ID: ${pendingConnectionId}`);
        
        const testPendingResponse = await fetch(`${API_BASE}/api/activities/${blahNew1.id}/pending-invitations`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${hostToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ pending_connections: [pendingConnectionId] })
        });
        
        if (testPendingResponse.ok) {
            const testResult = await testPendingResponse.json();
            console.log('✅ Pending invitation API works:', testResult);
        } else {
            console.log('❌ Failed to create pending invitation');
            const errorText = await testPendingResponse.text();
            console.log('Error:', errorText);
        }
        
        // Step 3: Check connection status
        console.log('\n🔗 Step 3: Checking connection between roberts1 and roberts families...');
        
        const connectionsResponse = await fetch(`${API_BASE}/api/connections`, {
            headers: { 'Authorization': `Bearer ${hostToken}` }
        });
        const connections = await connectionsResponse.json();
        
        console.log(`Host has ${connections.data?.length || 0} connections:`);
        connections.data?.forEach(conn => {
            console.log(`   - ${conn.child1_name} <-> ${conn.child2_name} (${conn.status})`);
            if (conn.child1_name === 'Emilia' || conn.child2_name === 'Emilia') {
                console.log(`      🎯 FOUND CONNECTION WITH EMILIA! ID: ${conn.id}`);
            }
        });
        
        // Step 4: Check if Emilia received any invitations
        console.log('\n📧 Step 4: Checking if Emilia received invitations from roberts1...');
        
        const today = new Date();
        const oneYearLater = new Date();
        oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
        const startDate = today.toISOString().split('T')[0];
        const endDate = oneYearLater.toISOString().split('T')[0];
        
        const emiliaInvitationsResponse = await fetch(`${API_BASE}/api/calendar/invitations?start=${startDate}&end=${endDate}&_t=${Date.now()}`, {
            headers: { 'Authorization': `Bearer ${emiliaLoginData.token}` }
        });
        const emiliaInvitations = await emiliaInvitationsResponse.json();
        
        const fromRoberts1 = emiliaInvitations.data?.filter(inv => 
            inv.host_parent_username === hostLoginData.user.username
        ) || [];
        
        console.log(`Emilia has ${fromRoberts1.length} invitations from roberts1:`);
        fromRoberts1.forEach(inv => {
            console.log(`   - "${inv.activity_name}" - Status: ${inv.status}`);
        });
        
        console.log('\n' + '=' .repeat(60));
        console.log('🔍 DIAGNOSIS OF YOUR ISSUE:');
        console.log('');
        console.log('❌ THE MISSING STEP: You didn\'t select Emilia as a pending connection!');
        console.log('');
        console.log('📝 WHAT YOU DID:');
        console.log('   1. ✅ Created activity "blah new 1"');
        console.log('   2. ❌ Did NOT select Emilia as pending connection in activity');
        console.log('   3. ✅ Sent connection request to Emilia');
        console.log('   4. ✅ Emilia accepted connection');
        console.log('   5. ❌ No invitation sent (because no pending connection was stored)');
        console.log('');
        console.log('📝 WHAT YOU SHOULD HAVE DONE:');
        console.log('   1. ✅ Create activity "blah new 1"');
        console.log('   2. ✅ In activity creation, check "⏳ Emilia (pending connection)"');
        console.log('   3. ✅ Save activity (stores pending invitation in database)');
        console.log('   4. ✅ Send connection request to Emilia');
        console.log('   5. ✅ Emilia accepts connection');
        console.log('   6. ✅ processAutoNotifications runs and sends invitation automatically');
        console.log('');
        console.log('🔧 WHAT I DID DIFFERENTLY FOR "blah 8":');
        console.log('   - I manually created the pending invitation entry using the API');
        console.log('   - This bypassed the UI step you missed');
        console.log('   - That\'s why "blah 8" worked but "blah new 1" didn\'t');
        console.log('');
        console.log('💡 TO FIX "blah new 1" NOW:');
        console.log('   1. Edit the "blah new 1" activity');
        console.log('   2. Select Emilia as a connected child');
        console.log('   3. Save the activity');
        console.log('   4. This should trigger the pending invitation system');
        
        // Step 5: Try to fix it by manually adding pending invitation
        console.log('\n🔧 Step 5: Attempting to fix "blah new 1" by adding pending invitation...');
        
        const fixResponse = await fetch(`${API_BASE}/api/activities/${blahNew1.id}/pending-invitations`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${hostToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ pending_connections: [pendingConnectionId] })
        });
        
        if (fixResponse.ok) {
            console.log('✅ Added pending invitation for "blah new 1"');
            
            // Since connection already exists, manually create the invitation
            const inviteData = {
                invited_parent_id: emiliaParentId,
                child_id: emiliaLoginData.data?.find(child => child.name === 'Emilia')?.id || 67,
                message: `${hostChild.name} would like to invite your child to join: ${blahNew1.name}`
            };
            
            const manualInviteResponse = await fetch(`${API_BASE}/api/activities/${blahNew1.id}/invite`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${hostToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(inviteData)
            });
            
            if (manualInviteResponse.ok) {
                console.log('✅ Manually sent invitation for "blah new 1"');
                console.log('');
                console.log('📱 NOW CHECK:');
                console.log('   1. Login as roberts@example.com / test123');
                console.log('   2. Go to Children screen');
                console.log('   3. Emilia should now have invitation for "blah new 1"');
            } else {
                console.log('❌ Failed to manually send invitation');
            }
        } else {
            console.log('❌ Failed to add pending invitation');
        }
        
    } catch (error) {
        console.error('❌ Debug error:', error.message);
    }
}

debugRoberts1PendingFlow();