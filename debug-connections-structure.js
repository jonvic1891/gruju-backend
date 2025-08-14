#!/usr/bin/env node

const fetch = require('node-fetch');
const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com';

async function debugConnectionsStructure() {
    try {
        console.log('🔍 DEBUGGING CONNECTIONS STRUCTURE');
        console.log('='.repeat(70));
        
        // Login as Emma Johnson
        const emmaLogin = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'johnson@example.com', password: 'test123' })
        }).then(r => r.json());
        
        console.log('✅ Logged in as Emma Johnson');
        console.log(`   User: ${emmaLogin.user.username} (ID: ${emmaLogin.user.id})`);
        
        // Get Emma's children
        const childrenResponse = await fetch(`${API_BASE}/api/children`, {
            headers: { 'Authorization': `Bearer ${emmaLogin.token}` }
        });
        const children = await childrenResponse.json();
        
        console.log('\n👶 EMMA\'S CHILDREN:');
        children.data?.forEach((child, i) => {
            console.log(`   ${i + 1}. ${child.name} (ID: ${child.id})`);
        });
        
        // Get Emma's connections
        const connectionsResponse = await fetch(`${API_BASE}/api/connections`, {
            headers: { 'Authorization': `Bearer ${emmaLogin.token}` }
        });
        const connections = await connectionsResponse.json();
        
        console.log('\n🔗 EMMA\'S CONNECTIONS:');
        console.log(`   Total connections: ${connections.data?.length || 0}`);
        
        connections.data?.forEach((conn, i) => {
            console.log(`\n   ${i + 1}. Connection ID: ${conn.id}`);
            console.log(`      Child 1: ${conn.child1_name} (ID: ${conn.child1_id}) - Parent: ${conn.child1_parent_name}`);
            console.log(`      Child 2: ${conn.child2_name} (ID: ${conn.child2_id}) - Parent: ${conn.child2_parent_name}`);
            console.log(`      Status: ${conn.status}`);
            
            // Identify which child belongs to Emma and which is connected
            const emmaChildId = children.data?.find(child => 
                child.id === conn.child1_id || child.id === conn.child2_id
            )?.id;
            
            if (emmaChildId) {
                console.log(`      Emma's child: ${emmaChildId === conn.child1_id ? conn.child1_name : conn.child2_name} (ID: ${emmaChildId})`);
                console.log(`      Connected child: ${emmaChildId === conn.child1_id ? conn.child2_name : conn.child1_name} (ID: ${emmaChildId === conn.child1_id ? conn.child2_id : conn.child1_id})`);
            }
        });
        
        console.log('\n🎯 ANALYSIS:');
        console.log('The current frontend shows ALL connected children to Emma Johnson.');
        console.log('But it should filter by the specific host child who owns the activity.');
        console.log('If Emma Johnson has 2 children (Emma, Alex) and both are connected to Mia Wong,');
        console.log('then Mia Wong appears twice in the activity creation - once for each connection.');
        console.log('The fix: filter connections by the host child ID.');
        
    } catch (error) {
        console.error('❌ Debug failed:', error.message);
    }
}

debugConnectionsStructure();