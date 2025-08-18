#!/usr/bin/env node

const fetch = require('node-fetch');

const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com';

async function quickTestFix() {
    try {
        console.log('🧪 QUICK TEST OF PENDING CONNECTIONS FIX');
        console.log('='.repeat(50));
        
        // Login as host
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
        
        console.log('✅ Host logged in:', hostLoginData.user.email);
        console.log('👶 Host child:', hostChild.name, hostChild.uuid);
        
        // Test the activities endpoint
        console.log('\n🔍 Testing GET /api/activities/' + hostChild.uuid);
        
        const activitiesResponse = await fetch(`${API_BASE}/api/activities/${hostChild.uuid}`, {
            headers: { 'Authorization': `Bearer ${hostToken}` }
        });
        
        console.log('📊 Response status:', activitiesResponse.status);
        
        if (activitiesResponse.ok) {
            const activitiesData = await activitiesResponse.json();
            console.log('✅ Endpoint working!');
            console.log('📋 Activities count:', activitiesData.data?.length || 0);
            
            // Check if any activities have pending_connections
            const activitiesWithPending = (activitiesData.data || []).filter(act => 
                act.pending_connections && act.pending_connections.length > 0
            );
            
            console.log('🔗 Activities with pending connections:', activitiesWithPending.length);
            
            if (activitiesWithPending.length > 0) {
                console.log('🎉 SUCCESS! Pending connections are now included!');
                activitiesWithPending.forEach((act, i) => {
                    console.log(`${i + 1}. "${act.name}" has ${act.pending_connections.length} pending connections`);
                    console.log(`   Keys: ${act.pending_connections.join(', ')}`);
                });
            } else {
                console.log('ℹ️ No activities with pending connections found (this may be normal)');
            }
            
            // Show first few activities for debugging
            if (activitiesData.data && activitiesData.data.length > 0) {
                console.log('\n📋 First 3 activities:');
                activitiesData.data.slice(0, 3).forEach((act, i) => {
                    console.log(`${i + 1}. "${act.name}"`);
                    console.log(`   - Has pending_connections field: ${'pending_connections' in act}`);
                    console.log(`   - Pending connections: ${JSON.stringify(act.pending_connections)}`);
                });
            }
            
        } else {
            const errorText = await activitiesResponse.text();
            console.log('❌ Endpoint failed:', errorText);
        }
        
    } catch (error) {
        console.error('❌ Test error:', error.message);
    }
}

quickTestFix();