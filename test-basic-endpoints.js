#!/usr/bin/env node

const fetch = require('node-fetch');

const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com';

async function testBasicEndpoints() {
    try {
        // Login as Johnson family
        const loginResponse = await fetch(`${API_BASE}/api/auth/login`, {
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
        
        // Test existing calendar endpoint
        console.log('🔍 Testing existing calendar endpoint...');
        const calendarResponse = await fetch(`${API_BASE}/api/calendar/activities?start=2025-08-01&end=2025-08-31`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (calendarResponse.ok) {
            const calendarData = await calendarResponse.json();
            console.log('✅ Existing calendar endpoint works:', calendarData.success ? 'SUCCESS' : 'FAILED');
        } else {
            console.log('❌ Existing calendar endpoint failed:', calendarResponse.status);
        }
        
        // Test new invited activities endpoint
        console.log('🔍 Testing new invited activities endpoint...');
        const invitedResponse = await fetch(`${API_BASE}/api/calendar/invited-activities?start=2025-08-01&end=2025-08-31`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        console.log('📡 Status:', invitedResponse.status);
        console.log('📡 Content-Type:', invitedResponse.headers.get('content-type'));
        
        if (invitedResponse.status === 404) {
            console.log('❌ New endpoint not found - deployment may not be complete');
        } else if (invitedResponse.ok) {
            const invitedData = await invitedResponse.json();
            console.log('✅ New invited activities endpoint works!');
            console.log('📊 Data:', invitedData);
        } else {
            const errorText = await invitedResponse.text();
            console.log('❌ New endpoint failed. Response:', errorText.substring(0, 200));
        }
        
    } catch (error) {
        console.error('❌ Test error:', error.message);
    }
}

testBasicEndpoints();