#!/usr/bin/env node

const fetch = require('node-fetch');
const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com';

async function debugChildObjects() {
    try {
        console.log('🔍 DEBUGGING CHILD OBJECTS IN CONNECTION SELECTION');
        console.log('='.repeat(50));
        
        // Login
        const loginResponse = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'roberts11@example.com', password: 'test123' })
        });
        const loginData = await loginResponse.json();
        const token = loginData.token;
        
        // Search for the parent with multiple children
        const searchResponse = await fetch(`${API_BASE}/api/connections/search?q=robert`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (searchResponse.ok) {
            const searchData = await searchResponse.json();
            const targetParent = searchData.data.find(parent => parent.children && parent.children.length > 1);
            
            if (targetParent) {
                console.log(`\n📊 Parent with ${targetParent.children.length} children found:`);
                console.log('Parent UUID:', targetParent.user_uuid);
                
                console.log('\n🧪 Individual child analysis:');
                targetParent.children.forEach((child, i) => {
                    console.log(`\nChild ${i + 1}:`);
                    console.log('  Object keys:', Object.keys(child));
                    console.log('  Full object:', JSON.stringify(child, null, 2));
                    console.log('  child.uuid type:', typeof child.uuid);
                    console.log('  child.uuid value:', child.uuid);
                });
                
                // Test UUID array operations
                const childUuids = targetParent.children.map(c => c.uuid);
                console.log('\n🔗 Child UUIDs array:', childUuids);
                
                // Test includes operation
                const firstChildUuid = targetParent.children[0].uuid;
                console.log('\n🧪 Testing includes operation:');
                console.log('  First child UUID:', firstChildUuid);
                console.log('  Array includes first child:', childUuids.includes(firstChildUuid));
                console.log('  Array includes second child:', childUuids.includes(targetParent.children[1].uuid));
                
                // Test what happens when we initialize selected array
                const selectedTargetChildren = targetParent.children.length > 0 ? [targetParent.children[0].uuid] : [];
                console.log('\n📋 Initial selection state:');
                console.log('  selectedTargetChildren:', selectedTargetChildren);
                console.log('  First child is selected:', selectedTargetChildren.includes(targetParent.children[0].uuid));
                console.log('  Second child is selected:', selectedTargetChildren.includes(targetParent.children[1].uuid));
                
            } else {
                console.log('❌ No parent with multiple children found');
            }
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

debugChildObjects();