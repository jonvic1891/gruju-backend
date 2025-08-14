#!/usr/bin/env node

const fetch = require('node-fetch');
const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com';

async function testUUIDMigration() {
    try {
        console.log('🔐 TESTING UUID MIGRATION');
        console.log('='.repeat(50));
        
        // Login to get access
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
        
        console.log('✅ Logged in successfully');
        console.log(`   User ID: ${loginResult.user.id} (sequential)`);
        console.log(`   User UUID: ${loginResult.user.uuid || 'NOT FOUND'} (should be UUID)`);
        
        // Test children endpoint for UUIDs
        const childrenResponse = await fetch(`${API_BASE}/api/children`, {
            headers: { 'Authorization': `Bearer ${loginResult.token}` }
        });
        
        const children = await childrenResponse.json();
        
        if (children.success && children.data?.length > 0) {
            console.log('\n👶 CHILDREN UUID TEST:');
            children.data.forEach((child, i) => {
                console.log(`   ${i + 1}. ${child.name}`);
                console.log(`      ID: ${child.id} (sequential)`);
                console.log(`      UUID: ${child.uuid || 'NOT FOUND'} (should be UUID)`);
            });
        }
        
        // Test activities endpoint for UUIDs
        const activitiesResponse = await fetch(`${API_BASE}/api/calendar/activities?start=2025-07-31&end=2025-08-30`, {
            headers: { 'Authorization': `Bearer ${loginResult.token}` }
        });
        
        const activities = await activitiesResponse.json();
        
        if (activities.success && activities.data?.length > 0) {
            console.log('\n📅 ACTIVITIES UUID TEST:');
            activities.data.slice(0, 2).forEach((activity, i) => {
                console.log(`   ${i + 1}. ${activity.name}`);
                console.log(`      ID: ${activity.id} (sequential)`);
                console.log(`      UUID: ${activity.uuid || 'NOT FOUND'} (should be UUID)`);
            });
        }
        
        console.log('\n🎯 MIGRATION STATUS:');
        const hasUserUUID = loginResult.user.uuid ? '✅' : '❌';
        const hasChildUUID = children.data?.[0]?.uuid ? '✅' : '❌';
        const hasActivityUUID = activities.data?.[0]?.uuid ? '✅' : '❌';
        
        console.log(`   Users have UUIDs: ${hasUserUUID}`);
        console.log(`   Children have UUIDs: ${hasChildUUID}`);
        console.log(`   Activities have UUIDs: ${hasActivityUUID}`);
        
        if (hasUserUUID === '✅' && hasChildUUID === '✅' && hasActivityUUID === '✅') {
            console.log('\n🎉 UUID MIGRATION SUCCESSFUL!');
            console.log('   Ready to proceed with API endpoint updates');
        } else {
            console.log('\n⚠️  UUID MIGRATION INCOMPLETE');
            console.log('   Some entities missing UUIDs - check migration logs');
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testUUIDMigration();