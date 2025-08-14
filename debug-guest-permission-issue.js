#!/usr/bin/env node

const fetch = require('node-fetch');
const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com';

async function debugGuestPermissionIssue() {
    try {
        console.log('🔍 DEBUGGING GUEST PERMISSION ISSUE');
        console.log('=' .repeat(70));
        
        // Login as guest
        const guestLogin = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'roberts@example.com', password: 'test123' })
        }).then(r => r.json());
        
        console.log('✅ Logged in as guest');
        console.log(`Guest: ${guestLogin.user.username} (ID: ${guestLogin.user.id})`);
        
        // Get guest's invitations
        const today = new Date();
        const oneYearLater = new Date();
        oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
        const startDate = today.toISOString().split('T')[0];
        const endDate = oneYearLater.toISOString().split('T')[0];
        
        const invitationsResponse = await fetch(`${API_BASE}/api/calendar/invitations?start=${startDate}&end=${endDate}&_t=${Date.now()}`, {
            headers: { 'Authorization': `Bearer ${guestLogin.token}` }
        });
        const invitations = await invitationsResponse.json();
        
        console.log(`\n📧 Found ${invitations.data?.length || 0} invitations`);
        
        if (invitations.data?.length > 0) {
            // Test the first invitation
            const testInvitation = invitations.data[0];
            console.log(`\n🧪 Testing invitation: "${testInvitation.activity_name}"`);
            console.log(`   Activity ID from invitation: ${testInvitation.id}`);
            console.log(`   Invitation ID: ${testInvitation.invitation_id}`);
            console.log(`   Host: ${testInvitation.host_parent_username}`);
            console.log(`   Status: ${testInvitation.status}`);
            
            // Try to access participants with this activity ID
            console.log(`\n🔍 Trying participants endpoint with activity ID ${testInvitation.id}...`);
            const participantsResponse = await fetch(`${API_BASE}/api/activities/${testInvitation.id}/participants`, {
                headers: { 'Authorization': `Bearer ${guestLogin.token}` }
            });
            
            console.log(`   Response status: ${participantsResponse.status}`);
            
            if (participantsResponse.ok) {
                const data = await participantsResponse.json();
                console.log(`   ✅ SUCCESS: Can access participants`);
                console.log(`   Found ${data.data?.participants?.length || 0} participants`);
            } else {
                const errorText = await participantsResponse.text();
                console.log(`   ❌ FAILED: ${errorText}`);
                
                console.log(`\n🔍 DEBUGGING PERMISSION CHECK:`);
                console.log(`   The backend checks if user ${guestLogin.user.id} has permission for activity ${testInvitation.id}`);
                console.log(`   Check 1: Is user the host? (activities.child_id -> children.parent_id = ${guestLogin.user.id})`);
                console.log(`   Check 2: Is user invited? (activity_invitations.activity_id = ${testInvitation.id} AND invited_parent_id = ${guestLogin.user.id})`);
                console.log(`\n❗ The issue might be:`);
                console.log(`   - Activity ID mismatch between invitation record and actual activity`);
                console.log(`   - Invitation record has wrong activity_id`);
                console.log(`   - Backend permission check is using wrong table joins`);
            }
            
            // Let's also check what the calendar/invitations endpoint is actually returning
            console.log(`\n🔍 CHECKING INVITATION DATA STRUCTURE:`);
            console.log(`   Raw invitation data:`, JSON.stringify(testInvitation, null, 2));
        } else {
            console.log('❌ No invitations found for guest to test with');
        }
        
    } catch (error) {
        console.error('❌ Debug failed:', error.message);
    }
}

debugGuestPermissionIssue();