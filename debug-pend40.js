#!/usr/bin/env node

const fetch = require('node-fetch');
const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com';

async function debugPend40() {
    try {
        console.log('🔍 DEBUGGING PEND40');
        console.log('='.repeat(50));
        
        // Login as pend40 owner
        const loginResponse = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'roberts11@example.com', password: 'test123' })
        });
        const loginData = await loginResponse.json();
        
        const activityUuid = '6e5e09b0-c722-44c1-b049-66d4f17d12d7';
        
        console.log('✅ Logged in as:', loginData.user.email);
        
        // Check if pend40 exists and has pending_connections
        console.log('\n🔍 Checking pend40 activity data...');
        const childrenResponse = await fetch(`${API_BASE}/api/children`, {
            headers: { 'Authorization': `Bearer ${loginData.token}` }
        });
        const childrenData = await childrenResponse.json();
        const child = childrenData.data[0];
        
        const activitiesResponse = await fetch(`${API_BASE}/api/activities/${child.uuid}`, {
            headers: { 'Authorization': `Bearer ${loginData.token}` }
        });
        const activitiesData = await activitiesResponse.json();
        
        const pend40 = activitiesData.data?.find(act => 
            act.name && act.name.toLowerCase().includes('pend40')
        );
        
        if (pend40) {
            console.log('✅ Found pend40:');
            console.log('- Name:', pend40.name);
            console.log('- UUID:', pend40.activity_uuid);
            console.log('- Pending connections field exists:', 'pending_connections' in pend40);
            console.log('- Pending connections:', pend40.pending_connections);
            
            if (pend40.pending_connections && pend40.pending_connections.length > 0) {
                console.log('\n📊 Pending connections found in activity:');
                pend40.pending_connections.forEach((key, i) => {
                    console.log(`  ${i + 1}. ${key}`);
                    
                    // Extract UUID from pending key
                    if (key.startsWith('pending-')) {
                        const uuid = key.replace('pending-', '');
                        console.log(`     UUID: ${uuid}`);
                    }
                });
            } else {
                console.log('❌ No pending connections found in activity data');
                console.log('💡 This means pending invitations were not saved when you added them');
            }
        } else {
            console.log('❌ pend40 not found in activities');
        }
        
        // Test participants endpoint and show more details
        console.log('\n🔍 Testing participants endpoint...');
        const participantsResponse = await fetch(`${API_BASE}/api/activities/${activityUuid}/participants`, {
            headers: { 'Authorization': `Bearer ${loginData.token}` }
        });
        
        if (participantsResponse.ok) {
            const participantsData = await participantsResponse.json();
            console.log('✅ Participants endpoint response:');
            console.log('- Host:', participantsData.data.host.host_child_name);
            console.log('- Participants count:', participantsData.data.participants?.length || 0);
            
            if (participantsData.data.participants?.length === 0) {
                console.log('\n❌ DIAGNOSIS: No participants returned');
                console.log('🔍 Possible causes:');
                console.log('1. No pending invitations were created in database');
                console.log('2. Pending invitations exist but use invalid UUIDs');
                console.log('3. Query is failing to join with users table');
            }
        } else {
            console.log('❌ Participants endpoint failed');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

debugPend40();
