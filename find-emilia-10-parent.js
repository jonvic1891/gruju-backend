#!/usr/bin/env node

const fetch = require('node-fetch');
const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com';

async function findEmilia10Parent() {
    try {
        console.log('🔍 Finding Emilia 10 parent (roberts10@example.com)');
        
        // Login as roberts10@example.com (Emilia 10's parent)
        const loginResponse = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'roberts10@example.com', password: 'test123' })
        });
        
        if (!loginResponse.ok) {
            console.log('❌ Failed to login as roberts10@example.com');
            return null;
        }
        
        const loginData = await loginResponse.json();
        console.log('✅ roberts10@example.com login successful');
        console.log('👤 Parent UUID:', loginData.user.uuid);
        console.log('👤 User ID:', loginData.user.id);
        
        // Get children
        const childrenResponse = await fetch(`${API_BASE}/api/children`, {
            headers: { 'Authorization': `Bearer ${loginData.token}` }
        });
        const childrenData = await childrenResponse.json();
        
        console.log('👶 Children:');
        childrenData.data?.forEach((child, i) => {
            console.log(`  ${i + 1}. ${child.name} (UUID: ${child.uuid})`);
        });
        
        const emiliaChild = childrenData.data?.find(child => 
            child.name.toLowerCase().includes('emilia')
        );
        
        if (emiliaChild) {
            console.log('\n🎯 FOUND EMILIA 10:');
            console.log('👤 Parent email: roberts10@example.com');
            console.log('👤 Parent UUID:', loginData.user.uuid);
            console.log('👶 Child name:', emiliaChild.name);
            console.log('👶 Child UUID:', emiliaChild.uuid);
            
            return {
                parentEmail: 'roberts10@example.com',
                parentUuid: loginData.user.uuid,
                childName: emiliaChild.name,
                childUuid: emiliaChild.uuid
            };
        } else {
            console.log('❌ No Emilia child found');
            return null;
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        return null;
    }
}

findEmilia10Parent().then(result => {
    if (result) {
        console.log('\n💡 CORRECT PENDING CONNECTION:');
        console.log(`pending-${result.parentUuid}`);
        console.log(`This will show ${result.childName} as pending participant for Charlie 11's activities`);
    }
});
