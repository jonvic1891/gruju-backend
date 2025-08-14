#!/usr/bin/env node

const fetch = require('node-fetch');
const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com';

async function investigateAutomatedFlow() {
    try {
        console.log('🔍 INVESTIGATING AUTOMATED FLOW FAILURE');
        console.log('You said you DID select Emilia as pending - let\'s see what went wrong');
        console.log('=' .repeat(70));
        
        // Login as roberts1
        const hostLoginResponse = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'roberts1@example.com', password: 'test123' })
        });
        
        const hostLogin = await hostLoginResponse.json();
        if (!hostLogin.success) {
            console.log('❌ Host login failed:', hostLogin.error);
            return;
        }
        console.log('✅ Logged in as roberts1');
        
        // Get the 'blah new 1' activity
        const hostChildrenResponse = await fetch(`${API_BASE}/api/children`, {
            headers: { 'Authorization': `Bearer ${hostLogin.token}` }
        });
        const hostChildren = await hostChildrenResponse.json();
        const hostChild = hostChildren.data[0];
        
        const activitiesResponse = await fetch(`${API_BASE}/api/activities/${hostChild.id}`, {
            headers: { 'Authorization': `Bearer ${hostLogin.token}` }
        });
        const activities = await activitiesResponse.json();
        
        const blahNew1 = activities.data.find(a => a.name === 'blah new 1');
        if (!blahNew1) {
            console.log('❌ "blah new 1" activity not found');
            return;
        }
        
        console.log(`✅ Found activity: "${blahNew1.name}" (ID: ${blahNew1.id})`);
        
        // Check the actual database entries directly
        console.log('\n📋 CHECKING BACKEND DATABASE STATE:');
        
        // Login as Emilia's parent to get their ID
        const guestLoginResponse = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'roberts@example.com', password: 'test123' })
        });
        const guestLogin = await guestLoginResponse.json();
        const emiliaParentId = guestLogin.user.id;
        
        console.log(`Emilia's parent ID: ${emiliaParentId}`);
        console.log(`Expected pending connection ID: pending-${emiliaParentId}`);
        
        // Check if the connection exists and its timing
        const connectionsResponse = await fetch(`${API_BASE}/api/connections`, {
            headers: { 'Authorization': `Bearer ${hostLogin.token}` }
        });
        const connections = await connectionsResponse.json();
        
        const emiliaConnection = connections.data?.find(conn => 
            conn.child1_name === 'Emilia' || conn.child2_name === 'Emilia'
        );
        
        if (emiliaConnection) {
            console.log(`✅ Connection exists: ${emiliaConnection.child1_name} <-> ${emiliaConnection.child2_name}`);
            console.log(`   Status: ${emiliaConnection.status}`);
            console.log(`   Connection ID: ${emiliaConnection.id}`);
            console.log(`   Created: ${emiliaConnection.created_at || 'N/A'}`);
        } else {
            console.log('❌ No connection found with Emilia');
        }
        
        // Check backend for actual pending invitations entries
        console.log('\n🔍 ANALYZING POTENTIAL ISSUES:');
        
        // Issue 1: Timing - was the pending invitation created BEFORE the connection was accepted?
        console.log('1. TIMING ISSUE CHECK:');
        console.log(`   Activity created: ${blahNew1.created_at || 'Unknown'}`);
        if (emiliaConnection) {
            console.log(`   Connection created: ${emiliaConnection.created_at || 'Unknown'}`);
            console.log('   ⚠️  If connection was created BEFORE activity had pending invitations,');
            console.log('      processAutoNotifications would have had nothing to process');
        }
        
        // Issue 2: Check if pending invitations were actually stored
        console.log('\n2. PENDING INVITATIONS STORAGE CHECK:');
        console.log('   Checking if the UI actually saved pending invitations...');
        
        // Try to get pending invitations for this activity
        const pendingCheckResponse = await fetch(`${API_BASE}/api/activities/${blahNew1.id}/pending-invitations`, {
            headers: { 'Authorization': `Bearer ${hostLogin.token}` }
        });
        
        if (pendingCheckResponse.ok) {
            const pendingCheck = await pendingCheckResponse.json();
            console.log('   Current pending invitations:', JSON.stringify(pendingCheck, null, 4));
        } else {
            console.log('   ❌ Could not retrieve pending invitations');
        }
        
        // Issue 3: Process Auto Notifications timing
        console.log('\n3. PROCESS AUTO NOTIFICATIONS CHECK:');
        console.log('   When the connection was accepted, processAutoNotifications should have:');
        console.log('   - Found pending invitations for activities by connected users');
        console.log('   - Created actual invitations');
        console.log('   - Sent them to the newly connected parent');
        
        // Check if Emilia has any invitations from roberts1 now
        const today = new Date();
        const oneYearLater = new Date();
        oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
        const startDate = today.toISOString().split('T')[0];
        const endDate = oneYearLater.toISOString().split('T')[0];
        
        const emiliaInvitationsResponse = await fetch(`${API_BASE}/api/calendar/invitations?start=${startDate}&end=${endDate}&_t=${Date.now()}`, {
            headers: { 'Authorization': `Bearer ${guestLogin.token}` }
        });
        const emiliaInvitations = await emiliaInvitationsResponse.json();
        
        const invitationsFromRoberts1 = emiliaInvitations.data?.filter(inv => 
            inv.host_parent_username === hostLogin.user.username
        ) || [];
        
        console.log(`\n📧 EMILIA'S INVITATIONS FROM ROBERTS1: ${invitationsFromRoberts1.length}`);
        invitationsFromRoberts1.forEach(inv => {
            console.log(`   - "${inv.activity_name}" - Status: ${inv.status}`);
        });
        
        console.log('\n' + '=' .repeat(70));
        console.log('🎯 DIAGNOSIS:');
        
        if (invitationsFromRoberts1.length === 0) {
            console.log('❌ NO INVITATIONS FOUND - This confirms the automated flow failed');
            console.log('\nPOSSIBLE CAUSES:');
            console.log('1. 🕐 TIMING: Connection was accepted before pending invitations were stored');
            console.log('2. 💾 STORAGE: UI didn\'t properly save the pending connection selection');
            console.log('3. 🔄 PROCESSING: processAutoNotifications didn\'t run or failed');
            console.log('4. 🐛 BUG: There\'s an issue in the automated flow logic');
        } else {
            console.log('✅ INVITATIONS FOUND - The automated flow worked!');
            console.log('   Your issue might be elsewhere (UI not updating, etc.)');
        }
        
    } catch (error) {
        console.error('❌ Investigation failed:', error.message);
    }
}

investigateAutomatedFlow();