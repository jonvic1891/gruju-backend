#!/usr/bin/env node

const fetch = require('node-fetch');
const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com';

async function testFrontendFiltering() {
    try {
        console.log('🧪 TESTING FRONTEND FILTERING LOGIC');
        console.log('='.repeat(70));
        
        // Login as Emilia
        const emilaLogin = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'roberts10@example.com', password: 'test123' })
        }).then(r => r.json());
        
        console.log('✅ Logged in as Emilia');
        
        // Get Emilia's children
        const childrenResponse = await fetch(`${API_BASE}/api/children`, {
            headers: { 'Authorization': `Bearer ${emilaLogin.token}` }
        });
        
        const children = await childrenResponse.json();
        const child = children.data[0]; // Emilia's child
        console.log(`👶 Testing for child: ${child.name} (ID: ${child.id})`);
        
        // Get activities
        const dateRange = '?start=2025-07-31&end=2025-08-30';
        const activitiesResponse = await fetch(`${API_BASE}/api/calendar/activities${dateRange}`, {
            headers: { 'Authorization': `Bearer ${emilaLogin.token}` }
        });
        
        const activities = await activitiesResponse.json();
        const allActivities = activities.data || [];
        
        console.log(`\n📅 ALL ACTIVITIES FROM API: ${allActivities.length}`);
        allActivities.forEach((activity, i) => {
            console.log(`   ${i + 1}. "${activity.name}" - child_id: ${activity.child_id}, invited_child_id: ${activity.invited_child_id}, status: ${activity.invitation_status}`);
        });
        
        // Apply frontend filtering logic
        console.log(`\n🔍 APPLYING FRONTEND FILTERING (child.id = ${child.id}):`);
        const childActivities = allActivities.filter(activity => {
            const ownsActivity = activity.child_id === child.id;
            const isInvited = activity.invited_child_id === child.id && 
                             activity.invitation_status && 
                             activity.invitation_status !== 'none';
            
            const shouldInclude = ownsActivity || isInvited;
            
            console.log(`   "${activity.name}":`);
            console.log(`      - Owns activity: ${ownsActivity} (${activity.child_id} === ${child.id})`);
            console.log(`      - Is invited: ${isInvited} (${activity.invited_child_id} === ${child.id} && status: ${activity.invitation_status})`);
            console.log(`      - Should include: ${shouldInclude}`);
            
            return shouldInclude;
        });
        
        console.log(`\n✅ FILTERED ACTIVITIES FOR ${child.name}: ${childActivities.length}`);
        childActivities.forEach((activity, i) => {
            console.log(`   ${i + 1}. "${activity.name}" - ${activity.is_host ? 'OWNED' : 'INVITED'} (${activity.invitation_status})`);
        });
        
        console.log('\n🎯 RESULT:');
        if (childActivities.some(a => a.name === 'charlie 1')) {
            console.log('✅ SUCCESS: "charlie 1" will show in child calendar!');
        } else {
            console.log('❌ PROBLEM: "charlie 1" will NOT show in child calendar');
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testFrontendFiltering();