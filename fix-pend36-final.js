#!/usr/bin/env node

const fetch = require('node-fetch');
const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com';

async function fixPend36Final() {
    try {
        console.log('🔧 FIXING PEND36 WITH CORRECT EMILIA 10 PENDING CONNECTION');
        
        // Login as pend36 owner (Charlie 11's parent - roberts11@example.com)
        const loginResponse = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'roberts11@example.com', password: 'test123' })
        });
        const loginData = await loginResponse.json();
        
        const activityUuid = '6b694711-5bb0-47fa-8b95-6bfebb7171f3'; // pend36
        const emiliaParentUuid = '556d95ac-0eb6-4025-b080-e7b872073878'; // roberts10@example.com
        const correctPendingKey = `pending-${emiliaParentUuid}`;
        
        console.log('📤 Setting correct pending connection for Emilia 10...');
        console.log('Activity:', activityUuid);
        console.log('Emilia parent UUID:', emiliaParentUuid);
        console.log('Pending key:', correctPendingKey);
        
        // Update pending connections
        const updateResponse = await fetch(`${API_BASE}/api/activities/${activityUuid}/pending-invitations`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${loginData.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                pending_connections: [correctPendingKey]
            })
        });
        
        const updateResult = await updateResponse.json();
        console.log('✅ Update result:', updateResult.success ? 'SUCCESS' : 'FAILED');
        
        // Test participants endpoint
        console.log('\n🔍 Testing participants endpoint...');
        const participantsResponse = await fetch(`${API_BASE}/api/activities/${activityUuid}/participants`, {
            headers: { 'Authorization': `Bearer ${loginData.token}` }
        });
        
        if (participantsResponse.ok) {
            const participantsData = await participantsResponse.json();
            console.log('✅ Participants response successful');
            console.log('🏠 Host:', participantsData.data.host.host_child_name);
            console.log('👥 Participants:');
            participantsData.data.participants?.forEach((p, i) => {
                console.log(`  ${i + 1}. ${p.child_name} (${p.parent_name}) - ${p.status}`);
            });
            
            const emiliaParticipant = participantsData.data.participants?.find(p => 
                p.child_name && p.child_name.includes('Emilia')
            );
            
            if (emiliaParticipant) {
                console.log('\n🎉 SUCCESS! Emilia 10 is now showing as pending participant!');
            } else {
                console.log('\n❌ Emilia 10 still not showing as participant');
                console.log('📊 Current participants:', participantsData.data.participants?.map(p => p.child_name));
            }
        } else {
            console.log('❌ Participants endpoint failed:', await participantsResponse.text());
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

fixPend36Final();
