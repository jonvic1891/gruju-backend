const axios = require('axios');

const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com/api';

// Debug joint host invitation process
async function debugJointHostInvitations() {
    try {
        console.log('🔍 Debugging why Emma Johnson didn\'t get the rechost2 invitation...\n');

        // Login as wong@example.com (Mia and Zoe's parent)
        const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
            email: 'wong@example.com',
            password: 'demo123'
        });

        if (!loginResponse.data.success) {
            console.error('❌ Login failed:', loginResponse.data.error);
            return;
        }

        const token = loginResponse.data.token;
        const headers = { 'Authorization': `Bearer ${token}` };

        console.log('✅ Logged in as wong@example.com');

        // Get the parent's children
        const childrenResponse = await axios.get(`${API_BASE}/children`, { headers });
        const children = childrenResponse.data.data;
        console.log('👥 Wong family children:', children.map(c => ({ name: c.name, uuid: c.uuid })));

        const miawongChild = children.find(c => c.name === 'Mia Wong');
        const zoewongChild = children.find(c => c.name === 'Zoe Wong');

        // Check Zoe Wong's connections (should include Emma Johnson)
        console.log('\n🔍 Getting Zoe Wong\'s connections...');
        const zoeConnectionsResponse = await axios.get(`${API_BASE}/connections/${zoewongChild.uuid}`, { headers });
        console.log('📊 Zoe Wong connections response:', JSON.stringify(zoeConnectionsResponse.data, null, 2));

        const zoeConnections = zoeConnectionsResponse.data.data || [];
        const emmaJohnson = zoeConnections.find(c => c.name?.includes('Emma Johnson'));

        if (!emmaJohnson) {
            console.error('❌ Emma Johnson NOT found in Zoe Wong\'s connections!');
            console.log('📋 Available connections for Zoe Wong:', zoeConnections.map(c => c.name));
            console.log('\n💡 This is likely the problem - Emma Johnson is not connected to Zoe Wong');
            return;
        }

        console.log('✅ Emma Johnson found in Zoe Wong\'s connections:', {
            name: emmaJohnson.name,
            uuid: emmaJohnson.connected_child_uuid,
            parentUuid: emmaJohnson.parentuuid
        });

        // Now let's look for recent "rechost2" activities created by this user
        console.log('\n🔍 Looking for recent rechost2 activities...');
        
        // Get activities for both children to see if joint activities were created
        const miaActivitiesResponse = await axios.get(`${API_BASE}/calendar/activities?start=2025-09-01&end=2025-09-30`, { headers });
        
        if (miaActivitiesResponse.data.success) {
            const allActivities = miaActivitiesResponse.data.data;
            const rechost2Activities = allActivities.filter(a => a.name === 'rechost2');
            
            console.log('📊 Found rechost2 activities:', rechost2Activities.length);
            
            // Group by child_uuid to see which child hosts each activity
            const activitiesByHost = {};
            rechost2Activities.forEach(activity => {
                if (!activitiesByHost[activity.child_uuid]) {
                    activitiesByHost[activity.child_uuid] = [];
                }
                activitiesByHost[activity.child_uuid].push(activity);
            });
            
            console.log('📋 Activities grouped by host child:');
            Object.entries(activitiesByHost).forEach(([childUuid, activities]) => {
                const child = children.find(c => c.uuid === childUuid);
                console.log(`  ${child?.name || 'Unknown'} (${childUuid}): ${activities.length} activities`);
                activities.forEach((activity, index) => {
                    console.log(`    ${index + 1}. UUID: ${activity.activity_uuid}, Date: ${activity.start_date}`);
                });
            });
            
            // Check if there are activities for both Mia Wong and Zoe Wong
            const miaHostedActivities = activitiesByHost[miawongChild.uuid] || [];
            const zoeHostedActivities = activitiesByHost[zoewongChild.uuid] || [];
            
            console.log(`\n📊 Summary:`);
            console.log(`  Mia Wong hosted: ${miaHostedActivities.length} rechost2 activities`);
            console.log(`  Zoe Wong hosted: ${zoeHostedActivities.length} rechost2 activities`);
            
            if (zoeHostedActivities.length === 0) {
                console.error('❌ No rechost2 activities found for Zoe Wong as host!');
                console.log('💡 This means joint hosting didn\'t create activities for Zoe Wong');
                return;
            }
            
            // Test sending invitation from Zoe's activity to Emma manually
            const zoeActivity = zoeHostedActivities[0];
            console.log(`\n🧪 Testing manual invitation from Zoe Wong's activity...`);
            console.log(`Activity: ${zoeActivity.activity_uuid} - ${zoeActivity.name}`);
            console.log(`To: Emma Johnson (${emmaJohnson.connected_child_uuid})`);
            console.log(`Parent: ${emmaJohnson.parentuuid}`);
            
            try {
                const manualInviteResponse = await axios.post(`${API_BASE}/activities/${zoeActivity.activity_uuid}/invite`, {
                    invited_parent_uuid: emmaJohnson.parentuuid,
                    child_uuid: emmaJohnson.connected_child_uuid,
                    message: `${zoewongChild.name} would like to invite your child to join: ${zoeActivity.name} (Manual Test)`
                }, { headers });
                
                console.log('✅ Manual invitation sent successfully:', manualInviteResponse.data);
                console.log('💡 This confirms the invitation system works - the issue is in the frontend logic');
                
            } catch (error) {
                console.error('❌ Manual invitation failed:', error.response?.data || error.message);
            }
        }

        console.log('\n🔍 Summary of findings:');
        console.log('1. Check if Emma Johnson is connected to Zoe Wong ✓');
        console.log('2. Check if joint activities were created for Zoe Wong');
        console.log('3. Check if frontend invitation logic is working for joint hosts');
        
    } catch (error) {
        console.error('💥 Debug error:', error.response?.data || error.message);
    }
}

// Run the debug test
debugJointHostInvitations();