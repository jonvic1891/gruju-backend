#!/usr/bin/env node

const fetch = require('node-fetch');

const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com';

async function debugPend36Participants() {
    try {
        console.log('🔍 DEBUGGING PEND36 PARTICIPANTS');
        console.log('='.repeat(50));
        
        // Login as host (Jonathan)
        const hostLoginResponse = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'jonathan.roberts006@hotmail.co.uk', password: 'test123' })
        });
        const hostLoginData = await hostLoginResponse.json();
        const hostToken = hostLoginData.token;
        
        console.log('✅ Host logged in:', hostLoginData.user.email);
        
        const activityUuid = '6b694711-5bb0-47fa-8b95-6bfebb7171f3'; // pend36
        
        // Check if there are pending invitations for this activity
        console.log('\n🔍 Step 1: Check pending invitations directly');
        const pendingResponse = await fetch(`${API_BASE}/api/activities/${activityUuid}/pending-invitations`, {
            headers: { 'Authorization': `Bearer ${hostToken}` }
        });
        
        if (pendingResponse.ok) {
            const pendingData = await pendingResponse.json();
            console.log('📊 Pending invitations for pend36:', JSON.stringify(pendingData, null, 2));
        } else {
            console.log('❌ Failed to get pending invitations:', await pendingResponse.text());
        }
        
        // Check participants endpoint
        console.log('\n🔍 Step 2: Check participants endpoint');
        const participantsResponse = await fetch(`${API_BASE}/api/activities/${activityUuid}/participants`, {
            headers: { 'Authorization': `Bearer ${hostToken}` }
        });
        
        if (participantsResponse.ok) {
            const participantsData = await participantsResponse.json();
            console.log('📊 Participants response:', JSON.stringify(participantsData, null, 2));
        } else {
            console.log('❌ Failed to get participants:', await participantsResponse.text());
        }
        
        // Login as Emilia's parent to check if they have permission
        console.log('\n🔍 Step 3: Check as Emilia\'s parent');
        const emiliaLoginResponse = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'roberts11@example.com', password: 'test123' })
        });
        const emiliaLoginData = await emiliaLoginResponse.json();
        const emiliaToken = emiliaLoginData.token;
        
        console.log('✅ Emilia parent logged in:', emiliaLoginData.user.email);
        console.log('👤 Emilia parent UUID:', emiliaLoginData.user.uuid);
        
        // Check if Emilia's parent can see participants
        const emiliaParticipantsResponse = await fetch(`${API_BASE}/api/activities/${activityUuid}/participants`, {
            headers: { 'Authorization': `Bearer ${emiliaToken}` }
        });
        
        if (emiliaParticipantsResponse.ok) {
            const emiliaParticipantsData = await emiliaParticipantsResponse.json();
            console.log('📊 Participants (as Emilia parent):', JSON.stringify(emiliaParticipantsData, null, 2));
        } else {
            console.log('❌ Emilia parent cannot access participants:', await emiliaParticipantsResponse.text());
        }
        
    } catch (error) {
        console.error('❌ Debug error:', error.message);
    }
}

debugPend36Participants();
