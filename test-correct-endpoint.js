#!/usr/bin/env node

const fetch = require('node-fetch');

const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com';

async function testCorrectEndpoint() {
    try {
        // Login as Johnson family
        const loginResponse = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'johnson@example.com', password: 'demo123' })
        });
        
        const loginData = await loginResponse.json();
        if (!loginData.success) {
            console.error('❌ Login failed');
            return;
        }
        console.log('✅ Login successful');
        const token = loginData.token;
        
        // Test the correct endpoint path (without /api prefix)
        console.log('🔍 Testing correct endpoint path...');
        const invitedResponse = await fetch(`${API_BASE}/calendar/invited-activities?start=2025-08-01&end=2025-08-31`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        console.log('📡 Status:', invitedResponse.status);
        console.log('📡 Content-Type:', invitedResponse.headers.get('content-type'));
        
        if (invitedResponse.ok) {
            const invitedData = await invitedResponse.json();
            console.log('🎉 SUCCESS! New invited activities endpoint is working!');
            console.log('📊 Response:', invitedData);
            
            if (invitedData.data && invitedData.data.length > 0) {
                console.log('🎯 Found invited activities:');
                invitedData.data.forEach((activity, index) => {
                    console.log(`   ${index + 1}. "${activity.name}" by ${activity.host_parent_username}`);
                });
            } else {
                console.log('ℹ️ No invited activities found (this is normal if no invites are accepted yet)');
            }
        } else {
            const errorText = await invitedResponse.text();
            console.log('❌ Endpoint failed. Response:', errorText.substring(0, 200));
        }
        
    } catch (error) {
        console.error('❌ Test error:', error.message);
    }
}

testCorrectEndpoint();