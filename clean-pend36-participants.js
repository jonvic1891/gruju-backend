#!/usr/bin/env node

const fetch = require('node-fetch');
const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com';

async function cleanPend36Participants() {
    try {
        console.log('🧹 CLEANING PEND36 - KEEP ONLY EMILIA 10');
        
        // Login as pend36 owner
        const loginResponse = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'roberts11@example.com', password: 'test123' })
        });
        const loginData = await loginResponse.json();
        
        const activityUuid = '6b694711-5bb0-47fa-8b95-6bfebb7171f3';
        const emiliaParentUuid = '556d95ac-0eb6-4025-b080-e7b872073878';
        const correctPendingKey = `pending-${emiliaParentUuid}`;
        
        console.log('📤 Setting ONLY Emilia 10 as pending connection...');
        
        // Set only the correct pending connection
        const updateResponse = await fetch(`${API_BASE}/api/activities/${activityUuid}/pending-invitations`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${loginData.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                pending_connections: [correctPendingKey] // Only Emilia 10
            })
        });
        
        const updateResult = await updateResponse.json();
        console.log('✅ Clean update result:', updateResult.success ? 'SUCCESS' : 'FAILED');
        
        // Test final result
        const participantsResponse = await fetch(`${API_BASE}/api/activities/${activityUuid}/participants`, {
            headers: { 'Authorization': `Bearer ${loginData.token}` }
        });
        
        const participantsData = await participantsResponse.json();
        console.log('\n🎯 FINAL RESULT:');
        console.log('🏠 Host:', participantsData.data.host.host_child_name);
        console.log('👥 Participants count:', participantsData.data.participants?.length || 0);
        participantsData.data.participants?.forEach((p, i) => {
            console.log(`  ${i + 1}. ${p.child_name} (${p.parent_name})`);
        });
        
        if (participantsData.data.participants?.length === 1 && 
            participantsData.data.participants[0].child_name.includes('Emilia')) {
            console.log('\n🎉 PERFECT! Only Emilia 10 is showing as pending participant!');
        } else {
            console.log('\n⚠️ Still have extra participants');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

cleanPend36Participants();
