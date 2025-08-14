#!/usr/bin/env node

const fetch = require('node-fetch');
const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com';

async function debugStateSyncIssue() {
    try {
        console.log('🔍 DEBUGGING STATE SYNCHRONIZATION ISSUE');
        console.log('Checking why sender sees "no invited children" when invitation exists');
        console.log('=' .repeat(70));
        
        // Login as roberts1 (sender)
        const senderLoginResponse = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'roberts1@example.com', password: 'test123' })
        });
        const senderLogin = await senderLoginResponse.json();
        console.log('✅ Logged in as roberts1 (sender)');
        
        // Get the activity
        const senderChildrenResponse = await fetch(`${API_BASE}/api/children`, {
            headers: { 'Authorization': `Bearer ${senderLogin.token}` }
        });
        const senderChildren = await senderChildrenResponse.json();
        const senderChild = senderChildren.data[0];
        
        const activitiesResponse = await fetch(`${API_BASE}/api/activities/${senderChild.id}`, {
            headers: { 'Authorization': `Bearer ${senderLogin.token}` }
        });
        const activities = await activitiesResponse.json();
        
        const blahNew1 = activities.data.find(a => a.name === 'blah new 1');
        console.log(`Found activity: "${blahNew1.name}" (ID: ${blahNew1.id})`);
        
        console.log('\n🔍 CHECKING SENDER\'S VIEW OF ACTIVITY:');
        
        // Check what the activity shows for invited children
        console.log('Activity data:', {
            id: blahNew1.id,
            name: blahNew1.name,
            invited_children: blahNew1.invited_children || 'undefined',
            invited_children_count: blahNew1.invited_children?.length || 0
        });
        
        // Check invitations FROM sender's perspective
        console.log('\n📤 CHECKING INVITATIONS SENT BY SENDER:');
        
        const today = new Date();
        const oneYearLater = new Date();
        oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
        const startDate = today.toISOString().split('T')[0];
        const endDate = oneYearLater.toISOString().split('T')[0];
        
        // Get all invitations from sender's perspective
        const senderInvitationsResponse = await fetch(`${API_BASE}/api/calendar/invitations?start=${startDate}&end=${endDate}&_t=${Date.now()}`, {
            headers: { 'Authorization': `Bearer ${senderLogin.token}` }
        });
        const senderInvitations = await senderInvitationsResponse.json();
        
        // Filter for invitations FROM this sender for "blah new 1"
        const blahNew1Invitations = senderInvitations.data?.filter(inv => 
            inv.host_parent_username === senderLogin.user.username &&
            inv.activity_name === 'blah new 1'
        ) || [];
        
        console.log(`Invitations sent for "blah new 1": ${blahNew1Invitations.length}`);
        blahNew1Invitations.forEach((inv, i) => {
            console.log(`  ${i + 1}. To: ${inv.invited_child_name} - Status: ${inv.status}`);
            console.log(`      Invitation ID: ${inv.invitation_id}`);
            console.log(`      Activity ID: ${inv.activity_id}`);
        });
        
        // Check the specific endpoint that might be used to get activity details with invitations
        console.log('\n📋 CHECKING ACTIVITY INVITATION DETAILS:');
        
        // Try to get detailed activity info that includes invitations
        const activityDetailsResponse = await fetch(`${API_BASE}/api/activities/${blahNew1.id}/details`, {
            headers: { 'Authorization': `Bearer ${senderLogin.token}` }
        });
        
        if (activityDetailsResponse.ok) {
            const activityDetails = await activityDetailsResponse.json();
            console.log('Activity details with invitations:', JSON.stringify(activityDetails, null, 2));
        } else {
            console.log('❌ Activity details endpoint not available or failed');
        }
        
        // Check activity invitations endpoint directly
        const activityInvitationsResponse = await fetch(`${API_BASE}/api/activities/${blahNew1.id}/invitations`, {
            headers: { 'Authorization': `Bearer ${senderLogin.token}` }
        });
        
        if (activityInvitationsResponse.ok) {
            const activityInvitations = await activityInvitationsResponse.json();
            console.log('Activity invitations endpoint result:', JSON.stringify(activityInvitations, null, 2));
        } else {
            console.log('❌ Activity invitations endpoint not available or failed');
        }
        
        console.log('\n🔍 CHECKING RECIPIENT\'S VIEW:');
        
        // Login as recipient to compare
        const recipientLoginResponse = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'roberts@example.com', password: 'test123' })
        });
        const recipientLogin = await recipientLoginResponse.json();
        
        const recipientInvitationsResponse = await fetch(`${API_BASE}/api/calendar/invitations?start=${startDate}&end=${endDate}&_t=${Date.now()}`, {
            headers: { 'Authorization': `Bearer ${recipientLogin.token}` }
        });
        const recipientInvitations = await recipientInvitationsResponse.json();
        
        const recipientBlahNew1Invitations = recipientInvitations.data?.filter(inv => 
            inv.activity_name === 'blah new 1' &&
            inv.invited_child_name === 'Emilia'
        ) || [];
        
        console.log(`Recipient sees invitations for "blah new 1": ${recipientBlahNew1Invitations.length}`);
        recipientBlahNew1Invitations.forEach((inv, i) => {
            console.log(`  ${i + 1}. "${inv.activity_name}" - Status: ${inv.status} - From: ${inv.host_parent_username}`);
        });
        
        console.log('\n' + '=' .repeat(70));
        console.log('🎯 STATE SYNCHRONIZATION ANALYSIS:');
        
        console.log(`\n📤 SENDER'S PERSPECTIVE:`);
        console.log(`   Activity "${blahNew1.name}" shows ${blahNew1.invited_children?.length || 0} invited children`);
        console.log(`   But system shows ${blahNew1Invitations.length} invitations sent`);
        
        console.log(`\n📥 RECIPIENT'S PERSPECTIVE:`);
        console.log(`   Sees ${recipientBlahNew1Invitations.length} invitations for "blah new 1"`);
        
        if (blahNew1Invitations.length > 0 && (!blahNew1.invited_children || blahNew1.invited_children.length === 0)) {
            console.log('\n❌ BUG CONFIRMED:');
            console.log('   - Invitations exist in the system ✅');
            console.log('   - Recipient can see invitations ✅');  
            console.log('   - BUT activity.invited_children is empty/undefined ❌');
            console.log('\n🔧 ISSUE: The activity object is not being updated to reflect sent invitations');
            console.log('   This is likely a backend issue where:');
            console.log('   1. processAutoNotifications creates invitations ✅');
            console.log('   2. BUT doesn\'t update the activity.invited_children field ❌');
            console.log('   3. Frontend shows empty state because it relies on activity.invited_children ❌');
        } else {
            console.log('\n✅ No synchronization issue detected');
        }
        
    } catch (error) {
        console.error('❌ Debug failed:', error.message);
    }
}

debugStateSyncIssue();