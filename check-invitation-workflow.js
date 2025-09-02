const axios = require('axios');

const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com/api';

// Investigate the complete invitation workflow
async function checkInvitationWorkflow() {
    try {
        console.log('🔍 INVESTIGATING INVITATION WORKFLOW\n');

        // Login as Emma Johnson's parent
        console.log('📝 Step 1: Login as Emma Johnson\'s parent...');
        const johnsonLogin = await axios.post(`${API_BASE}/auth/login`, {
            email: 'johnson@example.com',
            password: 'demo123'
        });
        
        if (!johnsonLogin.data.success) {
            console.error('❌ Johnson login failed');
            return;
        }
        
        const johnsonToken = johnsonLogin.data.token;
        const johnsonHeaders = { 'Authorization': `Bearer ${johnsonToken}` };
        console.log('✅ Logged in as johnson@example.com');

        // Get Emma's info
        const johnsonChildren = (await axios.get(`${API_BASE}/children`, { headers: johnsonHeaders })).data.data;
        const emmaChild = johnsonChildren.find(c => c.name === 'Emma Johnson');
        console.log('📊 Emma Johnson:', emmaChild.uuid);

        // Check various endpoints that might contain invitations
        console.log('\n📝 Step 2: Checking all possible invitation/notification endpoints...');
        
        const endpointsToCheck = [
            '/notifications',
            '/invitations',
            '/invitations/pending',
            '/invitations/received', 
            '/activities/pending',
            '/activities/invitations',
            '/pending',
            '/calendar/pending',
            `/children/${emmaChild.uuid}/invitations`,
            `/children/${emmaChild.uuid}/pending`,
        ];
        
        let foundInvitations = [];
        
        for (const endpoint of endpointsToCheck) {
            try {
                console.log(`   Trying ${endpoint}...`);
                const response = await axios.get(`${API_BASE}${endpoint}`, { headers: johnsonHeaders });
                
                if (response.data.success && response.data.data) {
                    const items = response.data.data;
                    console.log(`     ✅ Found ${items.length} items`);
                    
                    if (items.length > 0) {
                        // Look for recent items
                        const recent = items.filter(item => {
                            const created = new Date(item.created_at);
                            const oneHour = new Date();
                            oneHour.setHours(oneHour.getHours() - 1);
                            return created > oneHour;
                        });
                        
                        if (recent.length > 0) {
                            console.log(`     📋 Recent items (last hour): ${recent.length}`);
                            recent.forEach((item, index) => {
                                console.log(`       ${index + 1}. ${item.activity_name || item.message || item.type || 'Unknown'}`);
                                console.log(`          Status: ${item.status || 'Unknown'}`);
                                console.log(`          Created: ${item.created_at}`);
                                
                                if (item.activity_name && (item.activity_name.includes('Debug') || item.activity_name.includes('FullFlowTest') || item.activity_name.includes('rechost'))) {
                                    foundInvitations.push({
                                        endpoint,
                                        item,
                                        activity_name: item.activity_name
                                    });
                                }
                            });
                        }
                        
                        // Look for test activities specifically
                        const testItems = items.filter(item => 
                            (item.activity_name && (item.activity_name.includes('Debug') || item.activity_name.includes('FullFlowTest') || item.activity_name.includes('rechost'))) ||
                            (item.message && (item.message.includes('Debug') || item.message.includes('FullFlowTest') || item.message.includes('rechost')))
                        );
                        
                        if (testItems.length > 0) {
                            console.log(`     🎯 Test-related items: ${testItems.length}`);
                            foundInvitations.push(...testItems.map(item => ({ endpoint, item })));
                        }
                    }
                }
            } catch (error) {
                console.log(`     ❌ ${error.response?.status || error.message}`);
            }
        }
        
        console.log(`\n📊 Summary: Found ${foundInvitations.length} relevant invitations across all endpoints`);
        
        if (foundInvitations.length > 0) {
            console.log('\n📋 FOUND INVITATIONS:');
            foundInvitations.forEach((inv, index) => {
                console.log(`${index + 1}. Endpoint: ${inv.endpoint}`);
                console.log(`   Activity: ${inv.item.activity_name || 'Unknown'}`);
                console.log(`   Status: ${inv.item.status || 'Unknown'}`);
                console.log(`   Created: ${inv.item.created_at}`);
                
                // If this looks like a pending invitation, note it for later processing
                if (inv.item.status === 'pending' && inv.item.uuid) {
                    console.log(`   🧪 Found pending invitation: ${inv.item.uuid}`);
                }
                console.log('');
            });
        } else {
            console.log('\n❌ No invitations found in any endpoint!');
            console.log('🤔 This suggests:');
            console.log('   1. Invitations might be auto-accepted');
            console.log('   2. There might be a backend issue with invitation creation');
            console.log('   3. The invitation endpoints might be different');
        }

        // Step 3: Check Emma's current activities to see if anything appeared
        console.log('📝 Step 3: Checking Emma\'s current activities...');
        const today = new Date();
        const futureDate = new Date(today);
        futureDate.setDate(today.getDate() + 30);
        
        const activitiesResponse = await axios.get(`${API_BASE}/calendar/activities?start=${today.toISOString().split('T')[0]}&end=${futureDate.toISOString().split('T')[0]}`, { headers: johnsonHeaders });
        
        if (activitiesResponse.data.success) {
            const activities = activitiesResponse.data.data;
            const emmaActivities = activities.filter(a => a.child_uuid === emmaChild.uuid);
            const testActivities = emmaActivities.filter(a => 
                a.name.includes('Debug') || 
                a.name.includes('FullFlowTest') || 
                a.name.includes('rechost')
            );
            
            console.log(`📊 Emma has ${emmaActivities.length} total activities`);
            console.log(`📊 Emma has ${testActivities.length} test-related activities`);
            
            if (testActivities.length > 0) {
                console.log('📋 Test activities found:');
                testActivities.forEach((activity, index) => {
                    console.log(`  ${index + 1}. ${activity.name} on ${activity.start_date}`);
                    console.log(`     Host: ${activity.is_host ? 'Emma' : 'Someone else'}`);
                    console.log(`     Status: ${activity.participation_status || 'Unknown'}`);
                });
            }
        }

    } catch (error) {
        console.error('💥 Investigation error:', error.response?.data || error.message);
    }
}

// Run the investigation
checkInvitationWorkflow();