#!/usr/bin/env node

const fetch = require('node-fetch');

const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com';

async function createTestWithPending() {
    try {
        console.log('🎯 CREATING ACTIVITY WITH PENDING CONNECTIONS');
        console.log('='.repeat(50));
        
        // Login as host (Jonathan)
        const hostLoginResponse = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'jonathan.roberts006@hotmail.co.uk', password: 'test123' })
        });
        const hostLoginData = await hostLoginResponse.json();
        const hostToken = hostLoginData.token;
        
        // Get host child
        const hostChildrenResponse = await fetch(`${API_BASE}/api/children`, {
            headers: { 'Authorization': `Bearer ${hostToken}` }
        });
        const hostChildrenData = await hostChildrenResponse.json();
        const hostChild = hostChildrenData.data[0];
        
        console.log('✅ Host:', hostLoginData.user.email);
        console.log('👶 Host child:', hostChild.name);
        
        // Create activity
        const activityData = {
            name: 'Participants Test Activity',
            description: 'Testing participants endpoint with pending',
            start_date: '2025-08-19',
            end_date: '2025-08-19',
            start_time: '16:00',
            end_time: '18:00',
            location: 'Test Location',
            max_participants: 10,
            cost: 0,
            auto_notify_new_connections: false
        };
        
        const createResponse = await fetch(`${API_BASE}/api/activities/${hostChild.uuid}`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${hostToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(activityData)
        });
        
        const createResult = await createResponse.json();
        const activityUuid = createResult.data?.uuid;
        console.log('✅ Activity created:', activityUuid);
        
        // Add pending invitation for Emilia
        const emiliaParentUuid = 'f87b81b0-41eb-4357-90ae-f81b4c2fa8f7'; // From logs
        const pendingKey = `pending-${emiliaParentUuid}`;
        
        console.log('\n📤 Adding pending connection for Emilia parent:', emiliaParentUuid);
        
        const pendingResponse = await fetch(`${API_BASE}/api/activities/${activityUuid}/pending-invitations`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${hostToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                pending_connections: [pendingKey]
            })
        });
        
        if (pendingResponse.ok) {
            const pendingResult = await pendingResponse.json();
            console.log('✅ Pending connection added:', pendingResult);
        } else {
            const errorText = await pendingResponse.text();
            console.log('❌ Failed to add pending connection:', errorText);
            return;
        }
        
        // Now test participants endpoint
        console.log('\n🔍 Testing participants endpoint for NEW activity...');
        
        const participantsResponse = await fetch(`${API_BASE}/api/activities/${activityUuid}/participants`, {
            headers: { 'Authorization': `Bearer ${hostToken}` }
        });
        
        if (participantsResponse.ok) {
            const participantsData = await participantsResponse.json();
            console.log('✅ Participants response:');
            console.log(JSON.stringify(participantsData, null, 2));
            
            if (participantsData.data.participants.length > 0) {
                console.log('🎉 SUCCESS! Pending participants are showing up!');
            } else {
                console.log('❌ Still no participants showing up');
            }
        } else {
            const errorText = await participantsResponse.text();
            console.log('❌ Participants endpoint failed:', errorText);
        }
        
    } catch (error) {
        console.error('❌ Test error:', error.message);
    }
}

createTestWithPending();
