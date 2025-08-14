#!/usr/bin/env node

const fetch = require('node-fetch');
const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com';

async function findMultiChildParents() {
    try {
        console.log('🔍 FINDING PARENTS WITH MULTIPLE CHILDREN');
        console.log('='.repeat(70));
        
        // Try a range of user emails
        const emailPatterns = [
            'roberts1@example.com', 'roberts2@example.com', 'roberts3@example.com', 'roberts4@example.com', 'roberts5@example.com',
            'roberts6@example.com', 'roberts7@example.com', 'roberts8@example.com', 'roberts9@example.com', 'roberts10@example.com',
            'roberts11@example.com', 'roberts12@example.com'
        ];
        
        const parentsWithMultipleChildren = [];
        
        for (const email of emailPatterns) {
            try {
                const loginResponse = await fetch(`${API_BASE}/api/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password: 'test123' })
                });
                
                const result = await loginResponse.json();
                
                if (result.success) {
                    // Check children
                    const childrenResponse = await fetch(`${API_BASE}/api/children`, {
                        headers: { 'Authorization': `Bearer ${result.token}` }
                    });
                    const children = await childrenResponse.json();
                    
                    if (children.success && children.data?.length > 1) {
                        console.log(`\n✅ PARENT WITH MULTIPLE CHILDREN: ${email}`);
                        console.log(`   Username: ${result.user?.username}`);
                        console.log(`   ID: ${result.user?.id}`);
                        console.log(`   Children (${children.data.length}):`);
                        children.data.forEach((child, i) => {
                            console.log(`     ${i + 1}. ${child.name} (ID: ${child.id})`);
                        });
                        
                        parentsWithMultipleChildren.push({
                            email,
                            username: result.user?.username,
                            id: result.user?.id,
                            children: children.data
                        });
                        
                        // Check connections for this parent
                        const connectionsResponse = await fetch(`${API_BASE}/api/connections`, {
                            headers: { 'Authorization': `Bearer ${result.token}` }
                        });
                        const connections = await connectionsResponse.json();
                        
                        if (connections.success && connections.data?.length > 0) {
                            console.log(`   Connections (${connections.data.length}):`);
                            connections.data.forEach((conn, i) => {
                                console.log(`     ${i + 1}. ${conn.child1_name} ↔ ${conn.child2_name}`);
                            });
                        }
                    }
                }
            } catch (error) {
                // Skip errors, just continue
            }
        }
        
        console.log(`\n🎯 SUMMARY: Found ${parentsWithMultipleChildren.length} parents with multiple children`);
        
        if (parentsWithMultipleChildren.length > 0) {
            console.log('\n📋 ANALYSIS:');
            console.log('These parents could have the Mia Wong duplicate issue if:');
            console.log('1. Multiple children from the same parent are connected to Mia Wong');
            console.log('2. The loadConnectedChildren function shows ALL parent connections instead of filtering by host child');
        }
        
    } catch (error) {
        console.error('❌ Search failed:', error.message);
    }
}

findMultiChildParents();