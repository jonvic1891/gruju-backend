#!/usr/bin/env node

const fetch = require('node-fetch');

const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com';

async function testNewEndpoints() {
    try {
        // Login as Davis family
        const loginResponse = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'davis@example.com', password: 'demo123' })
        });
        
        const loginData = await loginResponse.json();
        if (!loginData.success) {
            console.error('❌ Login failed');
            return;
        }
        console.log('✅ Login successful');
        const token = loginData.token;
        
        // Test activity-invitations endpoint
        console.log('🔍 Testing /api/activity-invitations...');
        const invitationsResponse = await fetch(`${API_BASE}/api/activity-invitations`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        console.log('📡 Status:', invitationsResponse.status);
        console.log('📡 Content-Type:', invitationsResponse.headers.get('content-type'));
        
        if (invitationsResponse.ok) {
            const invitationsData = await invitationsResponse.json();
            console.log('✅ Activity invitations endpoint works!');
            console.log('📊 Response:', JSON.stringify(invitationsData, null, 2));
        } else {
            const errorText = await invitationsResponse.text();
            console.log('❌ Activity invitations endpoint failed');
            console.log('📋 Error response:', errorText.substring(0, 300));
        }
        
        // Test invited-activities endpoint 
        console.log('\n🔍 Testing /api/calendar/invited-activities...');
        const invitedResponse = await fetch(`${API_BASE}/api/calendar/invited-activities?start=2025-08-01&end=2025-08-31`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        console.log('📡 Status:', invitedResponse.status);
        
        if (invitedResponse.ok) {
            const invitedData = await invitedResponse.json();
            console.log('✅ Invited activities endpoint works!');
            console.log('📊 Response:', JSON.stringify(invitedData, null, 2));
        } else {
            console.log('❌ Invited activities endpoint failed:', invitedResponse.status);
        }
        
    } catch (error) {
        console.error('❌ Test error:', error.message);
    }
}

testNewEndpoints();