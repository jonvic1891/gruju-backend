#!/usr/bin/env node

const fetch = require('node-fetch');

const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com';

async function fixPend36CorrectInvitee() {
    try {
        console.log('🔧 FIXING PEND36 WITH CORRECT INVITEE');
        console.log('='.repeat(50));
        
        // Login as owner of pend36 (host)
        const hostLoginResponse = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'roberts11@example.com', password: 'test123' })
        });
        const hostLoginData = await hostLoginResponse.json();
        const hostToken = hostLoginData.token;
        
        console.log('✅ Host logged in:', hostLoginData.user.email);
        
        const activityUuid = '6b694711-5bb0-47fa-8b95-6bfebb7171f3'; // pend36
        const correctInvitedUuid = '85750de0-cb72-4ed9-b76e-4f2e401ddff3'; // jonathan.roberts006@hotmail.co.uk
        const correctPendingKey = `pending-${correctInvitedUuid}`;
        
        console.log('\n📤 Updating pend36 with correct invitee...');
        console.log('Host UUID:', hostLoginData.user.uuid, '(should NOT be in pending)');
        console.log('Invited UUID:', correctInvitedUuid, '(should be in pending)');
        
        // Update the pending connections
        const updateResponse = await fetch(`${API_BASE}/api/activities/${activityUuid}/pending-invitations`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${hostToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                pending_connections: [correctPendingKey]
            })
        });
        
        if (updateResponse.ok) {
            const updateResult = await updateResponse.json();
            console.log('✅ Updated pending connections:', updateResult);
            
            // Test participants endpoint as host
            console.log('\n🔍 Testing participants endpoint as HOST...');
            const participantsResponse = await fetch(`${API_BASE}/api/activities/${activityUuid}/participants`, {
                headers: { 'Authorization': `Bearer ${hostToken}` }
            });
            
            if (participantsResponse.ok) {
                const participantsData = await participantsResponse.json();
                console.log('✅ Participants response (as host):');
                console.log(JSON.stringify(participantsData, null, 2));
                
                const participant = participantsData.data.participants[0];
                if (participant) {
                    console.log('\n📊 Participant analysis:');
                    console.log('- Parent name:', participant.parent_name);
                    console.log('- Child name:', participant.child_name);
                    console.log('- Should be: Jonathan Roberts (not the host)');
                    
                    if (participant.parent_name !== 'Jonathan Roberts2') {
                        console.log('🎉 SUCCESS! Now showing correct invited person!');
                    } else {
                        console.log('❌ Still showing host as participant');
                    }
                } else {
                    console.log('❌ No participants found');
                }
            } else {
                console.log('❌ Participants endpoint failed:', await participantsResponse.text());
            }
            
        } else {
            const errorText = await updateResponse.text();
            console.log('❌ Failed to update pending connections:', errorText);
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

fixPend36CorrectInvitee();
