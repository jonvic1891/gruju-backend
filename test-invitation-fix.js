#!/usr/bin/env node

const fetch = require('node-fetch');
const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com';

async function testInvitationFix() {
    try {
        console.log('🧪 TESTING INVITATION VISIBILITY FIX');
        console.log('=' .repeat(60));
        
        // Login as roberts1 (sender)
        const senderLoginResponse = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'roberts1@example.com', password: 'test123' })
        });
        const senderLogin = await senderLoginResponse.json();
        console.log('✅ Logged in as roberts1 (sender)');
        
        // Test the fixed endpoint
        const today = new Date();
        const oneYearLater = new Date();
        oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
        const startDate = today.toISOString().split('T')[0];
        const endDate = oneYearLater.toISOString().split('T')[0];
        
        console.log('\n📤 TESTING SENDER\'S VIEW (after fix):');
        const senderInvitationsResponse = await fetch(`${API_BASE}/api/calendar/invitations?start=${startDate}&end=${endDate}&_t=${Date.now()}`, {
            headers: { 'Authorization': `Bearer ${senderLogin.token}` }
        });
        const senderInvitations = await senderInvitationsResponse.json();
        
        console.log(`Total invitations visible to sender: ${senderInvitations.data?.length || 0}`);
        
        if (senderInvitations.data?.length > 0) {
            console.log('\nInvitations:');
            senderInvitations.data.forEach((inv, i) => {
                console.log(`  ${i + 1}. "${inv.activity_name}" - Status: ${inv.status}`);
                console.log(`      From: ${inv.host_parent_username} -> To: ${inv.invited_child_name}`);
                console.log(`      Invitation ID: ${inv.invitation_id}`);
            });
        }
        
        // Check specifically for "blah new 1"
        const blahNew1Invitations = senderInvitations.data?.filter(inv => 
            inv.activity_name === 'blah new 1'
        ) || [];
        
        console.log('\n🎯 RESULT:');
        if (blahNew1Invitations.length > 0) {
            console.log('✅ SUCCESS! Sender can now see sent invitations for "blah new 1"');
            console.log(`   Found ${blahNew1Invitations.length} invitation(s)`);
            blahNew1Invitations.forEach(inv => {
                console.log(`   - Status: ${inv.status} -> ${inv.invited_child_name}`);
            });
        } else {
            console.log('❌ STILL BROKEN: Sender cannot see sent invitations for "blah new 1"');
        }
        
        // Also test recipient's view to make sure we didn't break anything
        console.log('\n📥 TESTING RECIPIENT\'S VIEW (should still work):');
        const recipientLoginResponse = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'roberts@example.com', password: 'test123' })
        });
        const recipientLogin = await recipientLoginResponse.json();
        
        const recipientInvitationsResponse = await fetch(`${API_BASE}/api/calendar/invitations?start=${startDate}&end=${endDate}&_t=${Date.now()}`, {
            headers: { 'Authorization': `Bearer ${recipientLogin.token}` }
        });
        const recipientInvitations = await recipientInvitationsResponse.json();
        
        const recipientBlahNew1 = recipientInvitations.data?.filter(inv => 
            inv.activity_name === 'blah new 1'
        ) || [];
        
        console.log(`Recipient sees ${recipientBlahNew1.length} invitations for "blah new 1"`);
        if (recipientBlahNew1.length > 0) {
            console.log('✅ Recipient view still works correctly');
        } else {
            console.log('❌ BROKE RECIPIENT VIEW!');
        }
        
        console.log('\n' + '=' .repeat(60));
        if (blahNew1Invitations.length > 0 && recipientBlahNew1.length > 0) {
            console.log('🎉 INVITATION VISIBILITY FIX SUCCESSFUL!');
            console.log('   - Senders can now see their sent invitations ✅');
            console.log('   - Recipients can still see their received invitations ✅');
            console.log('   - The activity should now show invited children correctly ✅');
        } else {
            console.log('❌ FIX INCOMPLETE - needs more work');
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testInvitationFix();