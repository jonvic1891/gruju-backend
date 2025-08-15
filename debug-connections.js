#!/usr/bin/env node

const fetch = require('node-fetch');
const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com';

async function debugConnections() {
    console.log('🔍 DEBUGGING CONNECTIONS ISSUE');
    console.log('='.repeat(80));
    
    try {
        // Login as Emma
        console.log('🔑 Logging in as Emma...');
        const loginResponse = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'roberts11@example.com', password: 'test123' })
        });
        
        const loginResult = await loginResponse.json();
        
        if (!loginResult.success) {
            console.log('❌ Login failed');
            return;
        }
        
        console.log('✅ Emma logged in successfully');
        const token = loginResult.token;
        
        // Get Emma's children
        console.log('\n👶 Getting Emma\'s children...');
        const childrenResponse = await fetch(`${API_BASE}/api/children`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const children = await childrenResponse.json();
        
        if (children.success && children.data) {
            console.log(`📋 Emma has ${children.data.length} children:`);
            children.data.forEach((child, i) => {
                console.log(`   ${i + 1}. ${child.name}`);
                console.log(`      UUID: ${child.uuid}`);
                console.log(`      Has sequential ID: ${child.id ? 'YES (❌ PROBLEM!)' : 'NO'}`);
            });
        }
        
        // Get connections
        console.log('\n🔗 Getting Emma\'s connections...');
        const connectionsResponse = await fetch(`${API_BASE}/api/connections`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const connections = await connectionsResponse.json();
        
        if (connections.success && connections.data) {
            console.log(`📋 Emma has ${connections.data.length} connections:`);
            connections.data.forEach((conn, i) => {
                console.log(`   ${i + 1}. Connection:`);
                console.log(`      Child1: ${conn.child1_name} (ID: ${conn.child1_id}, UUID: ${conn.child1_uuid || 'MISSING'})`);
                console.log(`      Child2: ${conn.child2_name} (ID: ${conn.child2_id}, UUID: ${conn.child2_uuid || 'MISSING'})`);
                console.log(`      Connection ID: ${conn.id}, UUID: ${conn.uuid || 'MISSING'}`);
            });
        } else {
            console.log('❌ No connections found or error loading connections');
            console.log('   Response:', connections);
        }
        
        console.log('\n🔍 PROBLEM ANALYSIS:');
        console.log('=====================================');
        
        if (children.data && children.data.length > 0) {
            const firstChild = children.data[0];
            console.log(`Frontend child object has:`);
            console.log(`   - UUID: ${firstChild.uuid} (✅ This is what should be used)`);
            console.log(`   - Sequential ID: ${firstChild.id} (❌ This should not be used for matching)`);
        }
        
        if (connections.data && connections.data.length > 0) {
            const firstConnection = connections.data[0];
            console.log(`Backend connection object has:`);
            console.log(`   - child1_id: ${firstConnection.child1_id} (this is sequential ID)`);
            console.log(`   - child1_uuid: ${firstConnection.child1_uuid || 'MISSING'} (this should be used)`);
            console.log(`   - child2_id: ${firstConnection.child2_id} (this is sequential ID)`);
            console.log(`   - child2_uuid: ${firstConnection.child2_uuid || 'MISSING'} (this should be used)`);
        }
        
        console.log('\n💡 SOLUTION NEEDED:');
        console.log('   Frontend should compare child.uuid with connection.child1_uuid/child2_uuid');
        console.log('   Instead of comparing child.id with connection.child1_id/child2_id');
        
    } catch (error) {
        console.error('❌ Debug failed:', error.message);
    }
}

debugConnections();