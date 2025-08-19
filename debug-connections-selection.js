#!/usr/bin/env node

const fetch = require('node-fetch');
const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com';

async function debugConnectionsSelection() {
    try {
        console.log('🔍 DEBUGGING CONNECTIONS SELECTION ISSUE');
        console.log('='.repeat(50));
        
        // Login and search for a parent with multiple children
        const loginResponse = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'roberts11@example.com', password: 'test123' })
        });
        const loginData = await loginResponse.json();
        
        console.log('✅ Logged in as:', loginData.user.email);
        
        // Search for parents (this should return parents with multiple children)
        const searchResponse = await fetch(`${API_BASE}/api/connections/search?q=robert`, {
            headers: { 'Authorization': `Bearer ${loginData.token}` }
        });
        
        if (searchResponse.ok) {
            const searchData = await searchResponse.json();
            console.log('📊 Search results:');
            
            searchData.data?.forEach((parent, i) => {
                console.log(`\n${i + 1}. Parent: ${parent.name} (UUID: ${parent.user_uuid})`);
                console.log(`   Children count: ${parent.children?.length || 0}`);
                parent.children?.forEach((child, j) => {
                    console.log(`     ${j + 1}. ${child.name} (ID: ${child.id}, UUID: ${child.uuid})`);
                });
                
                // Check for potential issues
                if (parent.children && parent.children.length > 1) {
                    const childIds = parent.children.map(child => child.id);
                    const uniqueIds = [...new Set(childIds)];
                    
                    if (childIds.length !== uniqueIds.length) {
                        console.log(`   ❌ ISSUE: Duplicate child IDs found!`);
                        console.log(`   Child IDs: ${childIds}`);
                        console.log(`   Unique IDs: ${uniqueIds}`);
                    } else {
                        console.log(`   ✅ All child IDs are unique`);
                    }
                }
            });
            
            // Look for parents with multiple children
            const parentsWithMultipleChildren = searchData.data?.filter(parent => 
                parent.children && parent.children.length > 1
            ) || [];
            
            if (parentsWithMultipleChildren.length > 0) {
                console.log(`\n🎯 Found ${parentsWithMultipleChildren.length} parent(s) with multiple children`);
                console.log('This is where the selection bug might occur.');
            } else {
                console.log('\n❌ No parents with multiple children found in search results');
                console.log('Try searching for different terms to find parents with multiple children');
            }
            
        } else {
            console.log('❌ Search failed');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

debugConnectionsSelection();
