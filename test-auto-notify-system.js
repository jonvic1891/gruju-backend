const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com';

async function testAutoNotifySystem() {
    console.log('🧪 Testing auto-notification system...');
    
    try {
        // Login as davis 
        const loginResponse = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'davis@example.com',
                password: 'demo123'
            })
        });
        
        const loginData = await loginResponse.json();
        const token = loginData.token;
        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
        
        console.log('✅ Logged in as davis@example.com');
        
        // Get children
        const childrenResponse = await fetch(`${API_BASE}/api/children`, {
            headers
        });
        const childrenData = await childrenResponse.json();
        const children = childrenData.data || childrenData;
        const child = children[0];
        
        console.log('📋 Using child:', child.name, child.uuid);
        
        // Create activity with auto_notify_new_connections: true
        const activityData = {
            name: `Auto Notify Test ${Date.now()}`,
            description: 'Testing auto notification system',
            start_date: '2025-08-26',
            end_date: '2025-08-26',
            start_time: '14:00',
            end_time: '16:00',
            location: 'Auto Notify Location',
            website_url: '',
            auto_notify_new_connections: true, // This is the key difference!
            is_shared: true
        };
        
        console.log('\n🔍 Creating activity with auto_notify_new_connections: true...');
        const createResponse = await fetch(`${API_BASE}/api/activities/${child.uuid}`, {
            method: 'POST',
            headers,
            body: JSON.stringify(activityData)
        });
        
        if (!createResponse.ok) {
            console.log(`❌ Activity creation failed: ${createResponse.status}`);
            const errorData = await createResponse.json();
            console.log('Error:', errorData);
            return;
        }
        
        const activityResult = await createResponse.json();
        const activity = activityResult.data;
        console.log('✅ Created activity with auto-notify enabled:', activity.name);
        console.log('   UUID:', activity.uuid);
        console.log('   Auto-notify:', activity.auto_notify_new_connections);
        
        // Now create a connection request from davis to someone and accept it to trigger auto-notifications
        console.log('\n💡 To test auto-notifications properly, you would need to:');
        console.log('1. Create a connection request from another user to davis');
        console.log('2. Accept that connection request');
        console.log('3. The system should automatically send an invitation for this new activity');
        console.log('4. The receiving user should get a notification about this new activity, not old ones');
        
        console.log('\n✅ The activity is now ready for auto-notifications');
        console.log('🎯 When someone accepts a connection with davis, they should receive:');
        console.log(`   "davis invited you to "${activity.name}" on 26/08/2025 at 14:00:00-16:00:00"`);
        console.log('   Instead of old activities like "pend40"');
        
        return {
            activityUuid: activity.uuid,
            activityName: activity.name,
            childUuid: child.uuid,
            childName: child.name
        };
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

testAutoNotifySystem().catch(console.error);