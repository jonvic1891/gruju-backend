#!/usr/bin/env node

const fetch = require('node-fetch');

const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com';

async function fixEmiliaInvitation() {
    try {
        console.log('🔧 FIXING EMILIA\'S MISSING INVITATION');
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
        
        // Get test 3's activity
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
        
        console.log(`Target activity: "${targetActivity.name}" (ID: ${targetActivity.id})`);
        
        // Step 2: Get Emilia's parent ID
        console.log('\n👶 Step 2: Getting Emilia\'s parent info...');
        
        const emiliaLoginResponse = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'roberts@example.com', password: 'test123' })
        });
        const emiliaLoginData = await emiliaLoginResponse.json();
        
        if (!emiliaLoginData.success) {
            console.log('❌ Could not login to Emilia\'s parent account');
            return;
        }
        
        const emiliaChildrenResponse = await fetch(`${API_BASE}/api/children`, {
            headers: { 'Authorization': `Bearer ${emiliaLoginData.token}` }
        });
        const emiliaChildrenData = await emiliaChildrenResponse.json();
        const emiliaChild = emiliaChildrenData.data.find(child => child.name === 'Emilia');
        
        console.log(`Emilia: ${emiliaChild.name} (ID: ${emiliaChild.id})`);
        console.log(`Emilia's parent ID: ${emiliaLoginData.user.id}`);
        
        // Step 3: Send manual invitation using correct API format
        console.log('\n📧 Step 3: Sending manual invitation...');
        
        const inviteData = {
            invited_parent_id: emiliaLoginData.user.id,  // Required field
            child_id: emiliaChild.id,                    // Target child
            message: `${test3Child.name} would like to invite your child to join: ${targetActivity.name}`
        };
        
        console.log('📤 Invitation data:', inviteData);
        
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
            console.log('Result:', inviteResult);
        } else {
            console.log(`❌ Manual invitation failed: ${inviteResponse.status}`);
            const errorData = await inviteResponse.text();
            console.log('Error:', errorData);
            return;
        }
        
        // Step 4: Verify the invitation was created
        console.log('\n✅ Step 4: Verifying invitation was created...');
        
        const today = new Date();
        const oneYearLater = new Date();
        oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
        const startDate = today.toISOString().split('T')[0];
        const endDate = oneYearLater.toISOString().split('T')[0];
        
        // Check from Emilia's perspective
        const emiliaInvitationsResponse = await fetch(`${API_BASE}/api/calendar/invitations?start=${startDate}&end=${endDate}&_t=${Date.now()}`, {
            headers: { 'Authorization': `Bearer ${emiliaLoginData.token}` }
        });
        const emiliaInvitationsData = await emiliaInvitationsResponse.json();
        
        console.log(`📊 Emilia now has ${emiliaInvitationsData.data?.length || 0} invitations`);
        
        const fromTest3 = emiliaInvitationsData.data?.filter(inv => 
            inv.host_parent_username === loginData.user.username
        ) || [];
        
        if (fromTest3.length > 0) {
            console.log('🎉 SUCCESS! Invitation visible to Emilia:');
            fromTest3.forEach(inv => {
                console.log(`   - "${inv.activity_name}" - Status: ${inv.status}`);
                console.log(`     Date: ${inv.start_date}, Time: ${inv.start_time || 'No time'}`);
                console.log(`     Message: "${inv.invitation_message}"`);
            });
            
            console.log('\n📱 TESTING INSTRUCTIONS FOR USER:');
            console.log('1. 🌐 Visit: https://gruju-parent-activity-app.web.app');
            console.log('2. 👤 Login as: roberts@example.com / test123');
            console.log('3. 📋 Go to "Children" screen');
            console.log('4. 👶 Check Emilia\'s card');
            console.log('5. 📩 Should now see 1 pending invitation!');
            console.log('6. ✅ Accept the invitation');
            console.log('7. 📅 Check Emilia\'s calendar for connected activity');
            
        } else {
            console.log('❌ Invitation still not visible to Emilia');
        }
        
        console.log('\n' + '=' .repeat(60));
        console.log('🎯 FIX SUMMARY:');
        console.log('');
        console.log('✅ IMMEDIATE PROBLEM SOLVED:');
        console.log('   - Manually sent invitation from test 3 to Emilia');
        console.log(`   - For activity: "${targetActivity.name}"`);
        console.log('   - Emilia should now see pending invitation');
        console.log('');
        console.log('❌ UNDERLYING SYSTEM ISSUE REMAINS:');
        console.log('   - Pending invitations flow still broken');
        console.log('   - Users have to manually invite instead of using "pending connections"');
        console.log('   - Need to fix the UI -> backend integration for pending system');
        console.log('');
        console.log('🔧 SYSTEM FIXES STILL NEEDED:');
        console.log('   1. Fix activity update API to handle selectedConnectedChildren');
        console.log('   2. Ensure pending_activity_invitations table is populated');
        console.log('   3. Fix processAutoNotifications to process pending entries');
        
    } catch (error) {
        console.error('❌ Fix error:', error.message);
    }
}

fixEmiliaInvitation();