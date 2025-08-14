#!/usr/bin/env node

const fetch = require('node-fetch');

const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com';

async function debugTest3UserFlow() {
    try {
        console.log('🧪 DEBUGGING TEST 3 USER -> EMILIA CONNECTION FLOW');
        console.log('=' .repeat(60));
        
        // Login to test 3 account
        let test3Account = null;
        
        console.log('\n🔍 Step 1: Logging into test 3 user account...');
        
        const loginResponse = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'jonathan.roberts006@hotmail.co.uk', password: 'test123' })
        });
        
        const loginData = await loginResponse.json();
        if (!loginData.success) {
            console.log('❌ Could not login to test 3 account:', loginData.error);
            return;
        }
        
        console.log(`✅ Found test 3 account: jonathan.roberts006@hotmail.co.uk`);
        test3Account = { email: 'jonathan.roberts006@hotmail.co.uk', token: loginData.token, userId: loginData.user.id, username: loginData.user.username };
        
        console.log(`\n👤 Step 2: Checking test 3's children and activities...`);
        console.log(`User: ${test3Account.username} (${test3Account.email})`);
        
        // Get test 3's children
        const childrenResponse = await fetch(`${API_BASE}/api/children`, {
            headers: { 'Authorization': `Bearer ${test3Account.token}` }
        });
        const childrenData = await childrenResponse.json();
        
        if (!childrenData.success || !childrenData.data || childrenData.data.length === 0) {
            console.log('❌ No children found for test 3 account');
            return;
        }
        
        console.log(`✅ Found ${childrenData.data.length} children:`);
        childrenData.data.forEach(child => {
            console.log(`   - ${child.name} (ID: ${child.id})`);
        });
        
        // Check activities for each child
        let targetActivity = null;
        let targetChild = null;
        
        for (const child of childrenData.data) {
            const activitiesResponse = await fetch(`${API_BASE}/api/activities/${child.id}`, {
                headers: { 'Authorization': `Bearer ${test3Account.token}` }
            });
            const activitiesData = await activitiesResponse.json();
            
            if (activitiesData.success && activitiesData.data) {
                console.log(`\n📋 Activities for ${child.name}:`);
                activitiesData.data.forEach((activity, i) => {
                    console.log(`   ${i+1}. "${activity.name}" on ${activity.start_date}`);
                });
                
                // Look for recent activity (likely the one created for this test)
                const recentActivity = activitiesData.data[0]; // Most recent
                if (recentActivity) {
                    targetActivity = recentActivity;
                    targetChild = child;
                }
            }
        }
        
        if (!targetActivity) {
            console.log('❌ No activities found for test 3');
            return;
        }
        
        console.log(`\n🎯 Target Activity: "${targetActivity.name}" by ${targetChild.name}`);
        console.log(`Activity ID: ${targetActivity.id}, Date: ${targetActivity.start_date}`);
        
        // Step 3: Check connections with Emilia/Roberts
        console.log(`\n🔗 Step 3: Checking connections between test 3 and Roberts family...`);
        
        const connectionsResponse = await fetch(`${API_BASE}/api/connections`, {
            headers: { 'Authorization': `Bearer ${test3Account.token}` }
        });
        
        if (connectionsResponse.ok) {
            const connectionsData = await connectionsResponse.json();
            if (connectionsData.success && connectionsData.data) {
                console.log(`✅ Test 3 has ${connectionsData.data.length} connections:`);
                
                connectionsData.data.forEach((conn, i) => {
                    console.log(`   ${i+1}. ${conn.child1_name} <-> ${conn.child2_name} (${conn.status})`);
                    if (conn.child1_name === 'Emilia' || conn.child2_name === 'Emilia') {
                        console.log(`      🎯 FOUND CONNECTION WITH EMILIA! Status: ${conn.status}`);
                    }
                });
                
                const emiliaConnection = connectionsData.data.find(conn => 
                    conn.child1_name === 'Emilia' || conn.child2_name === 'Emilia'
                );
                
                if (!emiliaConnection) {
                    console.log('❌ NO CONNECTION found with Emilia');
                    return;
                }
                
                console.log(`\n✅ Connection with Emilia exists:`);
                console.log(`   - ${emiliaConnection.child1_name} <-> ${emiliaConnection.child2_name}`);
                console.log(`   - Status: ${emiliaConnection.status}`);
                console.log(`   - Connection ID: ${emiliaConnection.id}`);
            }
        }
        
        // Step 4: Check pending_activity_invitations table for this activity
        console.log(`\n📋 Step 4: Checking if Emilia was added as pending connection to activity...`);
        
        // Get date range
        const today = new Date();
        const oneYearLater = new Date();
        oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
        
        const startDate = today.toISOString().split('T')[0];
        const endDate = oneYearLater.toISOString().split('T')[0];
        
        // Check invitations FROM this activity
        const invitationsResponse = await fetch(`${API_BASE}/api/calendar/invitations?start=${startDate}&end=${endDate}&_t=${Date.now()}`, {
            headers: { 'Authorization': `Bearer ${test3Account.token}` }
        });
        const invitationsData = await invitationsResponse.json();
        
        if (invitationsData.success && invitationsData.data) {
            console.log(`✅ Found ${invitationsData.data.length} total invitations`);
            
            // Look for invitations TO Emilia FROM this user
            const emiliaInvitations = invitationsData.data.filter(inv => 
                inv.invited_child_name === 'Emilia' && inv.host_parent_username === test3Account.username
            );
            
            console.log(`📤 ${emiliaInvitations.length} invitations sent to Emilia:`);
            emiliaInvitations.forEach((inv, i) => {
                console.log(`   ${i+1}. "${inv.activity_name}" - Status: ${inv.status}`);
                console.log(`       Activity ID: ${inv.id}, Invitation ID: ${inv.invitation_id}`);
                if (inv.activity_name === targetActivity.name) {
                    console.log(`      🎯 FOUND TARGET ACTIVITY INVITATION! Status: ${inv.status}`);
                }
            });
            
            const targetInvitation = emiliaInvitations.find(inv => inv.activity_name === targetActivity.name);
            
            if (!targetInvitation) {
                console.log(`❌ NO INVITATION sent to Emilia for "${targetActivity.name}"`);
                console.log('📝 This means the "pending connection" flow may not have worked');
            } else if (targetInvitation.status === 'accepted') {
                console.log(`✅ INVITATION ACCEPTED! Emilia should see "${targetActivity.name}" as connected activity`);
            } else {
                console.log(`⏳ Invitation status: ${targetInvitation.status}`);
            }
        }
        
        console.log('\n' + '=' .repeat(60));
        console.log('🔍 FLOW DIAGNOSIS:');
        
        if (targetActivity && emiliaConnection && targetInvitation?.status === 'accepted') {
            console.log('✅ Flow completed successfully:');
            console.log('   1. ✅ Test 3 created activity');
            console.log('   2. ✅ Connected with Emilia');
            console.log('   3. ✅ Added Emilia as pending connection');
            console.log('   4. ✅ Emilia accepted invitation');
            console.log('   5. 📋 Emilia should see activity in her calendar');
            console.log('\n🔧 IF EMILIA STILL DOESN\'T SEE THE ACTIVITY:');
            console.log('   - Check ChildActivityScreen invited activities section');
            console.log('   - Check /api/calendar/invited-activities endpoint');
        } else {
            console.log('❌ Flow incomplete:');
            if (!targetActivity) console.log('   - No activity found');
            if (!emiliaConnection) console.log('   - No connection with Emilia');
            if (!targetInvitation) console.log('   - No invitation sent to Emilia');
            if (targetInvitation?.status !== 'accepted') console.log(`   - Invitation not accepted (status: ${targetInvitation?.status})`);
        }
        
    } catch (error) {
        console.error('❌ Test error:', error.message);
    }
}

debugTest3UserFlow();