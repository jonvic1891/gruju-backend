#!/usr/bin/env node

const fetch = require('node-fetch');

const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com';

async function debugActivityCount() {
    try {
        console.log('🔍 DEBUGGING EMILIA\'S ACTIVITY COUNT');
        console.log('=' .repeat(60));
        
        // Login as Emilia's parent
        console.log('\n👤 Step 1: Login as Emilia\'s parent...');
        const loginResponse = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'roberts@example.com', password: 'test123' })
        });
        
        const loginData = await loginResponse.json();
        if (!loginData.success) {
            console.log('❌ Login failed');
            return;
        }
        console.log('✅ Login successful');
        const token = loginData.token;
        
        // Get children
        const childrenResponse = await fetch(`${API_BASE}/api/children`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const childrenData = await childrenResponse.json();
        const emilia = childrenData.data.find(child => child.name === 'Emilia');
        
        console.log(`\n👶 Found Emilia: ${emilia.name} (ID: ${emilia.id})`);
        
        // Step 2: Check Emilia's own activities (what getActivities returns)
        console.log('\n📋 Step 2: Checking Emilia\'s own activities...');
        
        const ownActivitiesResponse = await fetch(`${API_BASE}/api/activities/${emilia.id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (ownActivitiesResponse.ok) {
            const ownActivitiesData = await ownActivitiesResponse.json();
            console.log(`✅ Own activities API call successful`);
            console.log(`📊 Count: ${ownActivitiesData.data?.length || 0}`);
            
            if (ownActivitiesData.data?.length > 0) {
                console.log('📋 Own activities:');
                ownActivitiesData.data.forEach((activity, i) => {
                    console.log(`   ${i+1}. "${activity.name}" on ${activity.start_date}`);
                });
            } else {
                console.log('   (No own activities found)');
            }
        } else {
            console.log('❌ Own activities API call failed');
            const errorText = await ownActivitiesResponse.text();
            console.log('Error:', errorText);
        }
        
        // Step 3: Check accepted invitations (what getInvitedActivities returns)
        console.log('\n🔗 Step 3: Checking accepted invitations...');
        
        const today = new Date();
        const oneYearLater = new Date();
        oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
        const startDate = today.toISOString().split('T')[0];
        const endDate = oneYearLater.toISOString().split('T')[0];
        
        const invitedResponse = await fetch(`${API_BASE}/api/calendar/invited-activities?start=${startDate}&end=${endDate}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (invitedResponse.ok) {
            const invitedData = await invitedResponse.json();
            console.log(`✅ Invited activities API call successful`);
            console.log(`📊 Raw count: ${invitedData.data?.length || 0}`);
            
            if (invitedData.data?.length > 0) {
                console.log('📋 All invited activities:');
                invitedData.data.forEach((activity, i) => {
                    console.log(`   ${i+1}. "${activity.activity_name}" on ${activity.start_date}`);
                    console.log(`       Host: ${activity.host_parent_username}`);
                    console.log(`       Invited child: ${activity.invited_child_name}`);
                    console.log(`       Status: ${activity.status}`);
                });
                
                // Filter for Emilia specifically (same logic as frontend)
                const currentUser = loginData.user;
                const currentUsername = currentUser.username;
                
                const emiliaInvitations = invitedData.data.filter(invitation => 
                    invitation.invited_child_name === emilia.name &&
                    invitation.host_parent_username !== currentUsername
                );
                
                console.log(`\n🎯 Filtered for Emilia (excluding own hosted activities):`);
                console.log(`📊 Count after filtering: ${emiliaInvitations.length}`);
                
                emiliaInvitations.forEach((activity, i) => {
                    console.log(`   ${i+1}. "${activity.activity_name}" from ${activity.host_parent_username}`);
                });
                
            } else {
                console.log('   (No invited activities found)');
            }
        } else {
            console.log('❌ Invited activities API call failed');
            const errorText = await invitedResponse.text();
            console.log('Error:', errorText);
        }
        
        // Step 4: Check what the unified invitations endpoint returns
        console.log('\n📧 Step 4: Checking unified invitations endpoint...');
        
        const unifiedResponse = await fetch(`${API_BASE}/api/calendar/invitations?start=${startDate}&end=${endDate}&_t=${Date.now()}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (unifiedResponse.ok) {
            const unifiedData = await unifiedResponse.json();
            console.log(`✅ Unified invitations API call successful`);
            console.log(`📊 Total invitations: ${unifiedData.data?.length || 0}`);
            
            if (unifiedData.data?.length > 0) {
                const emiliaInvitations = unifiedData.data.filter(inv => inv.invited_child_name === 'Emilia');
                const acceptedInvitations = emiliaInvitations.filter(inv => inv.status === 'accepted');
                
                console.log(`📧 Invitations for Emilia: ${emiliaInvitations.length}`);
                console.log(`✅ Accepted invitations: ${acceptedInvitations.length}`);
                
                acceptedInvitations.forEach((inv, i) => {
                    console.log(`   ${i+1}. "${inv.activity_name}" from ${inv.host_parent_username} - ${inv.status}`);
                });
            }
        }
        
        console.log('\n' + '=' .repeat(60));
        console.log('🔍 DIAGNOSIS:');
        
        // Determine what the expected count should be
        console.log('\nExpected activity count should be:');
        console.log('   Own activities: [count from step 2]');
        console.log('   + Accepted invitations: [count from step 3 after filtering]');
        console.log('   = Total activity count');
        
        console.log('\n🔧 POSSIBLE ISSUES:');
        console.log('   1. ❓ No accepted invitations found (invitation not accepted?)');
        console.log('   2. ❓ Filtering logic excluding valid invitations');
        console.log('   3. ❓ Wrong API endpoint being used');
        console.log('   4. ❓ Data not syncing properly after invitation acceptance');
        
    } catch (error) {
        console.error('❌ Debug error:', error.message);
    }
}

debugActivityCount();