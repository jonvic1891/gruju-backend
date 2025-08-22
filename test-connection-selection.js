#!/usr/bin/env node

const fetch = require('node-fetch');
const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com';

async function testConnectionSelection() {
    try {
        console.log('🧪 TESTING CONNECTION SELECTION FUNCTIONALITY');
        console.log('='.repeat(50));
        
        // Login as test user
        const loginResponse = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'roberts11@example.com', password: 'test123' })
        });
        const loginData = await loginResponse.json();
        
        console.log('✅ Logged in as:', loginData.user.email);
        const token = loginData.token;
        
        // Get my children first
        const myChildrenResponse = await fetch(`${API_BASE}/api/children`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const myChildren = await myChildrenResponse.json();
        
        console.log('\n📋 My Children:');
        if (myChildren.success && myChildren.data) {
            myChildren.data.forEach((child, i) => {
                console.log(`  ${i + 1}. ${child.name} (UUID: ${child.uuid}, ID: ${child.id})`);
            });
        }
        
        // Search for a parent with multiple children
        const searchResponse = await fetch(`${API_BASE}/api/connections/search?q=robert`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (searchResponse.ok) {
            const searchData = await searchResponse.json();
            console.log('\n🔍 Search Results:');
            
            // Find any parent with multiple children
            const targetParent = searchData.data.find(parent => parent.children && parent.children.length > 1);
            if (targetParent) {
                console.log(`\n🎯 Found target parent with ${targetParent.children.length} children:`);
                targetParent.children.forEach((child, i) => {
                    console.log(`  ${i + 1}. ${child.name} (UUID: ${child.uuid}, ID: ${child.id})`);
                });
                
                // Test single child selection scenario
                const myChild = myChildren.data[0];
                const targetChild = targetParent.children[1]; // Select second child specifically
                
                console.log(`\n🧪 Testing connection request:`);
                console.log(`  My child: ${myChild.name} (UUID: ${myChild.uuid})`);
                console.log(`  Target child: ${targetChild.name} (UUID: ${targetChild.uuid})`);
                
                const connectionRequestData = {
                    target_parent_id: targetParent.user_uuid,
                    child_uuid: myChild.uuid,
                    target_child_uuid: targetChild.uuid,
                    message: 'Test connection request - single child selection'
                };
                
                console.log(`\n📤 Connection request data:`, connectionRequestData);
                
                // Send the connection request
                const requestResponse = await fetch(`${API_BASE}/api/connections/request`, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}` 
                    },
                    body: JSON.stringify(connectionRequestData)
                });
                
                const requestResult = await requestResponse.json();
                console.log(`\n📬 Connection request result:`, requestResult);
                
                if (requestResult.success) {
                    console.log('✅ Single child connection request sent successfully!');
                } else {
                    console.log('❌ Connection request failed:', requestResult.error);
                }
                
            } else {
                console.log('❌ No suitable parent found with multiple children');
            }
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

testConnectionSelection();