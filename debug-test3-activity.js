#!/usr/bin/env node

const fetch = require('node-fetch');

const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com';

async function debugTest3Activity() {
    try {
        console.log('🧪 DEBUGGING "TEST 3" ACTIVITY AND INVITATIONS');
        console.log('=' .repeat(60));
        
        // Search through demo accounts to find "test 3" activity
        const accounts = [
            { email: 'johnson@example.com', password: 'demo123', name: 'Johnson' },
            { email: 'smith@example.com', password: 'demo123', name: 'Smith' },
            { email: 'davis@example.com', password: 'demo123', name: 'Davis' },
            { email: 'wong@example.com', password: 'demo123', name: 'Wong' },
            { email: 'brown@example.com', password: 'demo123', name: 'Brown' },
            { email: 'wilson@example.com', password: 'demo123', name: 'Wilson' }
        ];
        
        let test3Host = null;
        let test3Activity = null;
        
        console.log('\n🔍 Step 1: Searching for "test 3" activity across all demo accounts...');
        
        for (const account of accounts) {
            try {
                const loginResponse = await fetch(`${API_BASE}/api/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: account.email, password: account.password })
                });
                
                const loginData = await loginResponse.json();
                if (loginData.success) {
                    console.log(`\n👤 Checking ${account.name} family...`);
                    
                    // Get children for this account
                    const childrenResponse = await fetch(`${API_BASE}/api/children`, {
                        headers: { 'Authorization': `Bearer ${loginData.token}` }
                    });
                    const childrenData = await childrenResponse.json();
                    
                    if (childrenData.success && childrenData.data) {
                        // Check each child's activities
                        for (const child of childrenData.data) {
                            const activitiesResponse = await fetch(`${API_BASE}/api/activities/${child.id}`, {
                                headers: { 'Authorization': `Bearer ${loginData.token}` }
                            });
                            const activitiesData = await activitiesResponse.json();
                            
                            if (activitiesData.success && activitiesData.data) {
                                const test3 = activitiesData.data.find(activity => 
                                    activity.name.toLowerCase().includes('test 3')
                                );
                                
                                if (test3) {
                                    console.log(`✅ FOUND "test 3" activity in ${account.name} family!`);
                                    console.log(`   - Activity: "${test3.name}" (ID: ${test3.id})`);
                                    console.log(`   - Child: ${child.name} (ID: ${child.id})`);
                                    console.log(`   - Date: ${test3.start_date}`);
                                    console.log(`   - Auto-notify: ${test3.auto_notify_new_connections}`);
                                    
                                    test3Host = { ...account, token: loginData.token, userId: loginData.user.id };
                                    test3Activity = test3;
                                    break;
                                }
                            }
                        }
                    }
                }
                
                if (test3Activity) break;
            } catch (error) {
                // Continue searching
            }
        }
        
        if (!test3Activity || !test3Host) {
            console.log('❌ Could not find "test 3" activity in any demo account');
            return;
        }
        
        console.log(`\n📋 Step 2: Checking invitations sent from "${test3Activity.name}" activity...`);
        
        // Get date range
        const today = new Date();
        const oneYearLater = new Date();
        oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
        
        const startDate = today.toISOString().split('T')[0];
        const endDate = oneYearLater.toISOString().split('T')[0];
        
        // Check invitations sent by this host
        const invitationsResponse = await fetch(`${API_BASE}/api/calendar/invitations?start=${startDate}&end=${endDate}&_t=${Date.now()}`, {
            headers: { 'Authorization': `Bearer ${test3Host.token}` }
        });
        const invitationsData = await invitationsResponse.json();
        
        if (invitationsData.success && invitationsData.data) {
            console.log(`✅ Found ${invitationsData.data.length} total invitations for ${test3Host.name} family`);
            
            // Filter for invitations FROM this activity
            const test3Invitations = invitationsData.data.filter(inv => 
                inv.activity_name.toLowerCase().includes('test 3')
            );
            
            console.log(`📤 ${test3Invitations.length} invitations sent for "test 3" activity:`);
            test3Invitations.forEach((inv, i) => {
                console.log(`   ${i+1}. To: ${inv.invited_child_name} (${inv.host_parent_username})`);
                console.log(`       Status: ${inv.status}, Date: ${inv.start_date}`);
                if (inv.invited_child_name === 'Emilia') {
                    console.log(`      🎯 FOUND INVITATION TO EMILIA! Status: ${inv.status}`);
                }
            });
            
            const emiliaInvitation = test3Invitations.find(inv => inv.invited_child_name === 'Emilia');
            if (!emiliaInvitation) {
                console.log('❌ NO INVITATION SENT TO EMILIA for "test 3" activity');
                console.log('\n🔧 POSSIBLE SOLUTIONS:');
                console.log('   1. Host needs to manually send invitation to Emilia');
                console.log('   2. Check if connection exists between host and Roberts family');
                console.log('   3. Check if auto-notify is enabled and working');
            } else {
                console.log(`✅ Invitation to Emilia exists with status: ${emiliaInvitation.status}`);
                if (emiliaInvitation.status === 'pending') {
                    console.log('   📝 Action needed: Emilia needs to accept the invitation');
                } else if (emiliaInvitation.status === 'accepted') {
                    console.log('   📝 Should show as connected activity for Emilia');
                }
            }
        }
        
        console.log(`\n🔗 Step 3: Checking connections between ${test3Host.name} and Roberts families...`);
        
        // Check connections for the host
        const connectionsResponse = await fetch(`${API_BASE}/api/connections`, {
            headers: { 'Authorization': `Bearer ${test3Host.token}` }
        });
        
        if (connectionsResponse.ok) {
            const connectionsData = await connectionsResponse.json();
            if (connectionsData.success && connectionsData.data) {
                console.log(`✅ ${test3Host.name} family has ${connectionsData.data.length} connections`);
                
                const robertsConnection = connectionsData.data.find(conn => 
                    (conn.child1_parent_name && conn.child1_parent_name.toLowerCase().includes('roberts')) ||
                    (conn.child2_parent_name && conn.child2_parent_name.toLowerCase().includes('roberts')) ||
                    conn.child1_name === 'Emilia' || conn.child2_name === 'Emilia'
                );
                
                if (robertsConnection) {
                    console.log('✅ Connection exists with Roberts family:');
                    console.log(`   - ${robertsConnection.child1_name} <-> ${robertsConnection.child2_name}`);
                    console.log(`   - Status: ${robertsConnection.status}`);
                } else {
                    console.log('❌ NO CONNECTION found between host and Roberts family');
                    console.log('   📝 This explains why no invitation was sent to Emilia');
                    console.log('   📝 Solution: Create connection between families first');
                }
            }
        }
        
        console.log('\n' + '=' .repeat(60));
        console.log('🎯 SUMMARY FOR EMILIA & TEST 3:');
        
        if (test3Activity) {
            console.log(`✅ "test 3" activity exists: "${test3Activity.name}" in ${test3Host.name} family`);
        }
        
        const hasEmiliaInvitation = invitationsData.data?.some(inv => 
            inv.activity_name.toLowerCase().includes('test 3') && 
            inv.invited_child_name === 'Emilia'
        );
        
        if (!hasEmiliaInvitation) {
            console.log('❌ NO INVITATION sent to Emilia for "test 3" activity');
            console.log('🔧 SOLUTION: Create connection between families OR manually invite Emilia');
        } else {
            console.log('✅ Invitation to Emilia exists');
        }
        
    } catch (error) {
        console.error('❌ Test error:', error.message);
    }
}

debugTest3Activity();