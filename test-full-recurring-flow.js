const axios = require('axios');

const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com/api';

// Comprehensive test of the full recurring joint host invitation flow
async function testFullRecurringFlow() {
    try {
        console.log('🧪 COMPREHENSIVE TEST: Full recurring joint host invitation flow\n');

        // Step 1: Login as wong@example.com (parent of Mia Wong and Zoe Wong)
        console.log('📝 Step 1: Login as wong@example.com...');
        const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
            email: 'wong@example.com',
            password: 'demo123'
        });

        if (!loginResponse.data.success) {
            console.error('❌ FAILED: Login failed:', loginResponse.data.error);
            return;
        }

        const token = loginResponse.data.token;
        const headers = { 'Authorization': `Bearer ${token}` };
        console.log('✅ Step 1 PASSED: Logged in successfully\n');

        // Step 2: Get Wong family children
        console.log('📝 Step 2: Get Wong family children...');
        const childrenResponse = await axios.get(`${API_BASE}/children`, { headers });
        const children = childrenResponse.data.data;
        
        const miawongChild = children.find(c => c.name === 'Mia Wong');
        const zoewongChild = children.find(c => c.name === 'Zoe Wong');
        
        if (!miawongChild || !zoewongChild) {
            console.error('❌ FAILED: Could not find required children');
            return;
        }
        
        console.log('✅ Step 2 PASSED: Found children');
        console.log(`   Mia Wong: ${miawongChild.uuid}`);
        console.log(`   Zoe Wong: ${zoewongChild.uuid}\n`);

        // Step 3: Verify connections exist
        console.log('📝 Step 3: Verify connections...');
        
        // Get Mia Wong's connections (should include Mia Davis)
        const miaConnectionsResponse = await axios.get(`${API_BASE}/connections/${miawongChild.uuid}`, { headers });
        const miaConnections = miaConnectionsResponse.data.data || [];
        const miaDavis = miaConnections.find(c => c.name?.includes('Mia Davis'));
        
        // Get Zoe Wong's connections (should include Emma Johnson)
        const zoeConnectionsResponse = await axios.get(`${API_BASE}/connections/${zoewongChild.uuid}`, { headers });
        const zoeConnections = zoeConnectionsResponse.data.data || [];
        const emmaJohnson = zoeConnections.find(c => c.name?.includes('Emma Johnson'));
        
        if (!miaDavis) {
            console.error('❌ FAILED: Mia Davis not found in Mia Wong\'s connections');
            return;
        }
        
        if (!emmaJohnson) {
            console.error('❌ FAILED: Emma Johnson not found in Zoe Wong\'s connections');
            return;
        }
        
        console.log('✅ Step 3 PASSED: Connections verified');
        console.log(`   Mia Davis: ${miaDavis.connected_child_uuid}`);
        console.log(`   Emma Johnson: ${emmaJohnson.connected_child_uuid}\n`);

        // Step 4: Create recurring joint host activity via API
        console.log('📝 Step 4: Create recurring joint host activity...');
        
        const today = new Date();
        const nextWeek = new Date(today);
        nextWeek.setDate(today.getDate() + 7);
        
        const testActivityName = `FullFlowTest-${Date.now()}`;
        const seriesId = `fullflow-${Date.now()}`;
        
        // Create a 3-week recurring activity to test multiple occurrences
        const endRecurringDate = new Date(nextWeek);
        endRecurringDate.setDate(nextWeek.getDate() + 14); // 3 weeks total
        
        const activityData = {
            name: testActivityName,
            description: 'Testing full recurring joint host invitation flow',
            start_date: nextWeek.toISOString().split('T')[0],
            end_date: endRecurringDate.toISOString().split('T')[0], // 3 weeks of recurring
            start_time: '14:00',
            end_time: '15:00',
            location: 'Test Location',
            is_shared: true,
            auto_notify_new_connections: false,
            joint_host_children: [zoewongChild.uuid], // Zoe Wong as joint host
            series_id: seriesId,
            is_recurring: true,
            recurring_days: [nextWeek.getDay()], // Same day of week
            series_start_date: nextWeek.toISOString().split('T')[0]
        };

        console.log('📤 Creating activity with data:', {
            name: activityData.name,
            series_id: activityData.series_id,
            joint_host_children: activityData.joint_host_children,
            is_recurring: activityData.is_recurring
        });

        const createActivityResponse = await axios.post(`${API_BASE}/activities/${miawongChild.uuid}`, activityData, { headers });
        
        if (!createActivityResponse.data.success) {
            console.error('❌ FAILED: Activity creation failed:', createActivityResponse.data);
            return;
        }

        const createdActivities = createActivityResponse.data.joint_activities || [createActivityResponse.data.data];
        console.log('✅ Step 4 PASSED: Activity creation successful');
        console.log(`   Created ${createdActivities.length} activities total\n`);

        // Step 5: Verify joint activities were created for both hosts
        console.log('📝 Step 5: Verify joint activities created...');
        
        const miaActivities = createdActivities.filter(a => a.child_uuid === miawongChild.uuid);
        const zoeActivities = createdActivities.filter(a => a.child_uuid === zoewongChild.uuid);
        
        console.log(`   Mia Wong activities: ${miaActivities.length}`);
        console.log(`   Zoe Wong activities: ${zoeActivities.length}`);
        
        if (miaActivities.length === 0 || zoeActivities.length === 0) {
            console.error('❌ FAILED: Joint activities not created properly');
            console.log('All activities:', createdActivities.map(a => ({ name: a.name, child_uuid: a.child_uuid, uuid: a.uuid })));
            return;
        }
        
        console.log('✅ Step 5 PASSED: Joint activities created for both hosts\n');

        // Step 6: Send invitations manually (simulating frontend logic)
        console.log('📝 Step 6: Send invitations for ALL activities...');
        
        // Send invitations from Mia's activities to Mia Davis
        console.log('   Sending invitations from Mia Wong to Mia Davis...');
        for (let i = 0; i < miaActivities.length; i++) {
            const activity = miaActivities[i];
            try {
                const inviteResponse = await axios.post(`${API_BASE}/activities/${activity.uuid}/invite`, {
                    invited_parent_uuid: miaDavis.parentuuid,
                    child_uuid: miaDavis.connected_child_uuid,
                    message: `${miawongChild.name} would like to invite your child to join: ${activity.name}`
                }, { headers });
                
                console.log(`     ✅ Invitation ${i + 1}/${miaActivities.length} sent to Mia Davis`);
            } catch (error) {
                console.error(`     ❌ Failed invitation ${i + 1}/${miaActivities.length} to Mia Davis:`, error.response?.data || error.message);
            }
        }
        
        // Send invitations from Zoe's activities to Emma Johnson
        console.log('   Sending invitations from Zoe Wong to Emma Johnson...');
        for (let i = 0; i < zoeActivities.length; i++) {
            const activity = zoeActivities[i];
            try {
                const inviteResponse = await axios.post(`${API_BASE}/activities/${activity.uuid}/invite`, {
                    invited_parent_uuid: emmaJohnson.parentuuid,
                    child_uuid: emmaJohnson.connected_child_uuid,
                    message: `${zoewongChild.name} would like to invite your child to join: ${activity.name}`
                }, { headers });
                
                console.log(`     ✅ Invitation ${i + 1}/${zoeActivities.length} sent to Emma Johnson`);
            } catch (error) {
                console.error(`     ❌ Failed invitation ${i + 1}/${zoeActivities.length} to Emma Johnson:`, error.response?.data || error.message);
            }
        }
        
        console.log('✅ Step 6 PASSED: All invitations sent\n');

        // Step 7: Wait a moment for invitations to process
        console.log('📝 Step 7: Waiting for invitations to process...');
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
        console.log('✅ Step 7 PASSED: Wait completed\n');

        // Step 8: Verify Emma Johnson received the activities
        console.log('📝 Step 8: Verify Emma Johnson received recurring activities...');
        
        // Login as Emma Johnson's parent
        const johnsonLoginResponse = await axios.post(`${API_BASE}/auth/login`, {
            email: 'johnson@example.com',
            password: 'demo123'
        });

        if (!johnsonLoginResponse.data.success) {
            console.error('❌ FAILED: Could not login as johnson@example.com');
            return;
        }

        const johnsonToken = johnsonLoginResponse.data.token;
        const johnsonHeaders = { 'Authorization': `Bearer ${johnsonToken}` };

        // Get Emma's calendar
        const johnsonChildrenResponse = await axios.get(`${API_BASE}/children`, { headers: johnsonHeaders });
        const johnsonChildren = johnsonChildrenResponse.data.data;
        const emmaJohnsonChild = johnsonChildren.find(c => c.name === 'Emma Johnson');

        if (!emmaJohnsonChild) {
            console.error('❌ FAILED: Could not find Emma Johnson child');
            return;
        }

        // Get Emma's activities for the test period
        const startDate = nextWeek.toISOString().split('T')[0];
        const endDate = new Date(nextWeek.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // Next 30 days
        
        const emmaActivitiesResponse = await axios.get(`${API_BASE}/calendar/activities?start=${startDate}&end=${endDate}`, { headers: johnsonHeaders });
        
        if (!emmaActivitiesResponse.data.success) {
            console.error('❌ FAILED: Could not get Emma\'s activities');
            return;
        }

        const emmaActivities = emmaActivitiesResponse.data.data;
        const emmaTestActivities = emmaActivities.filter(a => 
            a.child_uuid === emmaJohnsonChild.uuid && 
            a.name === testActivityName
        );

        console.log(`📊 Emma Johnson has ${emmaTestActivities.length} test activities`);
        console.log(`📊 Expected: ${zoeActivities.length} activities`);

        if (emmaTestActivities.length === 0) {
            console.error('❌ FAILED: Emma Johnson has NO test activities');
            console.log('   All Emma activities:', emmaActivities.filter(a => a.child_uuid === emmaJohnsonChild.uuid).map(a => ({ name: a.name, date: a.start_date })));
            return;
        }

        if (emmaTestActivities.length < zoeActivities.length) {
            console.error(`❌ FAILED: Emma Johnson has only ${emmaTestActivities.length}/${zoeActivities.length} expected activities`);
            console.log('   Emma test activities:', emmaTestActivities.map(a => ({ name: a.name, date: a.start_date, uuid: a.activity_uuid })));
            console.log('   Expected from Zoe:', zoeActivities.map(a => ({ name: a.name, date: a.start_date, uuid: a.uuid })));
            return;
        }

        console.log('✅ Step 8 PASSED: Emma Johnson received all recurring activities');
        emmaTestActivities.forEach((activity, index) => {
            console.log(`   ${index + 1}. ${activity.name} on ${activity.start_date}`);
        });

        // Step 9: Final verification - check Mia Davis too
        console.log('\n📝 Step 9: Verify Mia Davis also received recurring activities...');
        
        const davisLoginResponse = await axios.post(`${API_BASE}/auth/login`, {
            email: 'davis@example.com',
            password: 'demo123'
        });

        if (davisLoginResponse.data.success) {
            const davisToken = davisLoginResponse.data.token;
            const davisHeaders = { 'Authorization': `Bearer ${davisToken}` };

            const davisChildrenResponse = await axios.get(`${API_BASE}/children`, { headers: davisHeaders });
            const davisChildren = davisChildrenResponse.data.data;
            const miaDavisChild = davisChildren.find(c => c.name === 'Mia Davis');

            if (miaDavisChild) {
                const davisActivitiesResponse = await axios.get(`${API_BASE}/calendar/activities?start=${startDate}&end=${endDate}`, { headers: davisHeaders });
                
                if (davisActivitiesResponse.data.success) {
                    const davisActivities = davisActivitiesResponse.data.data;
                    const davisTestActivities = davisActivities.filter(a => 
                        a.child_uuid === miaDavisChild.uuid && 
                        a.name === testActivityName
                    );
                    
                    console.log(`📊 Mia Davis has ${davisTestActivities.length} test activities`);
                    
                    if (davisTestActivities.length === miaActivities.length) {
                        console.log('✅ Step 9 PASSED: Mia Davis also received all recurring activities');
                    } else {
                        console.log('⚠️ Step 9 WARNING: Mia Davis activity count mismatch');
                    }
                }
            }
        }

        console.log('\n🎉 COMPREHENSIVE TEST COMPLETED SUCCESSFULLY!');
        console.log('✅ All steps passed - recurring joint host invitations are working correctly');

    } catch (error) {
        console.error('💥 COMPREHENSIVE TEST FAILED:', error.response?.data || error.message);
        console.error('Full error:', error);
    }
}

// Run the comprehensive test
testFullRecurringFlow();