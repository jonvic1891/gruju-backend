#!/usr/bin/env node

const fetch = require('node-fetch');
const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com';

async function testFreshInvitation() {
    try {
        console.log('🧪 TESTING FRESH INVITATION AFTER FIX');
        console.log('Creating a new invitation to test the fix');
        console.log('=' .repeat(60));
        
        // Login as sender (roberts1)
        const senderLogin = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'roberts1@example.com', password: 'test123' })
        }).then(r => r.json());
        
        // Login as recipient (roberts)
        const recipientLogin = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'roberts@example.com', password: 'test123' })
        }).then(r => r.json());
        
        console.log(`✅ Logged in as both users`);
        console.log(`Sender: ${senderLogin.user.username} (ID: ${senderLogin.user.id})`);
        console.log(`Recipient: ${recipientLogin.user.username} (ID: ${recipientLogin.user.id})`);
        
        // Get sender's child
        const senderChildren = await fetch(`${API_BASE}/api/children`, {
            headers: { 'Authorization': `Bearer ${senderLogin.token}` }
        }).then(r => r.json());
        const senderChild = senderChildren.data[0];
        
        // Get recipient's child (Emilia)
        const recipientChildren = await fetch(`${API_BASE}/api/children`, {
            headers: { 'Authorization': `Bearer ${recipientLogin.token}` }
        }).then(r => r.json());
        const emilia = recipientChildren.data.find(c => c.name === 'Emilia');
        
        console.log(`Sender child: ${senderChild.name} (ID: ${senderChild.id})`);
        console.log(`Recipient child: ${emilia.name} (ID: ${emilia.id})`);
        
        // Create a new test activity
        console.log('\n🎯 Step 1: Creating test activity...');
        const activityData = {
            name: 'Fresh Test Activity',
            description: 'Testing invitation visibility fix',
            start_date: '2025-08-15',
            end_date: '2025-08-15',
            start_time: '10:00',
            end_time: '12:00',
            location: 'Test Location',
            cost: '0',
            max_participants: '5',
            auto_notify_new_connections: false
        };
        
        const createResponse = await fetch(`${API_BASE}/api/activities/${senderChild.id}`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${senderLogin.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(activityData)
        });
        
        const createdActivity = await createResponse.json();
        if (!createdActivity.success) {
            throw new Error(`Failed to create activity: ${createdActivity.error}`);
        }
        
        console.log(`✅ Created activity: "${createdActivity.data.name}" (ID: ${createdActivity.data.id})`);
        
        // Send direct invitation (not through pending connection system)
        console.log('\n📧 Step 2: Sending direct invitation...');
        const inviteData = {
            invited_parent_id: recipientLogin.user.id,
            child_id: emilia.id,
            message: 'Testing fresh invitation after fix'
        };
        
        const inviteResponse = await fetch(`${API_BASE}/api/activities/${createdActivity.data.id}/invite`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${senderLogin.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(inviteData)
        });
        
        const inviteResult = await inviteResponse.json();
        if (!inviteResult.success) {
            throw new Error(`Failed to send invitation: ${inviteResult.error}`);
        }
        
        console.log('✅ Invitation sent successfully');
        
        // Wait a moment for processing
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Test both views
        const today = new Date();
        const oneYearLater = new Date();
        oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
        const startDate = today.toISOString().split('T')[0];
        const endDate = oneYearLater.toISOString().split('T')[0];
        
        console.log('\n📥 Step 3: Testing recipient view...');
        const recipientResponse = await fetch(`${API_BASE}/api/calendar/invitations?start=${startDate}&end=${endDate}&_t=${Date.now()}`, {
            headers: { 'Authorization': `Bearer ${recipientLogin.token}` }
        });
        const recipientData = await recipientResponse.json();
        
        const freshInviteRecipient = recipientData.data?.filter(inv => inv.activity_name === 'Fresh Test Activity') || [];
        console.log(`Recipient sees ${freshInviteRecipient.length} invitations for "Fresh Test Activity"`);
        
        console.log('\n📤 Step 4: Testing sender view (with fix)...');
        const senderResponse = await fetch(`${API_BASE}/api/calendar/invitations?start=${startDate}&end=${endDate}&_t=${Date.now()}`, {
            headers: { 'Authorization': `Bearer ${senderLogin.token}` }
        });
        const senderData = await senderResponse.json();
        
        const freshInviteSender = senderData.data?.filter(inv => inv.activity_name === 'Fresh Test Activity') || [];
        console.log(`Sender sees ${freshInviteSender.length} invitations for "Fresh Test Activity"`);
        
        console.log('\n' + '=' .repeat(60));
        console.log('🎯 FRESH INVITATION TEST RESULTS:');
        
        if (freshInviteRecipient.length > 0 && freshInviteSender.length > 0) {
            console.log('✅ SUCCESS! Backend fix is working');
            console.log('   - Recipient can see received invitation ✅');
            console.log('   - Sender can see sent invitation ✅');
            console.log('');
            console.log('🔍 This means the old "blah new 1" invitation has incorrect data');
            console.log('   - It was created before the fix');
            console.log('   - Or has wrong inviter_parent_id value');
        } else if (freshInviteRecipient.length > 0 && freshInviteSender.length === 0) {
            console.log('❌ Backend fix not deployed or still broken');
            console.log('   - Recipient can see received invitation ✅'); 
            console.log('   - Sender CANNOT see sent invitation ❌');
        } else {
            console.log('❌ Both views broken - major issue');
        }
        
        // Cleanup
        console.log('\n🧹 Cleaning up test activity...');
        await fetch(`${API_BASE}/api/activities/${createdActivity.data.id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${senderLogin.token}` }
        });
        console.log('✅ Cleanup complete');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testFreshInvitation();