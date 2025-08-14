#!/usr/bin/env node

const fetch = require('node-fetch');
const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com';

async function checkInvitationData() {
    try {
        console.log('🔍 CHECKING INVITATION DATA IN DATABASE');
        console.log('=' .repeat(60));
        
        // Login as both users
        const senderLogin = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'roberts1@example.com', password: 'test123' })
        }).then(r => r.json());
        
        const recipientLogin = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'roberts@example.com', password: 'test123' })
        }).then(r => r.json());
        
        console.log(`Sender user ID: ${senderLogin.user.id}`);
        console.log(`Recipient user ID: ${recipientLogin.user.id}`);
        
        // Check recipient first (we know this works)
        console.log('\n📥 RECIPIENT VIEW (should work):');
        const today = new Date();
        const oneYearLater = new Date();
        oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
        const startDate = today.toISOString().split('T')[0];
        const endDate = oneYearLater.toISOString().split('T')[0];
        
        const recipientResponse = await fetch(`${API_BASE}/api/calendar/invitations?start=${startDate}&end=${endDate}&_t=${Date.now()}`, {
            headers: { 'Authorization': `Bearer ${recipientLogin.token}` }
        });
        const recipientData = await recipientResponse.json();
        
        console.log(`Recipient sees ${recipientData.data?.length || 0} invitations total`);
        const blahNew1FromRecipient = recipientData.data?.filter(inv => inv.activity_name === 'blah new 1') || [];
        
        if (blahNew1FromRecipient.length > 0) {
            const inv = blahNew1FromRecipient[0];
            console.log('\\n"blah new 1" invitation details (from recipient view):');
            console.log(`  Activity ID: ${inv.id}`);
            console.log(`  Invitation ID: ${inv.invitation_id}`);
            console.log(`  Host parent username: ${inv.host_parent_username}`);
            console.log(`  Invited child name: ${inv.invited_child_name}`);
            console.log(`  Status: ${inv.status}`);
        }
        
        // Check sender (after our fix)
        console.log('\n📤 SENDER VIEW (after fix):');
        const senderResponse = await fetch(`${API_BASE}/api/calendar/invitations?start=${startDate}&end=${endDate}&_t=${Date.now()}`, {
            headers: { 'Authorization': `Bearer ${senderLogin.token}` }
        });
        const senderData = await senderResponse.json();
        
        console.log(`Sender sees ${senderData.data?.length || 0} invitations total`);
        
        if (senderData.data?.length > 0) {
            console.log('\\nAll invitations sender can see:');
            senderData.data.forEach((inv, i) => {
                console.log(`  ${i + 1}. "${inv.activity_name}" - ${inv.status} - From: ${inv.host_parent_username} -> To: ${inv.invited_child_name}`);
            });
        }
        
        console.log('\n🎯 ANALYSIS:');
        if (recipientData.data?.length > 0 && senderData.data?.length === 0) {
            console.log('❌ The backend change may not be deployed yet');
            console.log('❌ OR the invitation was created with incorrect inviter_parent_id');
            console.log('❌ OR there is still an issue with the query logic');
            
            console.log('\n💡 NEXT STEPS:');
            console.log('1. Check if the backend server has restarted with new code');
            console.log('2. Check the actual inviter_parent_id value in the invitation');
            console.log('3. Test with a fresh invitation created after the fix');
        }
        
    } catch (error) {
        console.error('❌ Check failed:', error.message);
    }
}

checkInvitationData();