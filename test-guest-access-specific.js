#!/usr/bin/env node

const fetch = require('node-fetch');
const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com';

async function testGuestAccessSpecific() {
    try {
        console.log('🔍 TESTING GUEST ACCESS TO SPECIFIC ACTIVITIES');
        console.log('='.repeat(60));
        
        // Login as guest
        const guestLogin = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'roberts@example.com', password: 'test123' })
        }).then(r => r.json());
        
        console.log('✅ Logged in as guest');
        console.log(`Guest: ${guestLogin.user.username} (ID: ${guestLogin.user.id})`);
        
        // Get guest's invitations to see activities they should have access to
        const today = new Date();
        const startDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const endDate = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        const invitationsResponse = await fetch(`${API_BASE}/api/calendar/invitations?start=${startDate}&end=${endDate}&_t=${Date.now()}`, {
            headers: { 'Authorization': `Bearer ${guestLogin.token}` }
        });
        
        const invitations = await invitationsResponse.json();
        console.log(`📧 Guest has ${invitations.data?.length || 0} invitations`);
        
        // Focus on "Host-Guest View Test" activities
        const hostGuestTests = invitations.data?.filter(inv => 
            inv.activity_name.includes('Host-Guest View Test')
        ) || [];
        
        console.log(`\n🎯 Found ${hostGuestTests.length} "Host-Guest View Test" activities:`);
        
        for (const activity of hostGuestTests) {
            console.log(`\n📋 Testing activity: "${activity.activity_name}" (ID: ${activity.id})`);
            console.log(`   Status: ${activity.status}`);
            console.log(`   Host: ${activity.host_parent_username}`);
            console.log(`   Invitation ID: ${activity.invitation_id}`);
            
            // Test participants access
            const participantsResponse = await fetch(`${API_BASE}/api/activities/${activity.id}/participants`, {
                headers: { 'Authorization': `Bearer ${guestLogin.token}` }
            });
            
            console.log(`   Participants response: ${participantsResponse.status}`);
            
            if (participantsResponse.ok) {
                const participantsData = await participantsResponse.json();
                console.log(`   ✅ Guest CAN access participants: ${participantsData.data?.participants?.length || 0} found`);
            } else {
                const errorText = await participantsResponse.text();
                console.log(`   ❌ Guest CANNOT access participants: ${errorText}`);
                
                // This is the problematic activity - let's debug further
                console.log(`   🔍 DEBUGGING PERMISSION ISSUE FOR ACTIVITY ${activity.id}:`);
                console.log(`      Guest user ID: ${guestLogin.user.id}`);
                console.log(`      Activity ID: ${activity.id}`);
                console.log(`      Expected: Guest should have permission via activity_invitations table`);
                
                // Let's also check if there are pending invitations for this activity
                // (This would mean our permission fix should allow access)
                console.log(`      Checking if this activity has pending invitations for guest...`);
            }
        }
        
        // Also test the most recent activities
        console.log(`\n🔍 Testing most recent activities from any host:`);
        const recentActivities = invitations.data?.slice(0, 3) || [];
        
        for (const activity of recentActivities) {
            console.log(`\n📋 Testing recent activity: "${activity.activity_name}" (ID: ${activity.id})`);
            
            const participantsResponse = await fetch(`${API_BASE}/api/activities/${activity.id}/participants`, {
                headers: { 'Authorization': `Bearer ${guestLogin.token}` }
            });
            
            if (participantsResponse.ok) {
                console.log(`   ✅ Guest can access this activity's participants`);
            } else {
                const errorText = await participantsResponse.text();
                console.log(`   ❌ Guest cannot access: ${errorText}`);
            }
        }
        
        console.log(`\n🎯 SUMMARY:`);
        console.log(`If any "Host-Guest View Test" activities show permission denied,`);
        console.log(`that's the specific activity causing the "unable to load participant information" error.`);
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testGuestAccessSpecific();