#!/usr/bin/env node

const fetch = require('node-fetch');
const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com';

async function fixPend36ShowEmilia() {
    try {
        // Login as pend36 owner
        const loginResponse = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'roberts11@example.com', password: 'test123' })
        });
        const loginData = await loginResponse.json();
        
        // Set correct pending connection for Emilia 10
        const activityUuid = '6b694711-5bb0-47fa-8b95-6bfebb7171f3'; // pend36
        const connectionRequestUuid = 'aa147389-8b41-49fe-9fe7-4b97c4ce1f01'; // Charlie 11 → Emilia 10
        
        const updateResponse = await fetch(`${API_BASE}/api/activities/${activityUuid}/pending-invitations`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${loginData.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                pending_connections: [`pending-${connectionRequestUuid}`]
            })
        });
        
        const result = await updateResponse.json();
        console.log('Updated:', result.success ? 'SUCCESS' : 'FAILED');
        
        // Test participants
        const participantsResponse = await fetch(`${API_BASE}/api/activities/${activityUuid}/participants`, {
            headers: { 'Authorization': `Bearer ${loginData.token}` }
        });
        const participantsData = await participantsResponse.json();
        
        console.log('Participants:', participantsData.data.participants.map(p => `${p.child_name}`));
        
    } catch (error) {
        console.error('Error:', error.message);
    }
}

fixPend36ShowEmilia();
