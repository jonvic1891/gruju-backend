#!/usr/bin/env node

const fetch = require('node-fetch');
const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com';

async function createTestInvitation() {
    console.log('🧪 CREATING TEST INVITATION TO VERIFY FUNCTIONALITY');
    console.log('='.repeat(80));
    
    try {
        // Login as first user
        console.log('🔑 Logging in as first user...');
        const loginResponse1 = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'roberts11@example.com', password: 'test123' })
        });
        
        const loginResult1 = await loginResponse1.json();
        
        if (!loginResult1.success) {
            console.log('❌ Login failed');
            return;
        }
        
        const token1 = loginResult1.token;
        console.log('✅ First user logged in');
        
        // Get activities from first user
        const activitiesResponse = await fetch(`${API_BASE}/api/calendar/activities?start=2025-07-01&end=2025-09-30`, {
            headers: { 'Authorization': `Bearer ${token1}` }
        });
        
        const activities = await activitiesResponse.json();
        
        if (!activities.success || !activities.data || activities.data.length === 0) {
            console.log('❌ No activities found');
            return;
        }
        
        const activity = activities.data[0];
        console.log(`📅 Found activity: "${activity.name}" (UUID: ${activity.activity_uuid})`);
        
        // Search for other users to invite
        console.log('\n🔍 Searching for users to invite...');
        const searchResponse = await fetch(`${API_BASE}/api/connections/search?q=johnson`, {
            headers: { 'Authorization': `Bearer ${token1}` }
        });
        
        const searchResults = await searchResponse.json();
        
        if (!searchResults.success || !searchResults.data || searchResults.data.length === 0) {
            console.log('❌ No users found to invite');
            
            // Let's try a different search
            const searchResponse2 = await fetch(`${API_BASE}/api/connections/search?q=test`, {
                headers: { 'Authorization': `Bearer ${token1}` }
            });
            
            const searchResults2 = await searchResponse2.json();
            console.log('🔍 Alternative search results:', searchResults2);
            return;
        }
        
        const targetUser = searchResults.data[0];
        console.log(`👤 Found user to invite: ${targetUser.username} (UUID: ${targetUser.user_uuid})`);
        
        if (!targetUser.children || targetUser.children.length === 0) {
            console.log('❌ Target user has no children to invite');
            return;
        }
        
        const targetChild = targetUser.children[0];
        console.log(`👶 Target child: ${targetChild.name} (UUID: ${targetChild.uuid})`);
        
        // Create an invitation
        console.log('\n📧 Creating invitation...');
        const inviteResponse = await fetch(`${API_BASE}/api/activities/${activity.activity_uuid}/invite`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${token1}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                invited_parent_id: targetUser.user_uuid, // This might need to be the sequential ID
                child_id: targetChild.uuid, // This might need to be the sequential ID  
                message: 'Test invitation to verify participants functionality'
            })
        });
        
        console.log(`   Invite response status: ${inviteResponse.status}`);
        
        if (inviteResponse.status !== 200) {
            const errorText = await inviteResponse.text();
            console.log(`   ❌ Invitation failed: ${errorText}`);
            
            // The invite endpoint might still expect sequential IDs
            console.log('\n🔧 The invite endpoint might still need sequential IDs instead of UUIDs');
            console.log('   This could be causing the "who\'s invited" functionality to break');
            
            return;
        }
        
        const inviteResult = await inviteResponse.json();
        
        if (inviteResult.success) {
            console.log('✅ Invitation created successfully!');
            console.log(`   Invitation data:`, inviteResult.data);
            
            // Now test participants to see if it shows up
            console.log('\n👥 Testing participants after invitation...');
            const participantsResponse = await fetch(`${API_BASE}/api/activities/${activity.activity_uuid}/participants`, {
                headers: { 'Authorization': `Bearer ${token1}` }
            });
            
            const participants = await participantsResponse.json();
            
            if (participants.success) {
                console.log('✅ Participants endpoint working');
                console.log(`   Host: ${participants.data?.host?.host_parent_name || 'Unknown'}`);
                console.log(`   Participants: ${participants.data?.participants?.length || 0}`);
                
                if (participants.data?.participants?.length > 0) {
                    console.log('   🎉 SUCCESS: Participants are now showing!');
                    participants.data.participants.forEach((p, idx) => {
                        console.log(`     ${idx + 1}. ${p.parent_name} (${p.child_name}) - Status: ${p.status}`);
                    });
                } else {
                    console.log('   ❌ Still no participants showing - there\'s still an issue');
                }
            } else {
                console.log(`   ❌ Participants endpoint error: ${participants.error}`);
            }
        } else {
            console.log(`❌ Invitation failed: ${inviteResult.error || 'Unknown error'}`);
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

createTestInvitation();