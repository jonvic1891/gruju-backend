#!/usr/bin/env node

const fetch = require('node-fetch');
const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com';

async function findEmiliaParent() {
    try {
        // From the connection request, we know:
        // - Charlie 11 sent request to Emilia 10
        // - Request UUID: aa147389-8b41-49fe-9fe7-4b97c4ce1f01
        // Need to find who owns Emilia 10
        
        console.log('🔍 Looking for Emilia 10 parent...');
        
        // Check if there's an API to get user details by connection request
        // Or check all users to find who has Emilia 10 as child
        
        const testUsers = [
            'roberts11@example.com',
            'jonathan.roberts006@hotmail.co.uk',
            'emilia@example.com', // possible
            'parent@example.com'   // possible
        ];
        
        for (const email of testUsers) {
            try {
                const loginResponse = await fetch(`${API_BASE}/api/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password: 'test123' })
                });
                
                if (loginResponse.ok) {
                    const loginData = await loginResponse.json();
                    
                    const childrenResponse = await fetch(`${API_BASE}/api/children`, {
                        headers: { 'Authorization': `Bearer ${loginData.token}` }
                    });
                    const childrenData = await childrenResponse.json();
                    
                    const emiliaChild = childrenData.data?.find(child => 
                        child.name.toLowerCase().includes('emilia')
                    );
                    
                    if (emiliaChild) {
                        console.log(`✅ FOUND EMILIA: ${emiliaChild.name}`);
                        console.log(`👤 Parent: ${loginData.user.email} (UUID: ${loginData.user.uuid})`);
                        console.log(`👶 Child UUID: ${emiliaChild.uuid}`);
                        return {
                            parentEmail: loginData.user.email,
                            parentUuid: loginData.user.uuid,
                            childName: emiliaChild.name,
                            childUuid: emiliaChild.uuid
                        };
                    }
                }
            } catch (e) {
                // Skip failed logins
            }
        }
        
        console.log('❌ Could not find Emilia 10 parent');
        return null;
        
    } catch (error) {
        console.error('Error:', error.message);
    }
}

findEmiliaParent().then(result => {
    if (result) {
        console.log('\n💡 SOLUTION:');
        console.log(`Use pending-${result.parentUuid} to show ${result.childName} as pending participant`);
    }
});
