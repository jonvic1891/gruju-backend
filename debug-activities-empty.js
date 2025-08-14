#!/usr/bin/env node

const fetch = require('node-fetch');
const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com';

async function debugActivitiesEmpty() {
    try {
        console.log('🔍 DEBUGGING EMPTY ACTIVITIES API RESPONSE');
        console.log('='.repeat(70));
        
        // Login as both users to test both perspectives
        const user10Login = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'roberts10@example.com', password: 'test123' })
        }).then(r => r.json());
        
        const user11Login = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'roberts11@example.com', password: 'test123' })
        }).then(r => r.json());
        
        if (!user10Login.success || !user11Login.success) {
            console.log('❌ Login failed');
            return;
        }
        
        console.log('✅ Logged in as both users');
        console.log(`   User 10 (Emilia): ${user10Login.user.username} (ID: ${user10Login.user.id})`);
        console.log(`   User 11 (Charlie): ${user11Login.user.username} (ID: ${user11Login.user.id})`);
        
        // Test /api/calendar/activities for both users
        const dateRange = '?start=2025-07-31&end=2025-08-30';
        
        console.log('\n📅 TESTING /api/calendar/activities endpoint:');
        
        // Test User 11 (Charlie) - should have "charlie 1" activity
        console.log('\n1️⃣ User 11 (Charlie) activities:');
        const user11ActivitiesResponse = await fetch(`${API_BASE}/api/calendar/activities${dateRange}`, {
            headers: { 'Authorization': `Bearer ${user11Login.token}` }
        });
        
        console.log(`   Response status: ${user11ActivitiesResponse.status}`);
        if (user11ActivitiesResponse.ok) {
            const user11Activities = await user11ActivitiesResponse.json();
            console.log(`   Success: ${user11Activities.success}`);
            console.log(`   Data length: ${user11Activities.data?.length || 0}`);
            
            if (user11Activities.data?.length > 0) {
                user11Activities.data.forEach((activity, i) => {
                    console.log(`      ${i + 1}. "${activity.name}" (ID: ${activity.id}) - is_shared: ${activity.is_shared}`);
                });
            } else {
                console.log('   ❌ No activities found for User 11');
            }
        } else {
            const errorText = await user11ActivitiesResponse.text();
            console.log(`   ❌ Error: ${errorText}`);
        }
        
        // Test User 10 (Emilia) - might be empty if she doesn't have activities
        console.log('\n2️⃣ User 10 (Emilia) activities:');
        const user10ActivitiesResponse = await fetch(`${API_BASE}/api/calendar/activities${dateRange}`, {
            headers: { 'Authorization': `Bearer ${user10Login.token}` }
        });
        
        console.log(`   Response status: ${user10ActivitiesResponse.status}`);
        if (user10ActivitiesResponse.ok) {
            const user10Activities = await user10ActivitiesResponse.json();
            console.log(`   Success: ${user10Activities.success}`);
            console.log(`   Data length: ${user10Activities.data?.length || 0}`);
            
            if (user10Activities.data?.length > 0) {
                user10Activities.data.forEach((activity, i) => {
                    console.log(`      ${i + 1}. "${activity.name}" (ID: ${activity.id}) - is_shared: ${activity.is_shared}`);
                });
            } else {
                console.log('   ✅ User 10 has no owned activities (expected)');
            }
        } else {
            const errorText = await user10ActivitiesResponse.text();
            console.log(`   ❌ Error: ${errorText}`);
        }
        
        // Test /api/calendar/invitations for User 10 (should have accepted invitations)
        console.log('\n3️⃣ User 10 (Emilia) invitations:');
        const user10InvitationsResponse = await fetch(`${API_BASE}/api/calendar/invitations${dateRange}`, {
            headers: { 'Authorization': `Bearer ${user10Login.token}` }
        });
        
        console.log(`   Response status: ${user10InvitationsResponse.status}`);
        if (user10InvitationsResponse.ok) {
            const user10Invitations = await user10InvitationsResponse.json();
            console.log(`   Success: ${user10Invitations.success}`);
            console.log(`   Invitations length: ${user10Invitations.data?.length || 0}`);
            
            if (user10Invitations.data?.length > 0) {
                user10Invitations.data.forEach((inv, i) => {
                    console.log(`      ${i + 1}. "${inv.activity_name}" (ID: ${inv.id}) - Status: ${inv.status}`);
                    if (inv.status === 'accepted') {
                        console.log(`         ✅ This should appear in child calendar`);
                    }
                });
            } else {
                console.log('   ❌ No invitations found for User 10');
            }
        } else {
            const errorText = await user10InvitationsResponse.text();
            console.log(`   ❌ Error: ${errorText}`);
        }
        
        // Check backend logs
        console.log('\n🔍 BACKEND ANALYSIS:');
        console.log('If activities API is returning empty, possible causes:');
        console.log('1. Database connection issues');
        console.log('2. Migration broke something');
        console.log('3. Query syntax error in recent changes');
        console.log('4. Authentication issues');
        console.log('5. is_shared column migration issues');
        
    } catch (error) {
        console.error('❌ Debug failed:', error.message);
    }
}

debugActivitiesEmpty();