const axios = require('axios');

const BASE_URL = 'https://gruju-backend-5014424c95f2.herokuapp.com';

async function testClubIncrement() {
    try {
        // Login as roberts10@example.com (has Emilia 10)
        console.log('🔐 Logging in...');
        const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
            email: 'roberts10@example.com',
            password: 'Password123!'
        });
        
        const token = loginResponse.data.token;
        console.log('✅ Login successful');
        
        // Get user data to find child UUID
        const userResponse = await axios.get(`${BASE_URL}/api/auth/me`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        const child = userResponse.data.user.children[0]; // Emilia
        console.log('👧 Found child:', child.name, child.uuid);
        
        // Check current club count for Cascade Camps
        console.log('📊 Checking current club count...');
        const clubsBefore = await axios.get(`${BASE_URL}/api/clubs`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        const cascadeClub = clubsBefore.data.clubs.find(c => 
            c.website_url && c.website_url.includes('cascadecamps')
        );
        console.log('🏢 Cascade Camps before:', cascadeClub ? `usage_count: ${cascadeClub.usage_count}` : 'Not found');
        
        // Create activity with both website_url and activity_type
        console.log('🎯 Creating activity with website and activity type...');
        const activityData = {
            name: `Test Activity ${Date.now()}`,
            description: 'Test activity to verify club increment',
            start_date: '2024-12-15',
            start_time: '10:00',
            end_time: '12:00',
            location: 'Test Location',
            website_url: 'https://cascadecamps.co.uk',
            activity_type: 'Sports',
            cost: '25',
            max_participants: '10',
            auto_notify_new_connections: false
        };
        
        const activityResponse = await axios.post(
            `${BASE_URL}/api/activities/${child.uuid}`,
            activityData,
            { headers: { Authorization: `Bearer ${token}` } }
        );
        
        console.log('✅ Activity created:', activityResponse.data.activities[0].uuid);
        
        // Check club count after
        console.log('📊 Checking club count after creation...');
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
            } else {
                console.log('❌ FAILURE: Club usage did not increment');
            }
        } else if (cascadeClubAfter && !cascadeClub) {
            console.log('✅ SUCCESS: New club created with usage_count:', cascadeClubAfter.usage_count);
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
    }
}

testClubIncrement();