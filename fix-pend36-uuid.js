#!/usr/bin/env node

const fetch = require('node-fetch');

const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com';

async function fixPend36Uuid() {
    try {
        console.log('🔧 FIXING PEND36 UUID');
        console.log('='.repeat(50));
        
        // Login as owner of pend36 (Emilia's parent)
        const loginResponse = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'roberts11@example.com', password: 'test123' })
        });
        const loginData = await loginResponse.json();
        const token = loginData.token;
        
        console.log('✅ Logged in as:', loginData.user.email);
        
        const activityUuid = '6b694711-5bb0-47fa-8b95-6bfebb7171f3'; // pend36
        const correctEmiliaUuid = 'f87b81b0-41eb-4357-90ae-f81b4c2fa8f7';
        const correctPendingKey = `pending-${correctEmiliaUuid}`;
        
        console.log('\n📤 Updating pend36 pending connections...');
        console.log('Old UUID: aa147389-8b41-49fe-9fe7-4b97c4ce1f01');
        console.log('New UUID:', correctEmiliaUuid);
        
        // Update the pending connections
        const updateResponse = await fetch(`${API_BASE}/api/activities/${activityUuid}/pending-invitations`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                pending_connections: [correctPendingKey]
            })
        });
        
        if (updateResponse.ok) {
            const updateResult = await updateResponse.json();
            console.log('✅ Updated pending connections:', updateResult);
            
            // Test participants endpoint
            console.log('\n🔍 Testing participants endpoint...');
            const participantsResponse = await fetch(`${API_BASE}/api/activities/${activityUuid}/participants`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (participantsResponse.ok) {
                const participantsData = await participantsResponse.json();
                console.log('✅ Participants response:');
                console.log(JSON.stringify(participantsData, null, 2));
                
                if (participantsData.data.participants.length > 0) {
                    console.log('\n🎉 SUCCESS! Emilia is now showing in participants!');
                } else {
                    console.log('\n❌ Still no participants. There may be another issue.');
                }
            } else {
                console.log('❌ Participants endpoint failed:', await participantsResponse.text());
            }
            
        } else {
            const errorText = await updateResponse.text();
            console.log('❌ Failed to update pending connections:', errorText);
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

fixPend36Uuid();
