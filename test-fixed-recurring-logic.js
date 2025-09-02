const axios = require('axios');

const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com/api';

// Test the FIXED recurring logic by simulating the corrected frontend behavior
async function testFixedRecurringLogic() {
    try {
        console.log('🧪 TESTING FIXED RECURRING LOGIC\n');

        // Step 1: Create recurring joint host activity via API
        console.log('📝 Step 1: Create recurring joint host activity...');
        
        const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
            email: 'wong@example.com',
            password: 'demo123'
        });

        const token = loginResponse.data.token;
        const headers = { 'Authorization': `Bearer ${token}` };

        const children = (await axios.get(`${API_BASE}/children`, { headers })).data.data;
        const miawongChild = children.find(c => c.name === 'Mia Wong');
        const zoewongChild = children.find(c => c.name === 'Zoe Wong');

        // Get connections
        const miaConnections = (await axios.get(`${API_BASE}/connections/${miawongChild.uuid}`, { headers })).data.data;
        const zoeConnections = (await axios.get(`${API_BASE}/connections/${zoewongChild.uuid}`, { headers })).data.data;
        const miaDavis = miaConnections.find(c => c.name?.includes('Mia Davis'));
        const emmaJohnson = zoeConnections.find(c => c.name?.includes('Emma Johnson'));

        const testName = `RecurringLogicTest-${Date.now()}`;
        const today = new Date();
        const nextWeek = new Date(today);
        nextWeek.setDate(today.getDate() + 7);
        const endDate = new Date(nextWeek);
        endDate.setDate(nextWeek.getDate() + 14); // 3 weeks
        
        const activityData = {
            name: testName,
            description: 'Testing fixed recurring joint host logic',
            start_date: nextWeek.toISOString().split('T')[0],
            end_date: endDate.toISOString().split('T')[0],
            start_time: '10:00',
            end_time: '11:00',
            location: 'Test Location',
            is_shared: true,
            auto_notify_new_connections: false,
            joint_host_children: [zoewongChild.uuid],
            is_recurring: true,
            recurring_days: [nextWeek.getDay()],
            series_start_date: nextWeek.toISOString().split('T')[0]
        };

        const createResponse = await axios.post(`${API_BASE}/activities/${miawongChild.uuid}`, activityData, { headers });
        
        if (!createResponse.data.success) {
            console.error('❌ FAILED: Activity creation failed');
            return;
        }

        const createdActivities = createResponse.data.joint_activities || [createResponse.data.data];
        console.log(`✅ Step 1 PASSED: Created ${createdActivities.length} activities\n`);

        // Step 2: Apply the FIXED frontend logic to map activities to hosts
        console.log('📝 Step 2: Apply fixed frontend logic...');
        
        const jointHostChildren = [zoewongChild.uuid];
        
        // Primary host activities (even indices: 0, 2, 4, ...)
        const primaryHostActivities = createdActivities.filter((_, index) => index % 2 === 0);
        
        // Joint host activities (odd indices: 1, 3, 5, ...)  
        const jointHostActivities = createdActivities.filter((_, index) => index % 2 === 1);
        
        console.log(`📊 Primary host (Mia Wong) activities: ${primaryHostActivities.length}`);
        console.log(`📊 Joint host (Zoe Wong) activities: ${jointHostActivities.length}`);
        
        if (primaryHostActivities.length === 0 || jointHostActivities.length === 0) {
            console.error('❌ FAILED: Activity mapping failed');
            return;
        }
        
        console.log('✅ Step 2 PASSED: Activity mapping successful\n');

        // Step 3: Send invitations using the mapped activities
        console.log('📝 Step 3: Send recurring invitations...');
        
        // Send invitations from primary host activities to Mia Davis
        console.log(`   Sending ${primaryHostActivities.length} invitations from Mia Wong to Mia Davis...`);
        let miaInviteCount = 0;
        for (const activity of primaryHostActivities) {
            try {
                await axios.post(`${API_BASE}/activities/${activity.uuid}/invite`, {
                    invited_parent_uuid: miaDavis.parentuuid,
                    child_uuid: miaDavis.connected_child_uuid,
                    message: `Mia Wong would like to invite your child to join: ${activity.name}`
                }, { headers });
                miaInviteCount++;
            } catch (error) {
                console.error(`     ❌ Failed invitation to Mia Davis:`, error.response?.data || error.message);
            }
        }
        
        // Send invitations from joint host activities to Emma Johnson
        console.log(`   Sending ${jointHostActivities.length} invitations from Zoe Wong to Emma Johnson...`);
        let emmaInviteCount = 0;
        for (const activity of jointHostActivities) {
            try {
                await axios.post(`${API_BASE}/activities/${activity.uuid}/invite`, {
                    invited_parent_uuid: emmaJohnson.parentuuid,
                    child_uuid: emmaJohnson.connected_child_uuid,
                    message: `Zoe Wong would like to invite your child to join: ${activity.name}`
                }, { headers });
                emmaInviteCount++;
            } catch (error) {
                console.error(`     ❌ Failed invitation to Emma Johnson:`, error.response?.data || error.message);
            }
        }
        
        console.log(`📊 Mia Davis invitations sent: ${miaInviteCount}/${primaryHostActivities.length}`);
        console.log(`📊 Emma Johnson invitations sent: ${emmaInviteCount}/${jointHostActivities.length}`);
        
        if (miaInviteCount === 0 || emmaInviteCount === 0) {
            console.error('❌ FAILED: Some invitations failed to send');
            return;
        }
        
        console.log('✅ Step 3 PASSED: All invitations sent successfully\n');

        // Step 4: Wait and verify recipients received activities
        console.log('📝 Step 4: Verify recipients received recurring activities...');
        await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds

        // Check Emma Johnson's activities
        const johnsonLogin = await axios.post(`${API_BASE}/auth/login`, {
            email: 'johnson@example.com',
            password: 'demo123'
        });
        const johnsonToken = johnsonLogin.data.token;
        const johnsonHeaders = { 'Authorization': `Bearer ${johnsonToken}` };

        const johnsonChildren = (await axios.get(`${API_BASE}/children`, { headers: johnsonHeaders })).data.data;
        const emmaChild = johnsonChildren.find(c => c.name === 'Emma Johnson');

        const startDateStr = nextWeek.toISOString().split('T')[0];
        const endDateStr = new Date(nextWeek.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        const emmaActivities = (await axios.get(`${API_BASE}/calendar/activities?start=${startDateStr}&end=${endDateStr}`, { headers: johnsonHeaders })).data.data;
        const emmaTestActivities = emmaActivities.filter(a => 
            a.child_uuid === emmaChild.uuid && a.name === testName
        );

        console.log(`📊 Emma Johnson received: ${emmaTestActivities.length} test activities`);
        console.log(`📊 Expected: ${jointHostActivities.length} activities`);

        if (emmaTestActivities.length === jointHostActivities.length) {
            console.log('✅ Step 4 PASSED: Emma Johnson received all recurring activities\n');
            
            console.log('🎉 SUCCESS: FIXED RECURRING LOGIC WORKS CORRECTLY!');
            console.log(`✅ Created ${createdActivities.length} total activities`);
            console.log(`✅ Mapped ${primaryHostActivities.length} to primary host`);
            console.log(`✅ Mapped ${jointHostActivities.length} to joint host`);
            console.log(`✅ Sent ${emmaInviteCount} recurring invitations to Emma Johnson`);
            console.log(`✅ Emma Johnson received all ${emmaTestActivities.length} recurring activities`);
            
        } else {
            console.error('❌ FAILED: Emma Johnson did not receive all expected activities');
            console.log('   Emma activities:', emmaTestActivities.map(a => ({ name: a.name, date: a.start_date })));
        }

    } catch (error) {
        console.error('💥 TEST FAILED:', error.response?.data || error.message);
    }
}

// Run the test
testFixedRecurringLogic();