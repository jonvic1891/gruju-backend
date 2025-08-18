#!/usr/bin/env node

const fetch = require('node-fetch');

const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com';

async function testNewEndpoint() {
    try {
        console.log('🧪 TESTING NEW ACTIVITY DETAILS ENDPOINT');
        console.log('='.repeat(50));
        
        // Login as host
        const hostLoginResponse = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'jonathan.roberts006@hotmail.co.uk', password: 'test123' })
        });
        const hostLoginData = await hostLoginResponse.json();
        const hostToken = hostLoginData.token;
        
        console.log('✅ Host logged in:', hostLoginData.user.email);
        
        // Test with the activity we created earlier
        const testActivityUuid = '34711cc3-60dc-4de5-a300-afe0adee4119';
        
        console.log('\n🔍 Testing new endpoint: GET /api/activities/details/' + testActivityUuid);
        
        const detailsResponse = await fetch(`${API_BASE}/api/activities/details/${testActivityUuid}`, {
            headers: { 'Authorization': `Bearer ${hostToken}` }
        });
        
        if (detailsResponse.ok) {
            const detailsData = await detailsResponse.json();
            console.log('✅ New endpoint works!');
            console.log('📊 Response data:');
            console.log('- Activity name:', detailsData.data?.name);
            console.log('- Activity UUID:', detailsData.data?.activity_uuid);
            console.log('- Pending connections:', detailsData.data?.pending_connections);
            console.log('- Pending connections count:', detailsData.data?.pending_connections?.length || 0);
            
            if (detailsData.data?.pending_connections && detailsData.data.pending_connections.length > 0) {
                console.log('🎉 SUCCESS: Pending connections are now included in activity details!');
                console.log('🔗 Pending keys:', detailsData.data.pending_connections);
            } else {
                console.log('⚠️ No pending connections found (may be expected if none were added)');
            }
        } else {
            const errorText = await detailsResponse.text();
            console.log('❌ New endpoint failed:', detailsResponse.status, errorText);
        }
        
        console.log('\n' + '='.repeat(50));
        console.log('🏁 TEST COMPLETE');
        console.log('='.repeat(50));
        
    } catch (error) {
        console.error('❌ Test error:', error.message);
    }
}

testNewEndpoint();