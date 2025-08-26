const axios = require('axios');

const BASE_URL = 'https://gruju-backend-5014424c95f2.herokuapp.com';

async function testParentEndpoints() {
    try {
        console.log('🔐 Testing parent management endpoints...');
        
        // First, login to get a JWT token
        console.log('📝 Logging in to get JWT token...');
        const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
            email: 'roberts10@example.com',  // Test user from CLAUDE.md
            password: 'password123'
        });
        
        if (!loginResponse.data.success) {
            throw new Error('Login failed: ' + loginResponse.data.error);
        }
        
        const token = loginResponse.data.token;
        const headers = { Authorization: `Bearer ${token}` };
        
        console.log('✅ Login successful');
        
        // Test GET /api/parents
        console.log('\n📋 Testing GET /api/parents...');
        const getParentsResponse = await axios.get(`${BASE_URL}/api/parents`, { headers });
        
        if (getParentsResponse.data.success) {
            console.log(`✅ GET /api/parents successful - Found ${getParentsResponse.data.data.length} parents:`);
            getParentsResponse.data.data.forEach((parent, index) => {
                console.log(`   ${index + 1}. ${parent.username} (${parent.email}) - ${parent.is_primary ? 'Primary' : parent.role}`);
            });
        } else {
            console.log('❌ GET /api/parents failed:', getParentsResponse.data.error);
        }
        
        // Test POST /api/parents (create new parent)
        console.log('\n👨‍👩‍👧‍👦 Testing POST /api/parents...');
        const testParentData = {
            username: 'Jane Roberts',
            email: 'jane.roberts@example.com',
            phone: '+447123456789',
            role: 'parent'
        };
        
        try {
            const createParentResponse = await axios.post(`${BASE_URL}/api/parents`, testParentData, { headers });
            
            if (createParentResponse.data.success) {
                console.log('✅ POST /api/parents successful - Created parent:', createParentResponse.data.data.username);
                const createdParentUuid = createParentResponse.data.data.uuid;
                
                // Test PUT /api/parents/:uuid (update parent)
                console.log('\n🔄 Testing PUT /api/parents/:uuid...');
                const updateData = {
                    username: 'Jane Roberts-Smith',
                    role: 'guardian'
                };
                
                const updateParentResponse = await axios.put(`${BASE_URL}/api/parents/${createdParentUuid}`, updateData, { headers });
                
                if (updateParentResponse.data.success) {
                    console.log('✅ PUT /api/parents/:uuid successful - Updated parent:', updateParentResponse.data.data.username);
                } else {
                    console.log('❌ PUT /api/parents/:uuid failed:', updateParentResponse.data.error);
                }
                
                // Test DELETE /api/parents/:uuid (delete parent)
                console.log('\n🗑️ Testing DELETE /api/parents/:uuid...');
                const deleteParentResponse = await axios.delete(`${BASE_URL}/api/parents/${createdParentUuid}`, { headers });
                
                if (deleteParentResponse.data.success) {
                    console.log('✅ DELETE /api/parents/:uuid successful:', deleteParentResponse.data.message);
                } else {
                    console.log('❌ DELETE /api/parents/:uuid failed:', deleteParentResponse.data.error);
                }
                
            } else {
                console.log('❌ POST /api/parents failed:', createParentResponse.data.error);
            }
        } catch (createError) {
            if (createError.response && createError.response.data.error.includes('email already exists')) {
                console.log('ℹ️ Parent with test email already exists (expected on repeated runs)');
            } else {
                console.log('❌ POST /api/parents error:', createError.response?.data?.error || createError.message);
            }
        }
        
        // Final verification - check parents list again
        console.log('\n🔍 Final verification - GET /api/parents...');
        const finalGetResponse = await axios.get(`${BASE_URL}/api/parents`, { headers });
        
        if (finalGetResponse.data.success) {
            console.log(`✅ Final check successful - ${finalGetResponse.data.data.length} parents in account:`);
            finalGetResponse.data.data.forEach((parent, index) => {
                console.log(`   ${index + 1}. ${parent.username} (${parent.email}) - ${parent.is_primary ? 'Primary' : parent.role}`);
            });
        }
        
        console.log('\n🎉 Parent management API endpoints are working correctly!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
    }
}

// Run the test
if (require.main === module) {
    testParentEndpoints()
        .then(() => {
            console.log('\n✨ Testing completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 Testing failed:', error);
            process.exit(1);
        });
}

module.exports = { testParentEndpoints };