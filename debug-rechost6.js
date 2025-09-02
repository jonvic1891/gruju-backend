const axios = require('axios');

const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com/api';

// Debug rechost6 activity to see what's happening with invitations
async function debugRechost6() {
    try {
        console.log('🔍 Debugging rechost6 activity and invitations...\n');

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

        // Get all activities to find rechost6
        const activitiesResponse = await axios.get(`${API_BASE}/calendar/activities?start=2025-09-01&end=2025-09-30`, { headers });
        
        if (activitiesResponse.data.success) {
            const activities = activitiesResponse.data.data;
            const rechost6Activities = activities.filter(a => a.name === 'rechost6');
            
            console.log(`📊 Found ${rechost6Activities.length} rechost6 activities:`);
            
            rechost6Activities.forEach((activity, index) => {
                console.log(`  ${index + 1}. UUID: ${activity.activity_uuid}, Host: ${activity.child_uuid}, Date: ${activity.start_date}`);
                console.log(`     Created: ${activity.created_at}, Series: ${activity.series_id}`);
            });
            
            if (rechost6Activities.length === 0) {
                console.error('❌ No rechost6 activities found!');
                return;
            }
            
            // Group activities by series_id to see joint hosting
            const activitiesBySeries = {};
            rechost6Activities.forEach(activity => {
                const seriesId = activity.series_id;
                if (!activitiesBySeries[seriesId]) {
                    activitiesBySeries[seriesId] = [];
                }
                activitiesBySeries[seriesId].push(activity);
            });
            
            console.log(`\n📋 Activities grouped by series:`);
            Object.entries(activitiesBySeries).forEach(([seriesId, activities]) => {
                console.log(`  Series ${seriesId}: ${activities.length} activities`);
                activities.forEach(activity => {
                    console.log(`    - Host: ${activity.child_uuid}, UUID: ${activity.activity_uuid}`);
                });
            });
            
            // Get the parent's children to map UUIDs to names
            const childrenResponse = await axios.get(`${API_BASE}/children`, { headers });
            const children = childrenResponse.data.data;
            console.log('\n👥 Wong family children:', children.map(c => ({ name: c.name, uuid: c.uuid })));
            
            // Check if we have both Mia Wong and Zoe Wong activities
            const miawongChild = children.find(c => c.name === 'Mia Wong');
            const zoewongChild = children.find(c => c.name === 'Zoe Wong');
            
            const miaActivities = rechost6Activities.filter(a => a.child_uuid === miawongChild.uuid);
            const zoeActivities = rechost6Activities.filter(a => a.child_uuid === zoewongChild.uuid);
            
            console.log(`\n📊 Host breakdown:`);
            console.log(`  Mia Wong hosted: ${miaActivities.length} rechost6 activities`);
            console.log(`  Zoe Wong hosted: ${zoeActivities.length} rechost6 activities`);
            
            if (zoeActivities.length === 0) {
                console.error('❌ No activities found for Zoe Wong as joint host!');
                console.log('💡 This means joint hosting is not working in the frontend');
                return;
            }
            
            // Now check Emma Johnson's received invitations
            console.log('\n🔍 Checking Emma Johnson\'s invitations...');
            const johnsonLoginResponse = await axios.post(`${API_BASE}/auth/login`, {
                email: 'johnson@example.com',
                password: 'demo123'
            });
            
            if (!johnsonLoginResponse.data.success) {
                console.error('❌ Johnson login failed:', johnsonLoginResponse.data.error);
                return;
            }
            
            const johnsonToken = johnsonLoginResponse.data.token;
            const johnsonHeaders = { 'Authorization': `Bearer ${johnsonToken}` };
            
            // Try different endpoints to find invitations
            console.log('🔍 Trying to find invitations endpoint...');
            
            // Try common invitation endpoints
            const endpoints = [
                '/invitations',
                '/invitations/received', 
                '/invitations/pending',
                '/calendar/invitations',
                '/activities/invitations'
            ];
            
            for (const endpoint of endpoints) {
                try {
                    console.log(`🔍 Trying endpoint: ${endpoint}`);
                    const invResponse = await axios.get(`${API_BASE}${endpoint}`, { headers: johnsonHeaders });
                    if (invResponse.data.success) {
                        console.log(`✅ Found working endpoint: ${endpoint}`);
                        const invitations = invResponse.data.data || [];
                        
                        // Filter for recent rechost6 invitations
                        const recentTime = new Date();
                        recentTime.setHours(recentTime.getHours() - 1); // Last hour
                        
                        const recentInvitations = invitations.filter(inv => {
                            const inviteTime = new Date(inv.created_at);
                            return inviteTime > recentTime && 
                                   inv.activity_name && 
                                   inv.activity_name.includes('rechost6');
                        });
                        
                        console.log(`📧 Emma Johnson has ${recentInvitations.length} recent rechost6 invitations:`);
                        recentInvitations.forEach((inv, index) => {
                            console.log(`  ${index + 1}. Activity: ${inv.activity_name || 'Unknown'}`);
                            console.log(`     From: ${inv.host_child_name || inv.sender_name || 'Unknown'}`);
                            console.log(`     Status: ${inv.status || 'Unknown'}`);
                            console.log(`     Created: ${inv.created_at}`);
                            console.log('');
                        });
                        
                        if (recentInvitations.length === 0) {
                            console.error('❌ Emma Johnson did not receive any rechost6 invitations!');
                            console.log('💡 This confirms that joint host invitations are not being sent');
                        } else {
                            console.log('✅ Emma Johnson did receive rechost6 invitations');
                        }
                        
                        break;
                    }
                } catch (error) {
                    console.log(`❌ Endpoint ${endpoint} failed: ${error.response?.status || error.message}`);
                }
            }
            
        } else {
            console.error('❌ Failed to fetch activities:', activitiesResponse.data);
        }

    } catch (error) {
        console.error('💥 Debug error:', error.response?.data || error.message);
    }
}

// Run the debug
debugRechost6();