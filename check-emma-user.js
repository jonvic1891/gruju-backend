#!/usr/bin/env node

const fetch = require('node-fetch');
const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com';

async function checkEmmaUser() {
    try {
        console.log('🔍 CHECKING EMMA USER');
        console.log('='.repeat(50));
        
        // Try different possible emails for Emma
        const possibleEmails = [
            'johnson@example.com',
            'emma@example.com', 
            'emma.johnson@example.com',
            'roberts1@example.com',
            'roberts2@example.com',
            'roberts3@example.com'
        ];
        
        for (const email of possibleEmails) {
            try {
                const loginResponse = await fetch(`${API_BASE}/api/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password: 'test123' })
                });
                
                const result = await loginResponse.json();
                
                if (result.success) {
                    console.log(`✅ Found user: ${email}`);
                    console.log(`   Username: ${result.user?.username}`);
                    console.log(`   ID: ${result.user?.id}`);
                    
                    // Check children
                    const childrenResponse = await fetch(`${API_BASE}/api/children`, {
                        headers: { 'Authorization': `Bearer ${result.token}` }
                    });
                    const children = await childrenResponse.json();
                    
                    if (children.success && children.data?.length > 1) {
                        console.log(`   Children: ${children.data.length}`);
                        children.data.forEach((child, i) => {
                            console.log(`     ${i + 1}. ${child.name} (ID: ${child.id})`);
                        });
                        
                        // This might be Emma with multiple children
                        if (children.data.length >= 2) {
                            console.log(`   🎯 This user has ${children.data.length} children - could be the one with duplicates!`);
                            return { email, user: result.user, token: result.token, children: children.data };
                        }
                    }
                } else {
                    console.log(`❌ Failed: ${email} - ${result.error || 'Unknown error'}`);
                }
            } catch (error) {
                console.log(`❌ Error: ${email} - ${error.message}`);
            }
        }
        
        console.log('\n📝 No users found with multiple children. Using charlie for testing...');
        
    } catch (error) {
        console.error('❌ Check failed:', error.message);
    }
}

checkEmmaUser();