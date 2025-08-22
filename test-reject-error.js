#!/usr/bin/env node

const fetch = require('node-fetch');
const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com';

async function testRejectError() {
    try {
        console.log('🧪 TESTING REJECT CONNECTION ERROR');
        console.log('='.repeat(50));
        
        // Login as user who receives requests  
        const loginResponse = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'johnson@example.com', password: 'test123' })
        });
        const loginData = await loginResponse.json();
        
        if (!loginData.success) {
            console.log('❌ Login failed for johnson, trying different account');
            // Try different account
            const loginResponse2 = await fetch(`${API_BASE}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: 'roberts11@example.com', password: 'test123' })
            });
            const loginData2 = await loginResponse2.json();
            
            console.log('✅ Logged in as:', loginData2.user.email);
            const token = loginData2.token;
            
            // Skip creating new requests, just check existing ones
            console.log('\n🔍 Checking existing pending requests:');
            const requestsResponse = await fetch(`${API_BASE}/api/connections/requests`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (requestsResponse.ok) {
                const requests = await requestsResponse.json();
                console.log('Pending requests:', requests);
                
                if (requests.success && requests.data && requests.data.length > 0) {
                    const firstRequest = requests.data[0];
                    console.log(`\n🧪 Testing REJECT on request: ${firstRequest.request_uuid}`);
                    
                    // Test the reject action that's causing 500 error
                    const rejectResponse = await fetch(`${API_BASE}/api/connections/respond/${firstRequest.request_uuid}`, {
                        method: 'POST',
                        headers: { 
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}` 
                        },
                        body: JSON.stringify({ action: 'reject' })
                    });
                    
                    console.log('Reject response status:', rejectResponse.status);
                    const rejectResult = await rejectResponse.text();
                    
                    if (rejectResponse.status === 500) {
                        console.log('❌ 500 ERROR REPRODUCED!');
                        console.log('Error response:', rejectResult);
                    } else if (rejectResponse.status === 200) {
                        console.log('✅ Reject worked successfully');
                        console.log('Response:', rejectResult);
                    } else {
                        console.log('🤔 Unexpected status:', rejectResponse.status);
                        console.log('Response:', rejectResult);
                    }
                } else {
                    console.log('❌ No pending requests to test with');
                }
            }
            return;
        }
        
        console.log('✅ Logged in as:', loginData.user.email);
        const token = loginData.token;
        
        // First, create a connection request to test rejection
        const myChildrenResponse = await fetch(`${API_BASE}/api/children`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const myChildren = await myChildrenResponse.json();
        
        // Search for a target parent
        const searchResponse = await fetch(`${API_BASE}/api/connections/search?q=johnson`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (searchResponse.ok) {
            const searchData = await searchResponse.json();
            const targetParent = searchData.data[0];
            
            if (targetParent && targetParent.children.length > 0) {
                console.log(`\n📤 Creating connection request to test rejection...`);
                
                // Create a connection request
                const requestData = {
                    target_parent_id: targetParent.user_uuid,
                    child_uuid: myChildren.data[0].uuid,
                    target_child_uuid: targetParent.children[0].uuid,
                    message: 'Test connection request for rejection testing'
                };
                
                const createResponse = await fetch(`${API_BASE}/api/connections/request`, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}` 
                    },
                    body: JSON.stringify(requestData)
                });
                
                const createResult = await createResponse.json();
                console.log(`📬 Create request result:`, createResult);
                
                if (createResult.success) {
                    console.log('✅ Connection request created successfully');
                    console.log('📋 Now the target user can test rejecting this request');
                    console.log(`🔍 Request UUID: ${createResult.request_uuid || 'Check backend logs'}`);
                } else {
                    console.log('❌ Failed to create connection request:', createResult.error);
                }
            }
        }
        
        // Now let's look at the current pending requests for debugging
        console.log('\n🔍 Current pending requests:');
        const requestsResponse = await fetch(`${API_BASE}/api/connections/requests`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (requestsResponse.ok) {
            const requests = await requestsResponse.json();
            console.log('Pending requests:', requests);
            
            if (requests.success && requests.data && requests.data.length > 0) {
                const firstRequest = requests.data[0];
                console.log(`\n🧪 Testing REJECT on request: ${firstRequest.request_uuid}`);
                
                // Test the reject action that's causing 500 error
                const rejectResponse = await fetch(`${API_BASE}/api/connections/respond/${firstRequest.request_uuid}`, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}` 
                    },
                    body: JSON.stringify({ action: 'reject' })
                });
                
                console.log('Reject response status:', rejectResponse.status);
                const rejectResult = await rejectResponse.text();
                
                if (rejectResponse.status === 500) {
                    console.log('❌ 500 ERROR REPRODUCED!');
                    console.log('Error response:', rejectResult);
                } else if (rejectResponse.status === 200) {
                    console.log('✅ Reject worked successfully');
                    console.log('Response:', rejectResult);
                } else {
                    console.log('🤔 Unexpected status:', rejectResponse.status);
                    console.log('Response:', rejectResult);
                }
            }
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

testRejectError();