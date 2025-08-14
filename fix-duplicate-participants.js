#!/usr/bin/env node

const fetch = require('node-fetch');
const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com';

async function fixDuplicateParticipants() {
    try {
        console.log('🔧 FIXING DUPLICATE PARTICIPANTS');
        console.log('='.repeat(70));
        
        // Login as admin to access database
        const adminLogin = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'roberts11@example.com', password: 'test123' })
        }).then(r => r.json());
        
        console.log('✅ Logged in as Charlie (admin)');
        
        // Create a cleanup endpoint call
        console.log('\n🧹 CLEANING UP DUPLICATE PARTICIPANTS...');
        
        const cleanupResponse = await fetch(`${API_BASE}/api/admin/cleanup-pending-invitations`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${adminLogin.token}`,
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify({
                action: 'remove_duplicates',
                description: 'Remove pending_activity_invitations that have corresponding activity_invitations'
            })
        });
        
        if (cleanupResponse.ok) {
            const result = await cleanupResponse.json();
            console.log('✅ Cleanup result:', result);
        } else {
            const errorText = await cleanupResponse.text();
            console.log('❌ Cleanup failed:', errorText);
            
            // If the admin endpoint doesn't exist, let's create it
            console.log('\n🔨 Need to create the cleanup endpoint first...');
        }
        
    } catch (error) {
        console.error('❌ Fix failed:', error.message);
    }
}

fixDuplicateParticipants();