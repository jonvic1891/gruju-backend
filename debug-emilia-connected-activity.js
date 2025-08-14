#!/usr/bin/env node

const fetch = require('node-fetch');

const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com';

async function debugEmiliaConnectedActivity() {
    try {
        console.log('🧪 DEBUGGING EMILIA\'S CONNECTED ACTIVITY WITH TEST 3');
        console.log('=' .repeat(60));
        
        // First, let's find which parent has child Emilia
        console.log('\n🔍 Step 1: Finding Emilia\'s parent account...');
        
        // Try common demo accounts
        const accounts = [
            { email: 'johnson@example.com', password: 'demo123', name: 'Johnson' },
            { email: 'smith@example.com', password: 'demo123', name: 'Smith' },
            { email: 'davis@example.com', password: 'demo123', name: 'Davis' },
            { email: 'wong@example.com', password: 'demo123', name: 'Wong' },
            { email: 'brown@example.com', password: 'demo123', name: 'Brown' },
            { email: 'wilson@example.com', password: 'demo123', name: 'Wilson' }
        ];
        
        let emiliaParent = null;
        let emiliaChild = null;
        
        for (const account of accounts) {
            try {
                const loginResponse = await fetch(`${API_BASE}/api/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: account.email, password: account.password })
                });
                
                const loginData = await loginResponse.json();
                if (loginData.success) {
                    // Get children for this account
                    const childrenResponse = await fetch(`${API_BASE}/api/children`, {
                        headers: { 'Authorization': `Bearer ${loginData.token}` }
                    });
                    const childrenData = await childrenResponse.json();
                    
                    if (childrenData.success && childrenData.data) {
                        const emilia = childrenData.data.find(child => 
                            child.name.toLowerCase().includes('emilia')
                        );
                        
                        if (emilia) {
                            console.log(`✅ Found Emilia in ${account.name} family: ${emilia.name} (ID: ${emilia.id})`);
                            emiliaParent = { ...account, token: loginData.token, userId: loginData.user.id };
                            emiliaChild = emilia;
                            break;
                        }
                    }
                }
            } catch (error) {
                // Continue searching
            }
        }
        
        if (!emiliaParent || !emiliaChild) {
            console.log('❌ Could not find child Emilia in any demo account');
            return;
        }
        
        console.log(`\n📋 Step 2: Checking ${emiliaChild.name}'s activities and invitations...`);
        
        // Get date range
        const today = new Date();
        const oneYearLater = new Date();
        oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
        
        const startDate = today.toISOString().split('T')[0];
        const endDate = oneYearLater.toISOString().split('T')[0];
        
        // Check regular activities
        console.log('\n🏃 Regular Activities:');
        const activitiesResponse = await fetch(`${API_BASE}/api/activities/${emiliaChild.id}`, {
            headers: { 'Authorization': `Bearer ${emiliaParent.token}` }
        });
        const activitiesData = await activitiesResponse.json();
        
        if (activitiesData.success && activitiesData.data) {
            console.log(`✅ Found ${activitiesData.data.length} regular activities`);
            activitiesData.data.forEach((activity, i) => {
                console.log(`   ${i+1}. "${activity.name}" on ${activity.start_date}`);
            });
        } else {
            console.log('❌ No regular activities found');
        }
        
        // Check invitations (all statuses)
        console.log('\n📩 All Invitations:');
        const invitationsResponse = await fetch(`${API_BASE}/api/calendar/invitations?start=${startDate}&end=${endDate}&_t=${Date.now()}`, {
            headers: { 'Authorization': `Bearer ${emiliaParent.token}` }
        });
        const invitationsData = await invitationsResponse.json();
        
        if (invitationsData.success && invitationsData.data) {
            console.log(`✅ Found ${invitationsData.data.length} total invitations`);
            
            // Filter for Emilia's invitations
            const emiliaInvitations = invitationsData.data.filter(inv => 
                inv.invited_child_name === emiliaChild.name
            );
            
            console.log(`📧 ${emiliaInvitations.length} invitations for ${emiliaChild.name}:`);
            emiliaInvitations.forEach((inv, i) => {
                console.log(`   ${i+1}. "${inv.activity_name}" from ${inv.host_parent_username} - Status: ${inv.status}`);
                if (inv.activity_name.toLowerCase().includes('test 3')) {
                    console.log(`      🎯 FOUND TEST 3 INVITATION! Status: ${inv.status}`);
                }
            });
            
            const acceptedInvitations = emiliaInvitations.filter(inv => inv.status === 'accepted');
            console.log(`✅ ${acceptedInvitations.length} accepted invitations (should show as connected activities)`);
        } else {
            console.log('❌ No invitations found');
        }
        
        // Check connected activities (accepted invitations from others)
        console.log('\n🔗 Connected Activities (from accepted invitations):');
        const connectedResponse = await fetch(`${API_BASE}/api/calendar/invited-activities?start=${startDate}&end=${endDate}`, {
            headers: { 'Authorization': `Bearer ${emiliaParent.token}` }
        });
        
        if (connectedResponse.ok) {
            const connectedData = await connectedResponse.json();
            if (connectedData.success && connectedData.data) {
                console.log(`✅ Found ${connectedData.data.length} connected activities`);
                
                // Filter for Emilia's connected activities
                const emiliaConnected = connectedData.data.filter(activity => 
                    activity.invited_child_name === emiliaChild.name
                );
                
                console.log(`🔗 ${emiliaConnected.length} connected activities for ${emiliaChild.name}:`);
                emiliaConnected.forEach((activity, i) => {
                    console.log(`   ${i+1}. "${activity.activity_name}" from ${activity.host_parent_username} on ${activity.start_date}`);
                    if (activity.activity_name.toLowerCase().includes('test 3')) {
                        console.log(`      🎯 FOUND TEST 3 CONNECTED ACTIVITY!`);
                    }
                });
            } else {
                console.log('❌ Connected activities request failed');
            }
        } else {
            console.log('❌ Connected activities endpoint failed');
        }
        
        console.log('\n' + '=' .repeat(60));
        console.log('🔍 DIAGNOSIS FOR EMILIA & TEST 3:');
        
        const hasTest3Invitation = invitationsData.data?.some(inv => 
            inv.invited_child_name === emiliaChild.name && 
            inv.activity_name.toLowerCase().includes('test 3')
        );
        
        const hasTest3Accepted = invitationsData.data?.some(inv => 
            inv.invited_child_name === emiliaChild.name && 
            inv.activity_name.toLowerCase().includes('test 3') &&
            inv.status === 'accepted'
        );
        
        if (!hasTest3Invitation) {
            console.log('❌ ISSUE: No "test 3" invitation found for Emilia');
            console.log('   📝 Expected: Invitation from test 3 activity');
            console.log('   📝 Check: Was the invitation actually created?');
        } else if (!hasTest3Accepted) {
            console.log('⏳ ISSUE: "test 3" invitation found but not accepted');
            console.log('   📝 Current status: Check invitation status above');
            console.log('   📝 Action needed: Accept the invitation');
        } else {
            console.log('✅ "test 3" invitation is accepted - should show as connected activity');
        }
        
        console.log('\n📱 FRONTEND TESTING:');
        console.log(`   🌐 Login as: ${emiliaParent.email} / ${emiliaParent.password}`);
        console.log(`   👶 Check: ${emiliaChild.name}'s calendar/activities`);
        console.log('   🔍 Look for: "test 3" activity as connected/invited activity');
        
    } catch (error) {
        console.error('❌ Test error:', error.message);
    }
}

debugEmiliaConnectedActivity();