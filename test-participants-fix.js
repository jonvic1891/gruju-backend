#!/usr/bin/env node

const fetch = require('node-fetch');
const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com';

async function testParticipantsFix() {
    try {
        console.log('🧪 TESTING PARTICIPANTS ENDPOINT FIX');
        console.log('=' .repeat(60));
        
        // Login as roberts1
        const hostLogin = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'roberts1@example.com', password: 'test123' })
        }).then(r => r.json());
        
        console.log('✅ Logged in as roberts1');
        
        // Get "blah new 2" activity
        const hostChildren = await fetch(`${API_BASE}/api/children`, {
            headers: { 'Authorization': `Bearer ${hostLogin.token}` }
        }).then(r => r.json());
        
        const hostChild = hostChildren.data[0];
        const activities = await fetch(`${API_BASE}/api/activities/${hostChild.id}`, {
            headers: { 'Authorization': `Bearer ${hostLogin.token}` }
        }).then(r => r.json());
        
        const blahNew2 = activities.data.find(a => a.name === 'blah new 2');
        if (!blahNew2) {
            console.log('❌ "blah new 2" activity not found');
            console.log('Available activities:', activities.data.map(a => a.name));
            return;
        }
        
        console.log(`✅ Found activity: "${blahNew2.name}" (ID: ${blahNew2.id})`);
        
        // Test the participants endpoint
        console.log('\n🔍 TESTING PARTICIPANTS ENDPOINT:');
        const participantsResponse = await fetch(`${API_BASE}/api/activities/${blahNew2.id}/participants`, {
            headers: { 'Authorization': `Bearer ${hostLogin.token}` }
        });
        
        if (participantsResponse.ok) {
            const participantsData = await participantsResponse.json();
            console.log('✅ Participants endpoint working!');
            console.log(`📊 Found ${participantsData.data?.participants?.length || 0} total participants/invitations`);
            
            if (participantsData.data?.host) {
                console.log(`🏠 Host: ${participantsData.data.host.host_child_name}`);
            }
            
            if (participantsData.data?.participants?.length > 0) {
                console.log('\n👥 Participants/Invitations:');
                participantsData.data.participants.forEach((p, i) => {
                    console.log(`  ${i + 1}. ${p.child_name || 'Unknown'} - Status: ${p.status} - Type: ${p.invitation_type}`);
                    if (p.status === 'pending_connection') {
                        console.log(`      📩 Pending connection (will send when connection is accepted)`);
                    }
                });
            } else {
                console.log('📋 No participants found');
            }
            
            console.log('\n🎯 RESULT:');
            const hasPendingConnections = participantsData.data?.participants?.some(p => p.status === 'pending_connection');
            if (hasPendingConnections) {
                console.log('✅ SUCCESS! Activity edit screen should now show pending connections');
                console.log('✅ No more "unable to load participant information" error');
            } else {
                console.log('❌ No pending connections found - might need to create new test activity');
            }
            
        } else {
            console.log('❌ Participants endpoint failed');
            const errorText = await participantsResponse.text();
            console.log('Error:', errorText);
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testParticipantsFix();