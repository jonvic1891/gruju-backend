const axios = require('axios');

const BASE_URL = 'https://gruju-backend-5014424c95f2.herokuapp.com';

async function testClubFullFlow() {
    try {
        // Create a new test user
        const testEmail = `testuser${Date.now()}@example.com`;
        console.log('👤 Creating test user:', testEmail);
        
        const signupResponse = await axios.post(`${BASE_URL}/api/auth/signup`, {
            email: testEmail,
            password: 'Password123!',
            first_name: 'Test',
            last_name: 'User',
            phone_number: '+1234567890'
        });
        
        if (!signupResponse.data.success) {
            throw new Error('Signup failed: ' + JSON.stringify(signupResponse.data));
        }
        
        console.log('✅ User created successfully');
        
        // Login with the new user
        console.log('🔐 Logging in...');
        const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
            email: testEmail,
            password: 'Password123!'
        });
        
        const token = loginResponse.data.token;
        console.log('✅ Login successful');
        
        // Add a child
        console.log('👶 Adding child...');
        const childResponse = await axios.post(`${BASE_URL}/api/children`, {
            name: 'Test Child',
            age: 8,
            interests: 'Sports, Swimming'
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        const child = childResponse.data.child;
        console.log('✅ Child added:', child.name, child.uuid);
        
        // Check current club count for Cascade Camps
        console.log('📊 Checking current club count...');
        const clubsBefore = await axios.get(`${BASE_URL}/api/clubs`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        const cascadeClub = clubsBefore.data.clubs.find(c => 
            c.website_url && c.website_url.includes('cascadecamps')
        );
        console.log('🏢 Cascade Camps before:', cascadeClub ? `usage_count: ${cascadeClub.usage_count}` : 'Not found');
        
        // Create activity with both website_url and activity_type (using PUT like the frontend does)
        console.log('🎯 Creating activity via PUT endpoint (like frontend)...');
        const activityData = {
            name: `Full Flow Test ${Date.now()}`,
            description: 'Full flow test activity to verify club increment',
            start_date: '2024-12-17',
            start_time: '10:00',
            end_time: '12:00',
            location: 'Test Location',
            website_url: 'https://cascadecamps.co.uk',
            activity_type: 'Sports',
            cost: '25',
            max_participants: '8',
            auto_notify_new_connections: false
        };
        
        const activityResponse = await axios.put(
            `${BASE_URL}/api/activities/${child.uuid}`,
            activityData,
            { headers: { Authorization: `Bearer ${token}` } }
        );
        
        console.log('✅ Activity created via PUT endpoint');
        const createdActivity = activityResponse.data.activities[0];
        console.log('📝 Activity ID:', createdActivity.id);
        
        // Test the new club increment API endpoint that the frontend should call
        console.log('🏢 Testing club increment API...');
        const clubIncrementResponse = await axios.post(
            `${BASE_URL}/api/clubs/increment-usage`,
            {
                website_url: activityData.website_url,
                activity_type: activityData.activity_type,
                location: activityData.location,
                child_age: child.age,
                activity_start_date: activityData.start_date,
                activity_id: createdActivity.id
            },
            { headers: { Authorization: `Bearer ${token}` } }
        );
        
        console.log('✅ Club increment API response:', clubIncrementResponse.data);
        
        // Check club count after increment
        console.log('📊 Checking club count after increment...');
        const clubsAfter = await axios.get(`${BASE_URL}/api/clubs`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        const cascadeClubAfter = clubsAfter.data.clubs.find(c => 
            c.website_url && c.website_url.includes('cascadecamps')
        );
        console.log('🏢 Cascade Camps after:', cascadeClubAfter ? `usage_count: ${cascadeClubAfter.usage_count}` : 'Not found');
        
        if (cascadeClub && cascadeClubAfter) {
            const increment = cascadeClubAfter.usage_count - cascadeClub.usage_count;
            console.log(`📈 Usage count change: +${increment}`);
            
            if (increment > 0) {
                console.log('✅ SUCCESS: Club usage incremented correctly!');
                console.log('🎉 Frontend-Backend integration working properly!');
            } else {
                console.log('❌ FAILURE: Club usage did not increment');
            }
        } else if (cascadeClubAfter && !cascadeClub) {
            console.log('✅ SUCCESS: New club created with usage_count:', cascadeClubAfter.usage_count);
            console.log('🎉 Frontend-Backend integration working properly!');
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
    }
}

testClubFullFlow();