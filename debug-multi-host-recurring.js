const axios = require('axios');

const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com/api';

// Test multi-host recurring activity creation and invitation issue
async function debugMultiHostRecurring() {
    try {
        console.log('🔄 Testing multi-host recurring activity creation...\n');

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
        console.log('👥 Parent children:', childrenResponse.data.data.map(c => ({ name: c.name, uuid: c.uuid })));

        const miawongChild = childrenResponse.data.data.find(c => c.name === 'Mia Wong');
        const zoewongChild = childrenResponse.data.data.find(c => c.name === 'Zoe Wong');

        if (!miawongChild || !zoewongChild) {
            console.error('❌ Could not find Mia Wong or Zoe Wong children');
            return;
        }

        console.log(`✅ Found children: Mia Wong (${miawongChild.uuid}), Zoe Wong (${zoewongChild.uuid})\n`);

        // Get Mia Wong's connections (should include Mia Davis)
        console.log('🔍 Getting Mia Wong\'s connections...');
        const miaConnectionsResponse = await axios.get(`${API_BASE}/connections/${miawongChild.uuid}`, { headers });
        console.log('📊 Mia Wong connections response:', JSON.stringify(miaConnectionsResponse.data, null, 2));

        const miaConnections = miaConnectionsResponse.data.data || [];
        const miaDavis = miaConnections.find(c => c.name?.includes('Mia Davis'));
        console.log('🔍 Found Mia Davis connection:', miaDavis ? { name: miaDavis.name, uuid: miaDavis.connected_child_uuid } : 'NOT FOUND');

        // Get Zoe Wong's connections (should include Emma Johnson)
        console.log('\n🔍 Getting Zoe Wong\'s connections...');
        const zoeConnectionsResponse = await axios.get(`${API_BASE}/connections/${zoewongChild.uuid}`, { headers });
        console.log('📊 Zoe Wong connections response:', JSON.stringify(zoeConnectionsResponse.data, null, 2));

        const zoeConnections = zoeConnectionsResponse.data.data || [];
        const emmaJohnson = zoeConnections.find(c => c.name?.includes('Emma Johnson'));
        console.log('🔍 Found Emma Johnson connection:', emmaJohnson ? { name: emmaJohnson.name, uuid: emmaJohnson.connected_child_uuid } : 'NOT FOUND');

        if (!miaDavis) {
            console.error('❌ Mia Davis connection not found in Mia Wong\'s connections');
            return;
        }

        if (!emmaJohnson) {
            console.error('❌ Emma Johnson connection not found in Zoe Wong\'s connections');
            return;
        }

        console.log('\n🎯 Creating multi-host recurring activity...');
        console.log('Primary host: Mia Wong');
        console.log('Joint host: Zoe Wong');
        console.log('Inviting: Mia Davis (from Mia\'s connections), Emma Johnson (from Zoe\'s connections)');

        // Create recurring activity with joint hosting
        const today = new Date();
        const nextWeek = new Date(today);
        nextWeek.setDate(today.getDate() + 7);
        
        const seriesId = `test-multihost-${Date.now()}`;
        const activityName = `Multi-host Test Activity ${Date.now()}`;

        const activityData = {
            name: activityName,
            description: 'Testing multi-host recurring activity invitations',
            start_date: nextWeek.toISOString().split('T')[0],
            end_date: nextWeek.toISOString().split('T')[0],
            start_time: '10:00',
            end_time: '11:00',
            location: 'Test Location',
            is_shared: true,
            auto_notify_new_connections: false,
            joint_host_children: [zoewongChild.uuid], // Zoe Wong as joint host
            series_id: seriesId,
            is_recurring: true,
            recurring_days: [nextWeek.getDay()], // Same day of week
            series_start_date: nextWeek.toISOString().split('T')[0]
        };

        console.log('📤 Activity data to create:', activityData);

        const createActivityResponse = await axios.post(`${API_BASE}/activities/${miawongChild.uuid}`, activityData, { headers });
        
        console.log('\n📊 Activity creation response:', JSON.stringify(createActivityResponse.data, null, 2));

        if (!createActivityResponse.data.success) {
            console.error('❌ Activity creation failed:', createActivityResponse.data.error);
            return;
        }

        const createdActivity = createActivityResponse.data.data;
        const jointActivities = createActivityResponse.data.joint_activities;
        
        console.log(`✅ Primary activity created: ${createdActivity.uuid}`);
        if (jointActivities && jointActivities.length > 1) {
            console.log(`✅ Joint activities created: ${jointActivities.length} total`);
            jointActivities.forEach((activity, index) => {
                console.log(`   ${index + 1}. ${activity.uuid} - ${activity.name}`);
            });
        }

        console.log('\n📧 Now testing invitation sending...');
        
        // Test sending invitations manually to see what happens
        const miaDavisUuid = miaDavis.connected_child_uuid;
        const miaDavisParentUuid = miaDavis.parentuuid;
        
        const emmaJohnsonUuid = emmaJohnson.connected_child_uuid;
        const emmaJohnsonParentUuid = emmaJohnson.parentuuid;

        console.log('\n🎯 Invitation details:');
        console.log(`Mia Davis: child_uuid=${miaDavisUuid}, parent_uuid=${miaDavisParentUuid}`);
        console.log(`Emma Johnson: child_uuid=${emmaJohnsonUuid}, parent_uuid=${emmaJohnsonParentUuid}`);

        // Try sending invitation to Mia Davis from primary activity
        console.log('\n📤 Sending invitation to Mia Davis from primary activity...');
        try {
            const miaInviteResponse = await axios.post(`${API_BASE}/activities/${createdActivity.uuid}/invite`, {
                invited_parent_uuid: miaDavisParentUuid,
                child_uuid: miaDavisUuid,
                message: `${miawongChild.name} would like to invite your child to join: ${activityName}`
            }, { headers });
            
            console.log('📊 Mia Davis invitation response:', miaInviteResponse.data);
        } catch (error) {
            console.error('❌ Failed to send invitation to Mia Davis:', error.response?.data || error.message);
        }

        // Try sending invitation to Emma Johnson from joint activity
        if (jointActivities && jointActivities.length > 1) {
            const jointActivity = jointActivities.find(a => a.uuid !== createdActivity.uuid);
            if (jointActivity) {
                console.log('\n📤 Sending invitation to Emma Johnson from joint activity...');
                try {
                    const emmaInviteResponse = await axios.post(`${API_BASE}/activities/${jointActivity.uuid}/invite`, {
                        invited_parent_uuid: emmaJohnsonParentUuid,
                        child_uuid: emmaJohnsonUuid,
                        message: `${zoewongChild.name} would like to invite your child to join: ${activityName}`
                    }, { headers });
                    
                    console.log('📊 Emma Johnson invitation response:', emmaInviteResponse.data);
                } catch (error) {
                    console.error('❌ Failed to send invitation to Emma Johnson:', error.response?.data || error.message);
                }
            }
        }

        console.log('\n✅ Debug test completed! Check the invitations in the system to see if both Mia Davis and Emma Johnson received them.');

    } catch (error) {
        console.error('💥 Debug test error:', error.response?.data || error.message);
    }
}

// Run the debug test
debugMultiHostRecurring();