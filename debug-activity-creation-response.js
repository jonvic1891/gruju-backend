const axios = require('axios');

const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com/api';

// Debug the activity creation response to see exact structure
async function debugActivityCreation() {
    try {
        console.log('🔍 Debugging activity creation API response...\n');

        // Login as wong@example.com
        const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
            email: 'wong@example.com',
            password: 'demo123'
        });

        const token = loginResponse.data.token;
        const headers = { 'Authorization': `Bearer ${token}` };

        const children = (await axios.get(`${API_BASE}/children`, { headers })).data.data;
        const miawongChild = children.find(c => c.name === 'Mia Wong');
        const zoewongChild = children.find(c => c.name === 'Zoe Wong');

        // Create a simple joint host activity
        const testName = `DebugTest-${Date.now()}`;
        const today = new Date();
        const nextWeek = new Date(today);
        nextWeek.setDate(today.getDate() + 7);
        
        const activityData = {
            name: testName,
            description: 'Debugging activity creation response',
            start_date: nextWeek.toISOString().split('T')[0],
            end_date: nextWeek.toISOString().split('T')[0],
            start_time: '10:00',
            end_time: '11:00',
            location: 'Test Location',
            is_shared: true,
            auto_notify_new_connections: false,
            joint_host_children: [zoewongChild.uuid], // Zoe Wong as joint host
            is_recurring: false // Single activity for simplicity
        };

        console.log('📤 Creating activity...');
        const createResponse = await axios.post(`${API_BASE}/activities/${miawongChild.uuid}`, activityData, { headers });
        
        console.log('📊 RAW API RESPONSE:');
        console.log(JSON.stringify(createResponse.data, null, 2));
        
        if (createResponse.data.success) {
            console.log('\n🔍 ANALYZING RESPONSE STRUCTURE:');
            
            const mainData = createResponse.data.data;
            const jointActivities = createResponse.data.joint_activities;
            
            console.log('📋 Main data fields:');
            if (mainData) {
                Object.keys(mainData).forEach(key => {
                    console.log(`  ${key}: ${mainData[key]}`);
                });
            }
            
            console.log('\n📋 Joint activities:');
            if (jointActivities && Array.isArray(jointActivities)) {
                jointActivities.forEach((activity, index) => {
                    console.log(`  Activity ${index + 1}:`);
                    Object.keys(activity).forEach(key => {
                        console.log(`    ${key}: ${activity[key]}`);
                    });
                    console.log('');
                });
            }
            
            // Now check what the calendar API returns for these activities
            console.log('🔍 CHECKING CALENDAR API RESPONSE:');
            const startDate = nextWeek.toISOString().split('T')[0];
            const endDate = nextWeek.toISOString().split('T')[0];
            
            const calendarResponse = await axios.get(`${API_BASE}/calendar/activities?start=${startDate}&end=${endDate}`, { headers });
            
            if (calendarResponse.data.success) {
                const calendarActivities = calendarResponse.data.data;
                const testActivities = calendarActivities.filter(a => a.name === testName);
                
                console.log(`📊 Found ${testActivities.length} activities in calendar API:`);
                testActivities.forEach((activity, index) => {
                    console.log(`  Calendar Activity ${index + 1}:`);
                    console.log(`    name: ${activity.name}`);
                    console.log(`    uuid/activity_uuid: ${activity.uuid || activity.activity_uuid}`);
                    console.log(`    child_uuid: ${activity.child_uuid}`);
                    console.log(`    is_host: ${activity.is_host}`);
                    console.log(`    created_at: ${activity.created_at}`);
                    console.log('');
                });
                
                // Check which child_uuid values we see
                const childUuids = [...new Set(testActivities.map(a => a.child_uuid).filter(Boolean))];
                console.log('📊 Unique child_uuid values found:');
                childUuids.forEach(uuid => {
                    const childName = children.find(c => c.uuid === uuid)?.name || 'Unknown';
                    console.log(`  ${uuid} -> ${childName}`);
                });
                
                console.log('\n📊 Expected child_uuid values:');
                console.log(`  ${miawongChild.uuid} -> Mia Wong (Primary Host)`);
                console.log(`  ${zoewongChild.uuid} -> Zoe Wong (Joint Host)`);
            }
        }

    } catch (error) {
        console.error('💥 Debug error:', error.response?.data || error.message);
    }
}

// Run the debug
debugActivityCreation();