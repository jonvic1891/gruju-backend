#!/usr/bin/env node

const fetch = require('node-fetch');
const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com';

async function findCorrectUUIDs() {
    try {
        console.log('🔍 FINDING CORRECT UUIDs FOR EMILIA');
        console.log('='.repeat(50));
        
        // Check both Emilia accounts
        const accounts = [
            { email: 'roberts10@example.com', name: 'Emilia 10' },
            { email: 'emilia@example.com', name: 'Emilia (if exists)' }
        ];
        
        const validUUIDs = [];
        
        for (const account of accounts) {
            try {
                const loginResponse = await fetch(`${API_BASE}/api/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: account.email, password: 'test123' })
                });
                
                if (loginResponse.ok) {
                    const loginData = await loginResponse.json();
                    
                    const childrenResponse = await fetch(`${API_BASE}/api/children`, {
                        headers: { 'Authorization': `Bearer ${loginData.token}` }
                    });
                    const childrenData = await childrenResponse.json();
                    
                    console.log(`✅ ${account.email}:`);
                    console.log(`   Parent UUID: ${loginData.user.uuid}`);
                    console.log('   Children:');
                    
                    childrenData.data?.forEach((child, i) => {
                        console.log(`     ${i + 1}. ${child.name} (UUID: ${child.uuid})`);
                    });
                    
                    validUUIDs.push({
                        email: account.email,
                        parentUuid: loginData.user.uuid,
                        children: childrenData.data || []
                    });
                    
                } else {
                    console.log(`❌ ${account.email}: Login failed`);
                }
            } catch (e) {
                console.log(`❌ ${account.email}: Error -`, e.message);
            }
        }
        
        console.log('\n💡 CORRECT PENDING CONNECTIONS SHOULD BE:');
        validUUIDs.forEach(account => {
            console.log(`- For ${account.email}: pending-${account.parentUuid}`);
        });
        
        console.log('\n❌ WRONG PENDING CONNECTIONS IN PEND40:');
        console.log('- pending-f68863b5-cda2-45fc-a426-008e06123db8 (unknown)');
        console.log('- pending-aa147389-8b41-49fe-9fe7-4b97c4ce1f01 (connection request UUID, not user UUID)');
        
        return validUUIDs;
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

findCorrectUUIDs();
