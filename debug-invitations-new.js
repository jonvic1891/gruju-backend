const axios = require('axios');

const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com/api';

// Debug why invitations are being sent but Emma isn't getting activities
async function debugInvitationStatus() {
    try {
        console.log('🔍 DEBUGGING INVITATION STATUS\n');

        // Create a test activity and invitation
        console.log('📝 Creating test invitation...');
        
        const wongLogin = await axios.post(`${API_BASE}/auth/login`, {
            email: 'wong@example.com',
            password: 'demo123'
        });
        const wongToken = wongLogin.data.token;
        const wongHeaders = { 'Authorization': `Bearer ${wongToken}` };

        const children = (await axios.get(`${API_BASE}/children`, { headers: wongHeaders })).data.data;
        const zoewongChild = children.find(c => c.name === 'Zoe Wong');

        const zoeConnections = (await axios.get(`${API_BASE}/connections/${zoewongChild.uuid}`, { headers: wongHeaders })).data.data;
        const emmaConnection = zoeConnections.find(c => c.name?.includes('Emma Johnson'));

        console.log('📊 Emma Johnson connection data:', emmaConnection);

        // Create a simple activity
        const testName = `InviteDebug-${Date.now()}`;
        const today = new Date();
        const nextWeek = new Date(today);
        nextWeek.setDate(today.getDate() + 7);
        
        const activityData = {
            name: testName,
            description: 'Debug invitation status',
            start_date: nextWeek.toISOString().split('T')[0],
            end_date: nextWeek.toISOString().split('T')[0],
            start_time: '15:00',
            end_time: '16:00',
            location: 'Debug Location',
            is_shared: true,
            auto_notify_new_connections: false,
            is_recurring: false
        };

        const createResponse = await axios.post(`${API_BASE}/activities/${zoewongChild.uuid}`, activityData, { headers: wongHeaders });
        
        if (!createResponse.data.success) {
            console.error('❌ Activity creation failed');
            return;
        }

        const activity = createResponse.data.data;
        console.log('✅ Created test activity:', activity.uuid);

        // Send invitation
        console.log('\n📝 Sending invitation...');
        try {
            const inviteResponse = await axios.post(`${API_BASE}/activities/${activity.uuid}/invite`, {
                invited_parent_uuid: emmaConnection.parentuuid,
                child_uuid: emmaConnection.connected_child_uuid,
                message: 'Debug invitation test'
            }, { headers: wongHeaders });
            
            console.log('✅ Invitation sent successfully:', inviteResponse.data);
        } catch (error) {
            console.error('❌ Invitation failed:', error.response?.data || error.message);
            return;
        }

        // Wait a moment
        console.log('\n⏱️ Waiting 2 seconds...');
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Check Emma's perspective
        console.log('📝 Checking Emma Johnson\'s account...');
        
        const johnsonLogin = await axios.post(`${API_BASE}/auth/login`, {
            email: 'johnson@example.com',
            password: 'demo123'
        });
        const johnsonToken = johnsonLogin.data.token;
        const johnsonHeaders = { 'Authorization': `Bearer ${johnsonToken}` };

        const johnsonChildren = (await axios.get(`${API_BASE}/children`, { headers: johnsonHeaders })).data.data;
        const emmaChild = johnsonChildren.find(c => c.name === 'Emma Johnson');
        
        console.log('📊 Emma Johnson child data:', { name: emmaChild.name, uuid: emmaChild.uuid });

        // Check Emma's activities  
        const startDate = nextWeek.toISOString().split('T')[0];
        const endDate = nextWeek.toISOString().split('T')[0];
        const activitiesResponse = await axios.get(`${API_BASE}/calendar/activities?start=${startDate}&end=${endDate}`, { headers: johnsonHeaders });
        
        if (activitiesResponse.data.success) {
            const activities = activitiesResponse.data.data;
            const emmaActivities = activities.filter(a => a.child_uuid === emmaChild.uuid);
            const testActivity = emmaActivities.find(a => a.name === testName);
            
            console.log(`📊 Emma has ${emmaActivities.length} activities on ${startDate}`);
            
            if (testActivity) {
                console.log('✅ SUCCESS: Test activity found in Emma\'s calendar!');
                console.log('🎉 This means invitations ARE working correctly');
                console.log('🤔 The recurring issue might be elsewhere...');
            } else {
                console.log('❌ Test activity NOT found in Emma\'s calendar');
                console.log('🤔 This suggests invitations are not being processed properly');
            }
        }

    } catch (error) {
        console.error('💥 Debug error:', error.response?.data || error.message);
    }
}

// Run the debug
debugInvitationStatus();