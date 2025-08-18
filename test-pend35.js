#!/usr/bin/env node

const fetch = require('node-fetch');

const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com';

async function testPend35() {
    try {
        console.log('🔍 TESTING PEND35 PENDING CONNECTIONS');
        console.log('='.repeat(50));
        
        // Login as host (you)
        const hostLoginResponse = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'jonathan.roberts006@hotmail.co.uk', password: 'test123' })
        });
        const hostLoginData = await hostLoginResponse.json();
        const hostToken = hostLoginData.token;
        
        // Get host child
        const hostChildrenResponse = await fetch(`${API_BASE}/api/children`, {
            headers: { 'Authorization': `Bearer ${hostToken}` }
        });
        const hostChildrenData = await hostChildrenResponse.json();
        const hostChild = hostChildrenData.data[0];
        
        console.log('✅ Host:', hostLoginData.user.email);
        console.log('👶 Host child:', hostChild.name);
        
        // Get activities and look for pend35
        const activitiesResponse = await fetch(`${API_BASE}/api/activities/${hostChild.uuid}`, {
            headers: { 'Authorization': `Bearer ${hostToken}` }
        });
        
        if (activitiesResponse.ok) {
            const activitiesData = await activitiesResponse.json();
            console.log('📋 Total activities:', activitiesData.data?.length || 0);
            
            // Find pend35
            const pend35 = activitiesData.data?.find(act => 
                act.name && act.name.toLowerCase().includes('pend35')
            );
            
            if (pend35) {
                console.log('\n🎯 FOUND "pend35":');
                console.log('- Name:', pend35.name);
                console.log('- UUID:', pend35.activity_uuid);
                console.log('- Has pending_connections field:', 'pending_connections' in pend35);
                console.log('- Pending connections:', JSON.stringify(pend35.pending_connections));
                console.log('- Pending connections count:', pend35.pending_connections?.length || 0);
                
                if (pend35.pending_connections && pend35.pending_connections.length > 0) {
                    console.log('✅ SUCCESS: pend35 HAS pending connections!');
                    pend35.pending_connections.forEach((key, i) => {
                        console.log(`  ${i + 1}. ${key}`);
                    });
                } else {
                    console.log('❌ ISSUE: pend35 has NO pending connections');
                    console.log('🔍 This means either:');
                    console.log('  1. No pending connections were saved when you created it');
                    console.log('  2. The pending connections were saved but not retrieved');
                }
            } else {
                console.log('❌ "pend35" not found in activities list');
                console.log('🔍 Activities with "pend" in name:');
                const pendActivities = activitiesData.data?.filter(act => 
                    act.name && act.name.toLowerCase().includes('pend')
                ) || [];
                pendActivities.slice(0, 5).forEach((act, i) => {
                    console.log(`  ${i + 1}. "${act.name}" (${act.pending_connections?.length || 0} pending)`);
                });
            }
            
        } else {
            console.log('❌ Failed to get activities');
        }
        
    } catch (error) {
        console.error('❌ Test error:', error.message);
    }
}

testPend35();