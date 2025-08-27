const axios = require('axios');

const API_BASE_URL = 'https://gruju-backend-5014424c95f2.herokuapp.com';

async function testAdditionalParentAccess() {
    try {
        console.log('🧪 Testing Additional Parent Access...\n');
        
        // First, let's find the additional parent credentials
        console.log('📋 Additional Parent Details (from debug script):');
        console.log('   Email: Jon@example.com');
        console.log('   Username: jon test');
        console.log('   UUID: 3e01656e-70ea-40bc-8fe4-5fccca8414eb');
        console.log('   Account UUID: 98ec495f-618d-4aef-9de4-8d087d3f3d24\n');
        
        console.log('📋 Expected Children (linked to account user ID 102):');
        console.log('   1. Charlie Owen-Roberts (7c0169e0-d624-4e60-b54e-4a632a8b31c4)');
        console.log('   2. Emilia Owen-Roberts (f31db3e0-f381-46c5-b02e-cf558c3c73c3)\n');
        
        // Try to login as the additional parent
        console.log('🔐 Step 1: Login as additional parent...');
        const loginResponse = await axios.post(`${API_BASE_URL}/api/auth/login`, {
            email: 'Jon@example.com',
            password: 'password123' // This was the password used when creating
        });
        
        if (loginResponse.data.success) {
            console.log('✅ Login successful!');
            console.log(`   Token: ${loginResponse.data.token.substring(0, 20)}...`);
            console.log(`   User: ${loginResponse.data.user.username} (${loginResponse.data.user.email})\n`);
            
            const token = loginResponse.data.token;
            const headers = { Authorization: `Bearer ${token}` };
            
            // Test accessing children
            console.log('👶 Step 2: Testing /api/children endpoint...');
            const childrenResponse = await axios.get(`${API_BASE_URL}/api/children`, { headers });
            
            if (childrenResponse.data.success) {
                console.log('✅ Children endpoint successful!');
                console.log(`   Found ${childrenResponse.data.data.length} children:`);
                childrenResponse.data.data.forEach((child, i) => {
                    console.log(`   ${i+1}. ${child.display_name} (${child.uuid})`);
                });
                console.log('');
            } else {
                console.log('❌ Children endpoint failed:', childrenResponse.data.error);
            }
            
            // Test accessing calendar activities
            console.log('📅 Step 3: Testing /api/calendar/activities endpoint...');
            const activitiesResponse = await axios.get(`${API_BASE_URL}/api/calendar/activities`, { headers });
            
            if (activitiesResponse.data.success) {
                console.log('✅ Calendar activities endpoint successful!');
                console.log(`   Found ${activitiesResponse.data.data.length} activities`);
                activitiesResponse.data.data.forEach((activity, i) => {
                    console.log(`   ${i+1}. ${activity.name} (Child: ${activity.child_name})`);
                });
            } else {
                console.log('❌ Calendar activities endpoint failed:', activitiesResponse.data.error);
            }
            
        } else {
            console.log('❌ Login failed:', loginResponse.data.error);
        }
        
    } catch (error) {
        console.error('❌ Test failed:', {
            message: error.message,
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data
        });
    }
}

testAdditionalParentAccess();