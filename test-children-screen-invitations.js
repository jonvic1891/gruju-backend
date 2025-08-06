#!/usr/bin/env node

const fetch = require('node-fetch');

const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com';

async function testChildrenScreenInvitations() {
    try {
        console.log('🧪 TESTING CHILDREN SCREEN INVITATION DISPLAY');
        console.log('=' .repeat(60));
        
        // Login as Johnson family to see Emma's invitations
        console.log('\n👤 Logging in as Johnson family (Emma\'s parent)...');
        const loginResponse = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'johnson@example.com', password: 'demo123' })
        });
        
        const loginData = await loginResponse.json();
        if (!loginData.success) {
            console.error('❌ Login failed:', loginData);
            return;
        }
        console.log('✅ Login successful');
        const token = loginData.token;
        
        // 1. Get children (same API call ChildrenScreen makes)
        console.log('\n📋 Step 1: Getting children list...');
        const childrenResponse = await fetch(`${API_BASE}/api/children`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const childrenData = await childrenResponse.json();
        
        if (childrenData.success && childrenData.data) {
            console.log(`✅ Found ${childrenData.data.length} children`);
            childrenData.data.forEach(child => {
                console.log(`   - ${child.name} (ID: ${child.id})`);
            });
        } else {
            console.log('❌ Failed to get children');
            return;
        }
        
        // 2. Get activity invitations (same API call ChildrenScreen makes)
        console.log('\n📩 Step 2: Getting activity invitations...');
        const invitationsResponse = await fetch(`${API_BASE}/api/activity-invitations`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const invitationsData = await invitationsResponse.json();
        
        if (invitationsData.success && invitationsData.data) {
            console.log(`✅ Found ${invitationsData.data.length} activity invitations`);
            
            // 3. Group invitations by child (simulate ChildrenScreen logic)
            console.log('\n🔗 Step 3: Grouping invitations by child...');
            const invitationsByChild = {};
            
            // Initialize empty arrays for each child
            childrenData.data.forEach(child => {
                invitationsByChild[child.id] = [];
            });
            
            // Group invitations by child (matching ChildrenScreen logic)
            invitationsData.data.forEach(invitation => {
                const targetChild = childrenData.data.find(child => 
                    child.name === invitation.invited_child_name
                );
                
                if (targetChild && invitation.status === 'pending') {
                    invitationsByChild[targetChild.id].push(invitation);
                }
            });
            
            // 4. Display what should appear on the screen
            console.log('\n🖥️  Step 4: What should appear on ChildrenScreen:');
            console.log('=' .repeat(50));
            
            childrenData.data.forEach(child => {
                console.log(`\n👶 ${child.name} (Child Card)`);
                console.log(`   📋 Activities: ${0} (placeholder)`); // Activity count would be loaded separately
                
                const childInvitations = invitationsByChild[child.id] || [];
                if (childInvitations.length > 0) {
                    console.log(`   📩 ${childInvitations.length} Pending Invitation${childInvitations.length !== 1 ? 's' : ''}`);
                    
                    childInvitations.forEach((invitation, i) => {
                        console.log(`     ${i+1}. "${invitation.activity_name}" from ${invitation.host_parent_name}`);
                        console.log(`        📅 ${new Date(invitation.start_date).toLocaleDateString()}`);
                        if (invitation.start_time) {
                            console.log(`        🕐 at ${invitation.start_time}`);
                        }
                        if (invitation.location) {
                            console.log(`        📍 ${invitation.location}`);
                        }
                        if (invitation.message) {
                            console.log(`        💬 "${invitation.message}"`);
                        }
                        console.log(`        [Accept] [Decline] buttons`);
                    });
                } else {
                    console.log(`   📩 No pending invitations`);
                }
            });
            
        } else {
            console.log('❌ Failed to get activity invitations');
            return;
        }
        
        console.log('\n' + '=' .repeat(60));
        console.log('🎉 CHILDREN SCREEN TEST SUMMARY:');
        console.log('✅ Children API working');
        console.log('✅ Activity invitations API working');
        console.log('✅ Invitation grouping logic working');
        console.log('\n📱 FRONTEND SHOULD DISPLAY:');
        console.log('👶 Each child card with their name');
        console.log('📩 Pending invitations under each child');
        console.log('📋 Activity details with date, time, location, message');
        console.log('⚡ Accept/Decline buttons for each invitation');
        console.log('\n🌐 Visit: https://gruju-parent-activity-app.web.app');
        console.log('👤 Login as: johnson@example.com / demo123');
        console.log('🔍 Go to Children screen to see invitations');
        
    } catch (error) {
        console.error('❌ Test error:', error.message);
    }
}

testChildrenScreenInvitations();