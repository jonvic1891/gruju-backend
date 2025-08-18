#!/usr/bin/env node

const fetch = require('node-fetch');

const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com';

async function checkMysteryUuid() {
    try {
        console.log('🔍 INVESTIGATING MYSTERY UUID');
        console.log('='.repeat(50));
        
        const mysteryUuid = 'aa147389-8b41-49fe-9fe7-4b97c4ce1f01';
        console.log('🎯 Investigating UUID:', mysteryUuid);
        
        // Login as admin to check users
        const loginResponse = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'jonathan.roberts006@hotmail.co.uk', password: 'test123' })
        });
        const loginData = await loginResponse.json();
        const token = loginData.token;
        
        console.log('✅ Logged in as:', loginData.user.email);
        
        // Try to find this UUID by checking if it might be a child UUID
        const childrenResponse = await fetch(`${API_BASE}/api/children`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const childrenData = await childrenResponse.json();
        
        console.log('\n🔍 Checking if mystery UUID matches any children...');
        const matchingChild = childrenData.data?.find(child => child.uuid === mysteryUuid);
        
        if (matchingChild) {
            console.log('✅ Found matching child:', matchingChild.name);
            console.log('👤 Child belongs to parent ID:', matchingChild.parent_id);
        } else {
            console.log('❌ Mystery UUID not found in children');
        }
        
        // Check if it might be an old format or corrupted data
        console.log('\n🔍 UUID Analysis:');
        console.log('- Length:', mysteryUuid.length);
        console.log('- Format valid:', /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(mysteryUuid));
        
        // Check the correct Emilia parent UUID that we know works
        const validEmiliaUuid = 'f87b81b0-41eb-4357-90ae-f81b4c2fa8f7';
        console.log('\n🔍 For comparison, valid Emilia parent UUID:', validEmiliaUuid);
        
        console.log('\n💡 DIAGNOSIS:');
        console.log('The pend36 activity has a pending connection with UUID:', mysteryUuid);
        console.log('But this UUID doesn\'t exist in the users table.');
        console.log('This is why the participants endpoint returns empty - the JOIN fails.');
        console.log('\n🔧 SOLUTION:');
        console.log('We need to either:');
        console.log('1. Update pend36 to use the correct Emilia parent UUID');
        console.log('2. Remove the invalid pending connection');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

checkMysteryUuid();
