const axios = require('axios');

const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com/api';

// Test the frontend multi-host functionality by checking invitations
async function testFrontendMultiHost() {
    try {
        console.log('🧪 Testing frontend multi-host functionality after UUID parsing fix...\n');

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

        // Get activities for the week (including test activities created for Sept 9)
        const startDate = '2025-09-01';
        const endDate = '2025-09-30';

        console.log(`🔍 Checking activities from ${startDate} to ${endDate}...`);

        const activitiesResponse = await axios.get(`${API_BASE}/calendar/activities?start=${startDate}&end=${endDate}`, { headers });
        
        if (activitiesResponse.data.success) {
            const activities = activitiesResponse.data.data;
            const testActivities = activities.filter(a => a.name.includes('Multi-host Test Activity'));
            
            console.log(`📊 Found ${testActivities.length} test activities from recent runs`);
            
            if (testActivities.length > 0) {
                // Get the most recent test activity
                const recentActivity = testActivities.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
                
                console.log(`🎯 Testing with most recent activity: ${recentActivity.name} (${recentActivity.activity_uuid || recentActivity.uuid})`);
                
                // Test by logging in as the invitation recipients to check if they received invitations
                console.log('🔍 Testing by checking if invitation recipients received the invitations...');
                
                // Login as davis@example.com (Mia Davis's parent) to check for invitations
                console.log('\\n🔍 Checking invitations received by Mia Davis (davis@example.com)...');
                const davisLoginResponse = await axios.post(`${API_BASE}/auth/login`, {
                    email: 'davis@example.com',
                    password: 'demo123'
                });
                
                if (!davisLoginResponse.data.success) {
                    console.error('❌ Davis login failed:', davisLoginResponse.data.error);
                    return;
                }
                
                const davisToken = davisLoginResponse.data.token;
                const davisHeaders = { 'Authorization': `Bearer ${davisToken}` };
                
                const davisInvitationsResponse = await axios.get(`${API_BASE}/invitations`, { headers: davisHeaders });
                
                if (davisInvitationsResponse.data.success) {
                    const davisInvitations = davisInvitationsResponse.data.data;
                    
                    // Filter for recent test activity invitations (last few hours)
                    const recentTime = new Date();
                    recentTime.setHours(recentTime.getHours() - 2); // Last 2 hours
                    
                    const recentDavisInvitations = davisInvitations.filter(inv => {
                        const inviteTime = new Date(inv.created_at);
                        return inviteTime > recentTime && 
                               inv.activity_name && 
                               inv.activity_name.includes('Multi-host Test Activity');
                    });
                    
                    console.log(`📧 Mia Davis received ${recentDavisInvitations.length} recent test activity invitations`);
                    
                    recentDavisInvitations.forEach((inv, index) => {
                        console.log(`  ${index + 1}. Activity: ${inv.activity_name}`);
                        console.log(`     From: ${inv.host_child_name || inv.sender_name || 'Unknown'}`);
                        console.log(`     Status: ${inv.status}`);
                        console.log(`     Created: ${inv.created_at}`);
                        console.log('');
                    });
                    
                    const miaDavisInvitation = recentDavisInvitations.length > 0;
                    console.log(`🎯 Mia Davis invitation: ${miaDavisInvitation ? '✅ Found' : '❌ Missing'}`);
                    
                    // Now check Emma Johnson's invitations
                    console.log('\\n🔍 Checking invitations received by Emma Johnson (johnson@example.com)...');
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
                    
                    const johnsonInvitationsResponse = await axios.get(`${API_BASE}/invitations`, { headers: johnsonHeaders });
                    
                    if (johnsonInvitationsResponse.data.success) {
                        const johnsonInvitations = johnsonInvitationsResponse.data.data;
                        
                        const recentJohnsonInvitations = johnsonInvitations.filter(inv => {
                            const inviteTime = new Date(inv.created_at);
                            return inviteTime > recentTime && 
                                   inv.activity_name && 
                                   inv.activity_name.includes('Multi-host Test Activity');
                        });
                        
                        console.log(`📧 Emma Johnson received ${recentJohnsonInvitations.length} recent test activity invitations`);
                        
                        recentJohnsonInvitations.forEach((inv, index) => {
                            console.log(`  ${index + 1}. Activity: ${inv.activity_name}`);
                            console.log(`     From: ${inv.host_child_name || inv.sender_name || 'Unknown'}`);
                            console.log(`     Status: ${inv.status}`);
                            console.log(`     Created: ${inv.created_at}`);
                            console.log('');
                        });
                        
                        const emmaJohnsonInvitation = recentJohnsonInvitations.length > 0;
                        console.log(`🎯 Emma Johnson invitation: ${emmaJohnsonInvitation ? '✅ Found' : '❌ Missing'}`);
                        
                        // Final results
                        console.log('\\n🎯 Final Results:');
                        console.log(`  Mia Davis: ${miaDavisInvitation ? '✅ Found' : '❌ Missing'}`);
                        console.log(`  Emma Johnson: ${emmaJohnsonInvitation ? '✅ Found' : '❌ Missing'}`);
                        
                        if (miaDavisInvitation && emmaJohnsonInvitation) {
                            console.log('\\n🎉 SUCCESS: Both expected invitations are present!');
                            console.log('✅ Joint host invitation functionality is working correctly');
                        } else {
                            console.log('\\n❌ FAILURE: Not all expected invitations were found');
                            if (!miaDavisInvitation) {
                                console.log('  - Missing Mia Davis invitation (primary host connection)');
                            }
                            if (!emmaJohnsonInvitation) {
                                console.log('  - Missing Emma Johnson invitation (joint host connection)');
                            }
                        }
                    } else {
                        console.error('❌ Failed to fetch Johnson invitations:', johnsonInvitationsResponse.data);
                    }
                    
                } else {
                    console.error('❌ Failed to fetch Davis invitations:', davisInvitationsResponse.data);
                }
            } else {
                console.log('ℹ️  No recent test activities found. This test only checks activities created by the debug script.');
                console.log('💡 Run the debug-multi-host-recurring.js script first to create test activities.');
            }
        } else {
            console.error('❌ Failed to fetch activities:', activitiesResponse.data);
        }

    } catch (error) {
        console.error('💥 Test error:', error.response?.data || error.message);
    }
}

// Run the test
testFrontendMultiHost();