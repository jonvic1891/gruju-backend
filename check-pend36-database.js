#!/usr/bin/env node

const fetch = require('node-fetch');

const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com';

async function checkPend36Database() {
    try {
        console.log('🔍 CHECKING PEND36 DATABASE STATE');
        console.log('='.repeat(50));
        
        // Login as Emilia's parent (who owns pend36 according to logs)
        const loginResponse = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'roberts11@example.com', password: 'test123' })
        });
        const loginData = await loginResponse.json();
        const token = loginData.token;
        
        console.log('✅ Logged in as:', loginData.user.email);
        console.log('👤 User UUID:', loginData.user.uuid);
        
        // Get children
        const childrenResponse = await fetch(`${API_BASE}/api/children`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const childrenData = await childrenResponse.json();
        const child = childrenData.data[0];
        
        console.log('👶 Child:', child.name, child.uuid);
        
        // Check all activities for this child to find pend36
        console.log('\n🔍 Looking for pend36 in activities...');
        const activitiesResponse = await fetch(`${API_BASE}/api/activities/${child.uuid}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (activitiesResponse.ok) {
            const activitiesData = await activitiesResponse.json();
            const pend36 = activitiesData.data?.find(act => 
                act.name && act.name.toLowerCase().includes('pend36')
            );
            
            if (pend36) {
                console.log('✅ Found pend36:');
                console.log('- Name:', pend36.name);
                console.log('- UUID:', pend36.activity_uuid);
                console.log('- Pending connections:', pend36.pending_connections);
                
                if (pend36.pending_connections && pend36.pending_connections.length > 0) {
                    console.log('\n📊 Pending connections found in activity data!');
                    pend36.pending_connections.forEach((key, i) => {
                        console.log(`  ${i + 1}. ${key}`);
                    });
                    
                    // Now check participants endpoint
                    console.log('\n🔍 Testing participants endpoint...');
                    const participantsResponse = await fetch(`${API_BASE}/api/activities/${pend36.activity_uuid}/participants`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    
                    if (participantsResponse.ok) {
                        const participantsData = await participantsResponse.json();
                        console.log('✅ Participants response:');
                        console.log(JSON.stringify(participantsData, null, 2));
                        
                        if (participantsData.data.participants.length === 0) {
                            console.log('\n❌ ISSUE: Pending connections exist but not showing in participants');
                            console.log('🔍 This suggests a query issue in the participants endpoint');
                        }
                    } else {
                        console.log('❌ Participants endpoint failed:', await participantsResponse.text());
                    }
                } else {
                    console.log('\n❌ No pending connections found for pend36');
                    console.log('🔍 This means the activity doesn\'t actually have pending invitations');
                }
            } else {
                console.log('❌ pend36 not found in this user\'s activities');
            }
        } else {
            console.log('❌ Failed to get activities');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

checkPend36Database();
