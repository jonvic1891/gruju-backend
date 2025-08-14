#!/usr/bin/env node

const fetch = require('node-fetch');

const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com';

async function debugEmiliaRobertsConnected() {
    try {
        console.log('🧪 DEBUGGING EMILIA ROBERTS CONNECTED ACTIVITY WITH TEST 3');
        console.log('=' .repeat(60));
        
        // Login as Roberts family
        console.log('\n👤 Logging in as Roberts family (Emilia\'s parent)...');
        const loginResponse = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'roberts@example.com', password: 'test123' })
        });
        
        const loginData = await loginResponse.json();
        if (!loginData.success) {
            console.error('❌ Login failed:', loginData);
            return;
        }
        console.log('✅ Login successful, User ID:', loginData.user?.id);
        const token = loginData.token;
        
        // Get children
        console.log('\n👶 Getting Roberts family children...');
        const childrenResponse = await fetch(`${API_BASE}/api/children`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const childrenData = await childrenResponse.json();
        
        if (childrenData.success && childrenData.data) {
            console.log(`✅ Found ${childrenData.data.length} children:`);
            childrenData.data.forEach(child => {
                console.log(`   - ${child.name} (ID: ${child.id})`);
            });
            
            const emilia = childrenData.data.find(child => 
                child.name.toLowerCase().includes('emilia')
            );
            
            if (!emilia) {
                console.log('❌ Emilia not found in Roberts family children');
                return;
            }
            
            console.log(`\n📋 Found Emilia: ${emilia.name} (ID: ${emilia.id})`);
            
        } else {
            console.log('❌ Failed to get children');
            return;
        }
        
        const emilia = childrenData.data.find(child => 
            child.name.toLowerCase().includes('emilia')
        );
        
        // Get date range
        const today = new Date();
        const oneYearLater = new Date();
        oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
        
        const startDate = today.toISOString().split('T')[0];
        const endDate = oneYearLater.toISOString().split('T')[0];
        
        // Step 1: Check Emilia's regular activities
        console.log('\n🏃 Step 1: Checking Emilia\'s regular activities...');
        const activitiesResponse = await fetch(`${API_BASE}/api/activities/${emilia.id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const activitiesData = await activitiesResponse.json();
        
        if (activitiesData.success && activitiesData.data) {
            console.log(`✅ Found ${activitiesData.data.length} regular activities for Emilia`);
            activitiesData.data.forEach((activity, i) => {
                console.log(`   ${i+1}. "${activity.name}" on ${activity.start_date}`);
                if (activity.name.toLowerCase().includes('test 3')) {
                    console.log(`      🎯 FOUND TEST 3 AS REGULAR ACTIVITY!`);
                }
            });
        } else {
            console.log('❌ No regular activities found for Emilia');
        }
        
        // Step 2: Check all invitations for Emilia (pending, accepted, declined)
        console.log('\n📩 Step 2: Checking all invitations for Emilia...');
        const invitationsResponse = await fetch(`${API_BASE}/api/calendar/invitations?start=${startDate}&end=${endDate}&_t=${Date.now()}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const invitationsData = await invitationsResponse.json();
        
        if (invitationsData.success && invitationsData.data) {
            console.log(`✅ Found ${invitationsData.data.length} total invitations`);
            
            // Filter for Emilia's invitations
            const emiliaInvitations = invitationsData.data.filter(inv => 
                inv.invited_child_name === emilia.name
            );
            
            console.log(`📧 ${emiliaInvitations.length} invitations for Emilia:`);
            emiliaInvitations.forEach((inv, i) => {
                console.log(`   ${i+1}. "${inv.activity_name}" from ${inv.host_parent_username}`);
                console.log(`       Status: ${inv.status}, Date: ${inv.start_date}`);
                if (inv.activity_name.toLowerCase().includes('test 3')) {
                    console.log(`      🎯 FOUND TEST 3 INVITATION! Status: ${inv.status}`);
                    if (inv.status === 'accepted') {
                        console.log(`      ✅ Test 3 is ACCEPTED - should show as connected activity!`);
                    }
                }
            });
            
            const acceptedInvitations = emiliaInvitations.filter(inv => inv.status === 'accepted');
            const pendingInvitations = emiliaInvitations.filter(inv => inv.status === 'pending');
            console.log(`✅ ${acceptedInvitations.length} accepted invitations`);
            console.log(`⏳ ${pendingInvitations.length} pending invitations`);
        } else {
            console.log('❌ No invitations found');
        }
        
        // Step 3: Check connected activities (accepted invitations showing in calendar)
        console.log('\n🔗 Step 3: Checking connected activities (accepted invitations)...');
        const connectedResponse = await fetch(`${API_BASE}/api/calendar/invited-activities?start=${startDate}&end=${endDate}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (connectedResponse.ok) {
            const connectedData = await connectedResponse.json();
            if (connectedData.success && connectedData.data) {
                console.log(`✅ Found ${connectedData.data.length} connected activities`);
                
                // Filter for Emilia's connected activities
                const emiliaConnected = connectedData.data.filter(activity => 
                    activity.invited_child_name === emilia.name
                );
                
                console.log(`🔗 ${emiliaConnected.length} connected activities for Emilia:`);
                emiliaConnected.forEach((activity, i) => {
                    console.log(`   ${i+1}. "${activity.activity_name}" from ${activity.host_parent_username}`);
                    console.log(`       Date: ${activity.start_date}, Status: ${activity.status}`);
                    if (activity.activity_name.toLowerCase().includes('test 3')) {
                        console.log(`      🎯 FOUND TEST 3 AS CONNECTED ACTIVITY!`);
                    }
                });
            } else {
                console.log('❌ Connected activities request failed:', connectedData.error);
            }
        } else {
            console.log('❌ Connected activities endpoint failed');
        }
        
        console.log('\n' + '=' .repeat(60));
        console.log('🔍 DIAGNOSIS FOR EMILIA & TEST 3:');
        
        // Check if test 3 exists in any form
        const hasTest3Invitation = invitationsData.data?.some(inv => 
            inv.invited_child_name === emilia.name && 
            inv.activity_name.toLowerCase().includes('test 3')
        );
        
        const hasTest3Accepted = invitationsData.data?.some(inv => 
            inv.invited_child_name === emilia.name && 
            inv.activity_name.toLowerCase().includes('test 3') &&
            inv.status === 'accepted'
        );
        
        const hasTest3Regular = activitiesData.data?.some(activity =>
            activity.name.toLowerCase().includes('test 3')
        );
        
        if (hasTest3Regular) {
            console.log('✅ "test 3" found as regular activity for Emilia');
        } else if (hasTest3Accepted) {
            console.log('✅ "test 3" invitation is accepted - should show in calendar');
            console.log('   📝 Check: ChildActivityScreen calendar view');
            console.log('   📝 Check: Invited activities section');
        } else if (hasTest3Invitation) {
            console.log('⏳ "test 3" invitation found but not yet accepted');
            console.log('   📝 Action needed: Accept the invitation');
        } else {
            console.log('❌ No "test 3" activity or invitation found for Emilia');
            console.log('   📝 Possible issues:');
            console.log('   - Invitation was not created');
            console.log('   - Wrong activity name');
            console.log('   - Wrong child name in invitation');
        }
        
        console.log('\n📱 FRONTEND TESTING INSTRUCTIONS:');
        console.log('   🌐 Visit: https://gruju-parent-activity-app.web.app');
        console.log('   👤 Login as: roberts@example.com / test123');
        console.log(`   👶 Go to: ${emilia.name}'s activity screen`);
        console.log('   🔍 Check calendar for: "test 3" activity');
        console.log('   📩 Check invitations section for: accepted invitations');
        
    } catch (error) {
        console.error('❌ Test error:', error.message);
    }
}

debugEmiliaRobertsConnected();