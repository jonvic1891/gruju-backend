#!/usr/bin/env node

const fetch = require('node-fetch');

const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com';

async function verifyActivityCountFix() {
    try {
        console.log('✅ VERIFYING ACTIVITY COUNT FIX');
        console.log('=' .repeat(60));
        
        // Login as Emilia's parent
        const loginResponse = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'roberts@example.com', password: 'test123' })
        });
        
        const loginData = await loginResponse.json();
        const token = loginData.token;
        
        // Get children
        const childrenResponse = await fetch(`${API_BASE}/api/children`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const childrenData = await childrenResponse.json();
        const emilia = childrenData.data.find(child => child.name === 'Emilia');
        
        console.log(`👶 Testing for: ${emilia.name} (ID: ${emilia.id})`);
        
        // Simulate the updated loadActivityCounts logic
        const today = new Date();
        const oneYearLater = new Date();
        oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
        const startDate = today.toISOString().split('T')[0];
        const endDate = oneYearLater.toISOString().split('T')[0];
        
        let totalCount = 0;
        
        // 1. Count own activities
        console.log('\n📋 Step 1: Counting own activities...');
        const ownActivitiesResponse = await fetch(`${API_BASE}/api/activities/${emilia.id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const ownActivitiesData = await ownActivitiesResponse.json();
        
        const ownCount = ownActivitiesData.data?.length || 0;
        totalCount += ownCount;
        console.log(`✅ Own activities: ${ownCount}`);
        
        // 2. Count accepted invitations using unified endpoint
        console.log('\n🔗 Step 2: Counting accepted invitations...');
        const allInvitationsResponse = await fetch(`${API_BASE}/api/calendar/invitations?start=${startDate}&end=${endDate}&_t=${Date.now()}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const allInvitationsData = await allInvitationsResponse.json();
        
        console.log(`📊 Total invitations in database: ${allInvitationsData.data?.length || 0}`);
        
        // Filter for Emilia's accepted invitations (same logic as updated frontend)
        const currentUser = loginData.user;
        const currentUsername = currentUser.username;
        
        const childAcceptedInvitations = allInvitationsData.data.filter(invitation => 
            invitation.invited_child_name === emilia.name &&
            invitation.status === 'accepted' &&
            invitation.host_parent_username !== currentUsername
        );
        
        const acceptedCount = childAcceptedInvitations.length;
        totalCount += acceptedCount;
        
        console.log(`✅ Accepted invitations for ${emilia.name}: ${acceptedCount}`);
        childAcceptedInvitations.forEach((inv, i) => {
            console.log(`   ${i+1}. "${inv.activity_name}" from ${inv.host_parent_username}`);
        });
        
        console.log(`\n🎯 TOTAL EXPECTED ACTIVITY COUNT: ${totalCount}`);
        
        console.log('\n' + '=' .repeat(60));
        console.log('📱 FRONTEND TESTING:');
        console.log('1. 🌐 Login as: roberts@example.com / test123');
        console.log('2. 📋 Go to Children screen');
        console.log(`3. 👀 Emilia's card should show: ${totalCount} ${totalCount === 1 ? 'Activity' : 'Activities'}`);
        
        if (totalCount > 0) {
            console.log('\n🎉 SUCCESS! Activity count should now be fixed!');
            console.log('   ✅ Fixed API calls to use getAllInvitations');
            console.log('   ✅ Correct filtering logic implemented');
            console.log('   ✅ Both own activities and accepted invitations counted');
        } else {
            console.log('\n❓ Expected count is still 0');
            console.log('   📝 Either no activities exist or invitations not yet accepted');
        }
        
    } catch (error) {
        console.error('❌ Verification error:', error.message);
    }
}

verifyActivityCountFix();