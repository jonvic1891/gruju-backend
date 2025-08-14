#!/usr/bin/env node

const fetch = require('node-fetch');
const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com';

async function testFixedChildCalendar() {
    try {
        console.log('🔍 TESTING FIXED CHILD CALENDAR');
        console.log('='.repeat(70));
        
        // Login as Emilia
        const emilaLogin = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'roberts10@example.com', password: 'test123' })
        }).then(r => r.json());
        
        console.log('✅ Logged in as Emilia');
        console.log(`   User: ${emilaLogin.user.username} (ID: ${emilaLogin.user.id})`);
        
        const dateRange = '?start=2025-07-31&end=2025-08-30';
        
        // Test the UPDATED /api/calendar/activities endpoint
        console.log('\n📅 TESTING UPDATED /api/calendar/activities endpoint:');
        const activitiesResponse = await fetch(`${API_BASE}/api/calendar/activities${dateRange}`, {
            headers: { 'Authorization': `Bearer ${emilaLogin.token}` }
        });
        
        console.log(`   Response status: ${activitiesResponse.status}`);
        if (activitiesResponse.ok) {
            const activities = await activitiesResponse.json();
            console.log(`   Success: ${activities.success}`);
            console.log(`   Activities found: ${activities.data?.length || 0}`);
            
            if (activities.data?.length > 0) {
                activities.data.forEach((activity, i) => {
                    console.log(`\n   ${i + 1}. "${activity.name}" (ID: ${activity.id})`);
                    console.log(`      - child_name: ${activity.child_name}`);
                    console.log(`      - is_host: ${activity.is_host}`);
                    console.log(`      - invitation_status: ${activity.invitation_status}`);
                    console.log(`      - is_shared: ${activity.is_shared}`);
                    console.log(`      - date: ${activity.start_date} at ${activity.start_time}`);
                    
                    if (activity.name === 'charlie 1') {
                        console.log(`      🎯 FOUND "charlie 1" activity!`);
                        if (activity.is_host === false && activity.invitation_status !== 'none') {
                            console.log(`      ✅ Correctly shows as invited activity (not owned)`);
                        } else if (activity.is_host === true) {
                            console.log(`      ⚠️  Shows as owned activity (might be correct if Emilia owns it)`);
                        }
                    }
                });
            } else {
                console.log('   ❌ No activities found');
            }
        } else {
            const errorText = await activitiesResponse.text();
            console.log(`   ❌ Error: ${errorText}`);
        }
        
        // Check Emilia's children to understand the filtering
        console.log('\n👶 EMILIA\'S CHILDREN:');
        const childrenResponse = await fetch(`${API_BASE}/api/children`, {
            headers: { 'Authorization': `Bearer ${emilaLogin.token}` }
        });
        
        if (childrenResponse.ok) {
            const children = await childrenResponse.json();
            console.log(`   Emilia has ${children.data?.length || 0} children:`);
            children.data?.forEach((child, i) => {
                console.log(`   ${i + 1}. ${child.name} (ID: ${child.id})`);
            });
        }
        
        console.log('\n🎯 SUMMARY:');
        console.log('The updated activities endpoint should now show:');
        console.log('1. Activities owned by Emilia\'s children (is_host: true)');
        console.log('2. Activities where Emilia\'s children are invited (is_host: false, invitation_status: pending/accepted)');
        console.log('3. "charlie 1" should appear if the invitation exists (pending or accepted)');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testFixedChildCalendar();