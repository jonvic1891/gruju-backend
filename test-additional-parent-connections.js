const axios = require('axios');

const API_BASE_URL = 'https://gruju-backend-5014424c95f2.herokuapp.com';

async function testAdditionalParentConnections() {
    try {
        console.log('🧪 Testing Additional Parent Connection Requests...\n');
        
        // Login as Victoria Owen-Roberts (additional parent)
        console.log('🔐 Step 1: Login as Victoria Owen-Roberts (additional parent)...');
        const loginResponse = await axios.post(`${API_BASE_URL}/api/auth/login`, {
            email: 'Vic@example.com',
            password: 'test123'
        });
        
        if (!loginResponse.data.success) {
            console.log('❌ Login failed:', loginResponse.data.error);
            return;
        }
        
        console.log('✅ Login successful!');
        console.log(`   User: ${loginResponse.data.user.username} (${loginResponse.data.user.email})`);
        console.log(`   User ID: ${loginResponse.data.user.id || 'N/A'}\n`);
        
        const token = loginResponse.data.token;
        const headers = { Authorization: `Bearer ${token}` };
        
        // Get children (should see the shared children)
        console.log('👶 Step 2: Testing /api/children endpoint...');
        const childrenResponse = await axios.get(`${API_BASE_URL}/api/children`, { headers });
        
        if (!childrenResponse.data.success) {
            console.log('❌ Children endpoint failed:', childrenResponse.data.error);
            return;
        }
        
        console.log('✅ Children endpoint successful!');
        console.log(`   Found ${childrenResponse.data.data.length} children:`);
        childrenResponse.data.data.forEach((child, i) => {
            console.log(`   ${i+1}. ${child.display_name} (${child.uuid})`);
        });
        console.log('');
        
        if (childrenResponse.data.data.length === 0) {
            console.log('❌ No children found - cannot test connection requests');
            return;
        }
        
        const childUuid = childrenResponse.data.data[0].uuid;
        
        // Search for a parent to connect with
        console.log('🔍 Step 3: Search for parent to connect with...');
        const searchResponse = await axios.get(`${API_BASE_URL}/api/connections/search?q=johnson@example.com`, { headers });
        
        if (!searchResponse.data.success) {
            console.log('❌ Search failed:', searchResponse.data.error);
            return;
        }
        
        console.log('✅ Search successful!');
        console.log(`   Found ${searchResponse.data.data.length} results`);
        console.log('   Full search results:', JSON.stringify(searchResponse.data.data, null, 2));
        
        if (searchResponse.data.data.length === 0) {
            console.log('❌ No search results - cannot test connection requests');
            return;
        }
        
        const targetParent = searchResponse.data.data[0];
        const targetChild = targetParent.children[0];
        
        console.log(`   Target Parent: ${targetParent.username}`);
        console.log(`   Target Parent UUID: ${targetParent.user_uuid || 'MISSING'}`);  
        console.log(`   Target Child: ${targetChild.name} (${targetChild.uuid})\n`);
        
        // Create connection request
        console.log('📝 Step 4: Creating connection request...');
        const connectionRequest = {
            target_parent_id: targetParent.user_uuid,
            child_uuid: childUuid,
            target_child_uuid: targetChild.uuid
        };
        
        const requestResponse = await axios.post(`${API_BASE_URL}/api/connections/request`, connectionRequest, { headers });
        
        if (requestResponse.data.success) {
            console.log('✅ Connection request created successfully!');
            console.log(`   Response:`, requestResponse.data);
            if (requestResponse.data.data) {
                console.log(`   Request UUID: ${requestResponse.data.data.uuid || 'N/A'}`);
                console.log(`   Status: ${requestResponse.data.data.status || 'N/A'}`);
            }
        } else {
            console.log('❌ Connection request failed:', requestResponse.data.error);
            return;
        }
        
        // Get sent requests to verify
        console.log('\n📤 Step 5: Checking sent requests...');
        const sentRequestsResponse = await axios.get(`${API_BASE_URL}/api/connections/sent-requests`, { headers });
        
        if (sentRequestsResponse.data.success) {
            console.log('✅ Sent requests retrieved successfully!');
            console.log(`   Found ${sentRequestsResponse.data.data.length} sent requests:`);
            sentRequestsResponse.data.data.forEach((req, i) => {
                console.log(`   ${i+1}. To: ${req.target_parent_name} - Status: ${req.status}`);
                console.log(`      Child: ${req.child_name} -> ${req.target_child_name}`);
            });
        } else {
            console.log('❌ Sent requests failed:', sentRequestsResponse.data.error);
        }
        
        console.log('\n🎉 Additional parent connection requests working correctly!');
        
    } catch (error) {
        console.error('❌ Test failed:', {
            message: error.message,
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data
        });
    }
}

testAdditionalParentConnections();