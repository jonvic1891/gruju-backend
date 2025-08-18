#!/usr/bin/env node

const fetch = require('node-fetch');

const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com';

async function debugPendingNow() {
    try {
        console.log('🔍 DEBUGGING PENDING INVITATIONS RIGHT NOW');
        console.log('='.repeat(50));
        
        // Step 1: Login as host and mobile user
        const hostLoginResponse = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'jonathan.roberts006@hotmail.co.uk', password: 'test123' })
        });
        const hostLoginData = await hostLoginResponse.json();
        const hostToken = hostLoginData.token;
        const hostUuid = hostLoginData.user.uuid;
        
        const mobileLoginResponse = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'roberts11@example.com', password: 'test123' })
        });
        const mobileLoginData = await mobileLoginResponse.json();
        const mobileToken = mobileLoginData.token;
        const mobileUserUuid = mobileLoginData.user.uuid;
        
        console.log('✅ Logged in - Host:', hostUuid, 'Mobile:', mobileUserUuid);
        
        // Step 2: Get children
        const hostChildrenResponse = await fetch(`${API_BASE}/api/children`, {
            headers: { 'Authorization': `Bearer ${hostToken}` }
        });
        const hostChildrenData = await hostChildrenResponse.json();
        const hostChild = hostChildrenData.data[0];
        
        const mobileChildrenResponse = await fetch(`${API_BASE}/api/children`, {
            headers: { 'Authorization': `Bearer ${mobileToken}` }
        });
        const mobileChildrenData = await mobileChildrenResponse.json();
        const mobileChild = mobileChildrenData.data[0];
        
        console.log('✅ Children - Host:', hostChild.uuid, 'Mobile:', mobileChild.uuid);
        
        // Step 3: Create activity quickly
        const activityData = {
            name: 'Debug Test Now',
            description: 'Testing pending right now',
            start_date: '2025-01-15',
            end_date: '2025-01-15',
            start_time: '14:00',
            end_time: '16:00',
            location: 'Test',
            max_participants: 10,
            cost: 0,
            auto_notify_new_connections: false
        };
        
        const createActivityResponse = await fetch(`${API_BASE}/api/activities/${hostChild.uuid}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${hostToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(activityData)
        });
        const createActivityResult = await createActivityResponse.json();
        const activityUuid = createActivityResult.data?.uuid;
        
        console.log('✅ Created activity:', activityUuid);
        
        // Step 4: Create pending invitation
        const pendingKey = `pending-${mobileUserUuid}`;
        console.log('🔑 Creating pending with key:', pendingKey);
        
        const createPendingResponse = await fetch(`${API_BASE}/api/activities/${activityUuid}/pending-invitations`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${hostToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ pending_connections: [pendingKey] })
        });
        
        if (createPendingResponse.ok) {
            console.log('✅ Pending invitation created');
        } else {
            console.log('❌ Pending invitation failed:', await createPendingResponse.text());
            return;
        }
        
        // Step 5: Create and accept connection
        const connectionData = {
            target_parent_id: mobileUserUuid,
            child_uuid: hostChild.uuid,
            target_child_uuid: mobileChild.uuid,
            message: 'Debug test connection'
        };
        
        console.log('📤 Creating connection request...');
        const createConnectionResponse = await fetch(`${API_BASE}/api/connections/request`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${hostToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(connectionData)
        });
        
        if (!createConnectionResponse.ok) {
            console.log('❌ Connection creation failed:', await createConnectionResponse.text());
            return;
        }
        
        // Get the connection request
        const requestsResponse = await fetch(`${API_BASE}/api/connections/requests`, {
            headers: { 'Authorization': `Bearer ${mobileToken}` }
        });
        const requestsData = await requestsResponse.json();
        const pendingRequest = requestsData.data?.find(req => req.status === 'pending');
        
        if (!pendingRequest) {
            console.log('❌ No pending request found');
            return;
        }
        
        const requestUuid = pendingRequest.request_uuid || pendingRequest.uuid;
        console.log('🔍 Found request UUID:', requestUuid);
        console.log('🚨 ABOUT TO ACCEPT CONNECTION - WATCH BACKEND LOGS!');
        
        // Accept the connection
        const acceptResponse = await fetch(`${API_BASE}/api/connections/respond/${requestUuid}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${mobileToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'accept' })
        });
        
        if (acceptResponse.ok) {
            console.log('✅ Connection accepted!');
            console.log('🔍 Check backend logs for:');
            console.log('   - "🔍 Processing pending invitations for connection request:"');
            console.log('   - "🔍 Looking for pending invitations with key:"');
            console.log('   - "📋 Found X pending invitations to process"');
        } else {
            console.log('❌ Accept failed:', await acceptResponse.text());
            return;
        }
        
        // Check if invitation was created
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const invitationsResponse = await fetch(`${API_BASE}/api/activity-invitations`, {
            headers: { 'Authorization': `Bearer ${mobileToken}` }
        });
        const invitationsData = await invitationsResponse.json();
        
        const debugInvitations = (invitationsData.data || []).filter(inv => 
            inv.activity_name && inv.activity_name.toLowerCase().includes('debug test')
        );
        
        console.log('\n🏁 RESULT:');
        console.log(`Debug Test invitations found: ${debugInvitations.length}`);
        if (debugInvitations.length > 0) {
            console.log('🎉 SUCCESS! Pending system worked');
        } else {
            console.log('❌ FAILED! Check backend logs for processPendingInvitations');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

debugPendingNow();