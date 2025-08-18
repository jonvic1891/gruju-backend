#!/usr/bin/env node

const fetch = require('node-fetch');

const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com';

async function testParticipantsFix() {
    try {
        console.log('🧪 TESTING PARTICIPANTS ENDPOINT FIX');
        console.log('='.repeat(50));
        
        // Login as mobile user (roberts11@example.com - user 134)
        const mobileLoginResponse = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'roberts11@example.com', password: 'test123' })
        });
        const mobileLoginData = await mobileLoginResponse.json();
        const mobileToken = mobileLoginData.token;
        
        console.log('✅ Mobile user logged in:', mobileLoginData.user.email);
        console.log('👤 Mobile user UUID:', mobileLoginData.user.uuid);
        
        // Test the participants endpoint with fresh token
        const activityUuid = '6b694711-5bb0-47fa-8b95-6bfebb7171f3';
        console.log('\n🔍 Testing participants endpoint for activity:', activityUuid);
        
        const participantsResponse = await fetch(`${API_BASE}/api/activities/${activityUuid}/participants`, {
            headers: { 'Authorization': `Bearer ${mobileToken}` }
        });
        
        console.log('📊 Response status:', participantsResponse.status);
        
        if (participantsResponse.ok) {
            const participantsData = await participantsResponse.json();
            console.log('✅ SUCCESS! Participants endpoint now works!');
            console.log('📋 Participants data:', JSON.stringify(participantsData, null, 2));
        } else {
            const errorText = await participantsResponse.text();
            console.log('❌ Participants endpoint still failing:', errorText);
        }
        
    } catch (error) {
        console.error('❌ Test error:', error.message);
    }
}

testParticipantsFix();
