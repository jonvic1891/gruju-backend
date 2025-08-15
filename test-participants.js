#!/usr/bin/env node

const fetch = require('node-fetch');
const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com';

async function testParticipants() {
    console.log('🧪 TESTING ACTIVITY PARTICIPANTS FUNCTIONALITY');
    console.log('='.repeat(80));
    
    try {
        // Login first
        console.log('🔑 Logging in...');
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
        
        console.log('✅ Login successful');
        const token = loginResult.token;
        
        // First, get activities to find one with participants
        console.log('\n📅 Getting activities...');
        const activitiesResponse = await fetch(`${API_BASE}/api/calendar/activities?start=2025-07-01&end=2025-09-30`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const activities = await activitiesResponse.json();
        
        if (!activities.success || !activities.data || activities.data.length === 0) {
            console.log('❌ No activities found to test');
            return;
        }
        
        console.log(`✅ Found ${activities.data.length} activities`);
        
        // Test participants for each activity
        for (let i = 0; i < Math.min(activities.data.length, 3); i++) {
            const activity = activities.data[i];
            console.log(`\n🧪 Testing participants for activity: "${activity.name}"`);
            console.log(`   Activity UUID: ${activity.activity_uuid}`);
            console.log('-'.repeat(60));
            
            if (!activity.activity_uuid) {
                console.log('❌ Activity missing UUID - this is a problem!');
                continue;
            }
            
            // Test participants endpoint
            const participantsResponse = await fetch(`${API_BASE}/api/activities/${activity.activity_uuid}/participants`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            console.log(`   Status: ${participantsResponse.status}`);
            
            if (participantsResponse.status === 200) {
                const participants = await participantsResponse.json();
                
                if (participants.success) {
                    console.log(`   ✅ Participants endpoint working`);
                    console.log(`   📊 Host: ${participants.host?.host_parent_name || 'Unknown'} (${participants.host?.host_child_name || 'Unknown'})`);
                    console.log(`   👥 Participants: ${participants.participants?.length || 0}`);
                    console.log(`   ⏳ Pending: ${participants.pending?.length || 0}`);
                    
                    if (participants.participants && participants.participants.length > 0) {
                        console.log('   🔍 Participant details:');
                        participants.participants.forEach((p, idx) => {
                            console.log(`     ${idx + 1}. ${p.parent_name} (${p.child_name}) - Status: ${p.status}`);
                        });
                    }
                    
                    if (participants.pending && participants.pending.length > 0) {
                        console.log('   🔍 Pending invitations:');
                        participants.pending.forEach((p, idx) => {
                            console.log(`     ${idx + 1}. ${p.parent_name || 'Unknown'} (${p.child_name || 'Unknown'}) - ${p.message}`);
                        });
                    }
                    
                    if (participants.participants?.length === 0 && participants.pending?.length === 0) {
                        console.log('   📝 No participants or pending invitations found');
                    }
                } else {
                    console.log(`   ❌ Participants endpoint error: ${participants.error || 'Unknown error'}`);
                }
            } else {
                const errorText = await participantsResponse.text();
                console.log(`   ❌ HTTP Error ${participantsResponse.status}: ${errorText}`);
            }
        }
        
        console.log('\n' + '='.repeat(80));
        console.log('📊 PARTICIPANTS TEST SUMMARY');
        console.log('='.repeat(80));
        
    } catch (error) {
        console.error('❌ Participants test failed:', error.message);
    }
}

testParticipants();