#!/usr/bin/env node

const fetch = require('node-fetch');

const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com';

async function debugUserData() {
    try {
        console.log('🔍 DEBUGGING USER DATA STRUCTURES');
        console.log('='.repeat(50));
        
        // Login as Emilia and check the full response structure
        console.log('\n1. LOGIN AS EMILIA AND CHECK STRUCTURE...');
        const emiliaLoginResponse = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'roberts@example.com', password: 'test123' })
        });
        
        const emiliaLoginData = await emiliaLoginResponse.json();
        console.log('🔍 Full Emilia login response:', JSON.stringify(emiliaLoginData, null, 2));
        
        if (emiliaLoginData.success && emiliaLoginData.user) {
            console.log('✅ Emilia login successful');
            console.log('👤 User object:', emiliaLoginData.user);
            console.log('🆔 User ID:', emiliaLoginData.user.id);
            console.log('🔑 User UUID:', emiliaLoginData.user.uuid);
        }
        
        // Login as host and check structure
        console.log('\n2. LOGIN AS HOST AND CHECK STRUCTURE...');
        const hostLoginResponse = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'jonathan.roberts006@hotmail.co.uk', password: 'test123' })
        });
        
        const hostLoginData = await hostLoginResponse.json();
        console.log('🔍 Full Host login response:', JSON.stringify(hostLoginData, null, 2));
        
        if (hostLoginData.success && hostLoginData.user) {
            console.log('✅ Host login successful');
            console.log('👤 User object:', hostLoginData.user);
            console.log('🆔 User ID:', hostLoginData.user.id);
            console.log('🔑 User UUID:', hostLoginData.user.uuid);
        }
        
        // If we found valid IDs, test a connection request
        if (emiliaLoginData.user?.id && hostLoginData.user?.id) {
            console.log('\n3. TESTING CONNECTION REQUEST WITH CORRECT DATA...');
            
            // Get children first
            const hostChildrenResponse = await fetch(`${API_BASE}/api/children`, {
                headers: { 'Authorization': `Bearer ${hostLoginData.token}` }
            });
            const hostChildrenData = await hostChildrenResponse.json();
            const hostChild = hostChildrenData.data[0];
            
            const emiliaChildrenResponse = await fetch(`${API_BASE}/api/children`, {
                headers: { 'Authorization': `Bearer ${emiliaLoginData.token}` }
            });
            const emiliaChildrenData = await emiliaChildrenResponse.json();
            const emiliaChild = emiliaChildrenData.data[0];
            
            console.log('👶 Host child data:', hostChild);
            console.log('👶 Emilia child data:', emiliaChild);
            
            // Now try connection request with correct data
            const connectionRequestData = {
                target_parent_id: emiliaLoginData.user.id, // Use the actual ID
                child_uuid: hostChild.uuid,
                target_child_uuid: emiliaChild.uuid,
                message: 'Test connection request'
            };
            
            console.log('📤 Connection request data:', connectionRequestData);
            
            const createConnectionResponse = await fetch(`${API_BASE}/api/connections/request`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${hostLoginData.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(connectionRequestData)
            });
            
            if (createConnectionResponse.ok) {
                const connectionResult = await createConnectionResponse.json();
                console.log('✅ Connection request successful:', connectionResult);
            } else {
                const errorText = await createConnectionResponse.text();
                console.log('❌ Connection request failed:', errorText);
            }
        }
        
    } catch (error) {
        console.error('❌ Debug error:', error.message);
    }
}

debugUserData();