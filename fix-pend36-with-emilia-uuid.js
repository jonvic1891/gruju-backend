#!/usr/bin/env node

const fetch = require('node-fetch');
const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com';

async function fixPend36WithEmiliaUuid() {
    try {
        console.log('🔧 Fixing pend36 with correct Emilia UUID');
        
        // From the original context: "Child Emilia 10 (UUID: 5fd73f87-fcab-42d0-b371-e73a87dfa69e)"
        // This is likely the child UUID, but we need the parent UUID
        
        // The original mobile user was: f87b81b0-41eb-4357-90ae-f81b4c2fa8f7 (roberts11@example.com)
        // But this doesn't seem right either...
        
        // Let me try the original approach - find who actually has access to Emilia
        const loginResponse = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'roberts11@example.com', password: 'test123' })
        });
        const loginData = await loginResponse.json();
        
        const activityUuid = '6b694711-5bb0-47fa-8b95-6bfebb7171f3';
        
        // Clear all wrong pending connections first
        console.log('🧹 Clearing existing wrong pending connections...');
        
        // Check what we have now
        const currentResponse = await fetch(`${API_BASE}/api/activities/${activityUuid}`, {
            headers: { 'Authorization': `Bearer ${loginData.token}` }
        });
        const currentData = await currentResponse.json();
        
        console.log('Current pending connections:', currentData.data?.pending_connections);
        
        // Since we can't find the real Emilia, let's check what the intended setup should be
        // Based on your connection request: Charlie 11 wants to connect to Emilia 10
        // So pend36 (Charlie 11's activity) should show Emilia 10 as pending
        
        // The connection request UUID aa147389-8b41-49fe-9fe7-4b97c4ce1f01 represents this request
        // But we need Emilia's parent UUID to make the pending invitation work
        
        console.log('❌ Cannot fix without knowing Emilia 10 parent UUID');
        console.log('💡 The connection request shows Charlie 11 → Emilia 10');
        console.log('💡 But Emilia 10 parent UUID is unknown');
        console.log('💡 Real solution: Use the target_parent from connection request table');
        
    } catch (error) {
        console.error('Error:', error.message);
    }
}

fixPend36WithEmiliaUuid();
