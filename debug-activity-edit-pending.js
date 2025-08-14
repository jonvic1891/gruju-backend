#!/usr/bin/env node

const fetch = require('node-fetch');
const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com';

async function debugActivityEditPending() {
    try {
        console.log('🔍 DEBUGGING ACTIVITY EDIT SCREEN PENDING CONNECTIONS');
        console.log('=' .repeat(70));
        
        // Login as roberts1
        const hostLogin = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'roberts1@example.com', password: 'test123' })
        }).then(r => r.json());
        
        console.log('✅ Logged in as roberts1');
        
        // Get the "blah new 2" activity
        const hostChildren = await fetch(`${API_BASE}/api/children`, {
            headers: { 'Authorization': `Bearer ${hostLogin.token}` }
        }).then(r => r.json());
        
        const hostChild = hostChildren.data[0];
        const activities = await fetch(`${API_BASE}/api/activities/${hostChild.id}`, {
            headers: { 'Authorization': `Bearer ${hostLogin.token}` }
        }).then(r => r.json());
        
        const blahNew2 = activities.data.find(a => a.name === 'blah new 2');
        if (!blahNew2) {
            console.log('❌ "blah new 2" activity not found');
            console.log('Available activities:', activities.data.map(a => a.name));
            return;
        }
        
        console.log(`✅ Found activity: "${blahNew2.name}" (ID: ${blahNew2.id})`);
        
        console.log('\n🔍 CHECKING BACKEND DATA:');
        
        // Check what pending invitations exist for this activity
        console.log('1. Checking pending_activity_invitations table...');
        
        // We can't query the table directly, but we can check if there's an endpoint
        const pendingResponse = await fetch(`${API_BASE}/api/activities/${blahNew2.id}/pending-invitations`, {
            headers: { 'Authorization': `Bearer ${hostLogin.token}` }
        });
        
        if (pendingResponse.ok) {
            const pendingData = await pendingResponse.json();
            console.log('   Pending invitations data:', JSON.stringify(pendingData, null, 2));
        } else {
            console.log('   ❌ Could not retrieve pending invitations data');
        }
        
        // Check connections endpoint (what the UI uses)
        console.log('\n2. Checking connections endpoint...');
        const connectionsResponse = await fetch(`${API_BASE}/api/connections`, {
            headers: { 'Authorization': `Bearer ${hostLogin.token}` }
        });
        const connections = await connectionsResponse.json();
        
        console.log(`   Found ${connections.data?.length || 0} connections:`);
        connections.data?.forEach(conn => {
            console.log(`      - ${conn.child1_name} <-> ${conn.child2_name} (${conn.status})`);
        });
        
        // Check if there are any actual activity invitations created
        console.log('\n3. Checking activity invitations...');
        const today = new Date();
        const oneYearLater = new Date();
        oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
        const startDate = today.toISOString().split('T')[0];
        const endDate = oneYearLater.toISOString().split('T')[0];
        
        const invitationsResponse = await fetch(`${API_BASE}/api/calendar/invitations?start=${startDate}&end=${endDate}&_t=${Date.now()}`, {
            headers: { 'Authorization': `Bearer ${hostLogin.token}` }
        });
        const invitations = await invitationsResponse.json();
        
        const blahNew2Invitations = invitations.data?.filter(inv => 
            inv.activity_name === 'blah new 2'
        ) || [];
        
        console.log(`   Found ${blahNew2Invitations.length} invitations for "blah new 2":`);
        blahNew2Invitations.forEach(inv => {
            console.log(`      - To: ${inv.invited_child_name} - Status: ${inv.status}`);
        });
        
        console.log('\n🎯 ANALYSIS:');
        
        if (blahNew2Invitations.length === 0) {
            console.log('❌ NO INVITATIONS FOUND for "blah new 2"');
            console.log('   This means either:');
            console.log('   1. The pending connection was not saved properly');
            console.log('   2. The connection to Emilia is already active (not pending)');
            console.log('   3. The UI failed to create the pending invitation entry');
            
            // Check if connection to Emilia is already active
            const emiliaConnection = connections.data?.find(conn => 
                conn.child1_name === 'Emilia' || conn.child2_name === 'Emilia'
            );
            
            if (emiliaConnection && emiliaConnection.status === 'active') {
                console.log('\n💡 ROOT CAUSE: Connection to Emilia is ALREADY ACTIVE!');
                console.log('   When connection is active, Emilia should show as a regular connection,');
                console.log('   not a pending connection. The UI should show:');
                console.log('   - ✅ Emilia (connected) - for immediate invitation');
                console.log('   - NOT ⏳ Emilia (pending connection)');
                console.log('');
                console.log('🔧 THE FIX NEEDED:');
                console.log('   The activity edit screen needs to:');
                console.log('   1. Load existing activity invitations');
                console.log('   2. Show invited children properly');
                console.log('   3. Allow editing/adding more invitations');
                console.log('   4. Distinguish between pending connections and active connections');
            }
        } else {
            console.log('✅ INVITATIONS FOUND - checking why edit screen fails');
        }
        
        console.log('\n📱 UI ISSUE ANALYSIS:');
        console.log('The "unable to load participant information" error suggests:');
        console.log('1. Frontend is making a request that\'s failing');
        console.log('2. An API endpoint is returning an error');
        console.log('3. The activity edit screen has a bug in loading participant data');
        
    } catch (error) {
        console.error('❌ Debug failed:', error.message);
    }
}

debugActivityEditPending();