#!/usr/bin/env node

const fetch = require('node-fetch');

const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com';

async function identifyCorrectInvitedUser() {
    try {
        console.log('🔍 IDENTIFYING CORRECT INVITED USER');
        console.log('='.repeat(50));
        
        // Check who the host is (pend36 owner)
        const hostLoginResponse = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'roberts11@example.com', password: 'test123' })
        });
        const hostLoginData = await hostLoginResponse.json();
        
        console.log('✅ Host (pend36 owner):');
        console.log('- Email:', hostLoginData.user.email);
        console.log('- UUID:', hostLoginData.user.uuid);
        console.log('- User ID:', hostLoginData.user.id);
        
        // Check who the other user is (should be the invited person)
        const invitedLoginResponse = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'jonathan.roberts006@hotmail.co.uk', password: 'test123' })
        });
        const invitedLoginData = await invitedLoginResponse.json();
        
        console.log('\n✅ Other user (should be invited):');
        console.log('- Email:', invitedLoginData.user.email);
        console.log('- UUID:', invitedLoginData.user.uuid);
        console.log('- User ID:', invitedLoginData.user.id);
        
        console.log('\n💡 ANALYSIS:');
        console.log('The pend36 activity is owned by:', hostLoginData.user.email);
        console.log('So the pending invitation should be FOR:', invitedLoginData.user.email);
        console.log('But currently we have pending connection for:', hostLoginData.user.email, '(the host!)');
        
        console.log('\n🔧 CORRECT SETUP:');
        console.log('Current pending key: pending-' + hostLoginData.user.uuid, '(WRONG - this is the host)');
        console.log('Should be pending key: pending-' + invitedLoginData.user.uuid, '(CORRECT - this is the invited person)');
        
        return {
            hostUuid: hostLoginData.user.uuid,
            invitedUuid: invitedLoginData.user.uuid,
            hostEmail: hostLoginData.user.email,
            invitedEmail: invitedLoginData.user.email
        };
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

identifyCorrectInvitedUser();
