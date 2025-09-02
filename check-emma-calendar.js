const axios = require('axios');

const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com/api';

// Check Emma Johnson's calendar for rechost6 activities
async function checkEmmaCalendar() {
    try {
        console.log('🔍 Checking Emma Johnson\'s calendar for rechost6 activities...\n');

        // Login as johnson@example.com (Emma Johnson's parent)
        const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
            email: 'johnson@example.com',
            password: 'demo123'
        });

        if (!loginResponse.data.success) {
            console.error('❌ Login failed:', loginResponse.data.error);
            return;
        }

        const token = loginResponse.data.token;
        const headers = { 'Authorization': `Bearer ${token}` };

        console.log('✅ Logged in as johnson@example.com');

        // Get Emma Johnson's children
        const childrenResponse = await axios.get(`${API_BASE}/children`, { headers });
        const children = childrenResponse.data.data;
        console.log('👥 Johnson family children:', children.map(c => ({ name: c.name, uuid: c.uuid })));

        const emmaChild = children.find(c => c.name === 'Emma Johnson');
        if (!emmaChild) {
            console.error('❌ Emma Johnson not found in children');
            return;
        }

        console.log(`✅ Found Emma Johnson: ${emmaChild.uuid}`);

        // Get Emma's calendar activities
        const activitiesResponse = await axios.get(`${API_BASE}/calendar/activities?start=2025-09-01&end=2025-09-30`, { headers });
        
        if (activitiesResponse.data.success) {
            const activities = activitiesResponse.data.data;
            const emmaActivities = activities.filter(a => a.child_uuid === emmaChild.uuid);
            const rechost6Activities = emmaActivities.filter(a => a.name === 'rechost6');
            
            console.log(`📊 Emma Johnson's activities in September: ${emmaActivities.length} total`);
            console.log(`📊 Emma Johnson's rechost6 activities: ${rechost6Activities.length}`);
            
            if (rechost6Activities.length > 0) {
                console.log('✅ Emma Johnson has rechost6 activities in her calendar:');
                rechost6Activities.forEach((activity, index) => {
                    console.log(`  ${index + 1}. Date: ${activity.start_date}, UUID: ${activity.activity_uuid}`);
                    console.log(`     Is Host: ${activity.is_host ? 'Yes' : 'No'}`);
                    console.log(`     Status: ${activity.participation_status || 'Unknown'}`);
                    console.log(`     Created: ${activity.created_at}`);
                });
                
                console.log('\n🎉 SUCCESS: Emma Johnson received and has rechost6 activities!');
                console.log('✅ Joint host invitation functionality is working correctly');
                
            } else {
                console.error('❌ Emma Johnson does NOT have any rechost6 activities in her calendar');
                console.log('💡 This means she did not receive or accept invitations from Zoe Wong');
                
                // Check all of Emma's activities to see what she does have
                console.log('\n📋 All of Emma Johnson\'s activities in September:');
                emmaActivities.forEach((activity, index) => {
                    console.log(`  ${index + 1}. ${activity.name} on ${activity.start_date}`);
                    console.log(`     Host: ${activity.is_host ? 'Emma' : 'Someone else'}`);
                    console.log(`     Status: ${activity.participation_status || 'Unknown'}`);
                });
                
                if (emmaActivities.length === 0) {
                    console.log('  (No activities found)');
                }
            }
            
        } else {
            console.error('❌ Failed to fetch activities:', activitiesResponse.data);
        }

        // Also check pending invitations by trying different approaches
        console.log('\n🔍 Checking for pending invitations...');
        
        // Try to get notifications/pending items
        try {
            const notificationsResponse = await axios.get(`${API_BASE}/notifications`, { headers });
            if (notificationsResponse.data.success) {
                const notifications = notificationsResponse.data.data;
                const recentNotifications = notifications.filter(n => {
                    const notifyTime = new Date(n.created_at);
                    const oneHourAgo = new Date();
                    oneHourAgo.setHours(oneHourAgo.getHours() - 1);
                    return notifyTime > oneHourAgo && n.message && n.message.includes('rechost6');
                });
                
                console.log(`📧 Emma has ${recentNotifications.length} recent rechost6 notifications`);
                recentNotifications.forEach((notif, index) => {
                    console.log(`  ${index + 1}. ${notif.message}`);
                    console.log(`     Type: ${notif.type || 'Unknown'}`);
                    console.log(`     Created: ${notif.created_at}`);
                });
            }
        } catch (error) {
            console.log('❌ Could not check notifications:', error.response?.status || error.message);
        }

    } catch (error) {
        console.error('💥 Error:', error.response?.data || error.message);
    }
}

// Run the check
checkEmmaCalendar();