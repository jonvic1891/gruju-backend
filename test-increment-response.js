const axios = require('axios');

async function testIncrementResponse() {
    try {
        const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MywidXVpZCI6IjkyNjk4YTA4LTZhNmMtNDk5OS1hZTA1LWY3ZGI5ZTdkYTg1OCIsImVtYWlsIjoiam9obnNvbkBleGFtcGxlLmNvbSIsInJvbGUiOiJ1c2VyIiwidXNlcm5hbWUiOiJqb2huc29uIiwiaWF0IjoxNzU3MzYyMzA4LCJleHAiOjE3NTc0NDg3MDh9.Dj73pAObMAnUANyQO4jnMGrnpyyiuaEvIseMo77PHL8';
        
        console.log('🧪 Testing increment API response with old/new values...\n');
        
        // Create a new activity first
        console.log('1️⃣ Creating new activity...');
        const childUuid = '1610aa62-a602-42e8-9079-91ffc3aea07c';
        const activityResponse = await axios({
            method: 'POST',
            url: 'https://gruju-backend-5014424c95f2.herokuapp.com/api/activities/' + childUuid,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            data: {
                "name": "increment-test-" + Date.now(),
                "description": "",
                "start_date": "2025-09-26",
                "end_date": "2025-09-26",
                "start_time": "",
                "end_time": "",
                "location": "Tring",
                "website_url": "https://cascadecamps.angelfishbooking.co.uk/",
                "activity_type": "Multi-Sport",
                "auto_notify_new_connections": false,
                "is_shared": false,
                "series_id": null,
                "is_recurring": false
            }
        });
        
        const activityUuid = activityResponse.data?.data?.uuid;
        console.log('✅ Activity created with UUID:', activityUuid);
        
        // Test the increment API
        console.log('\n2️⃣ Calling increment API...');
        const incrementResponse = await axios({
            method: 'POST',
            url: 'https://gruju-backend-5014424c95f2.herokuapp.com/api/clubs/increment-usage',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            data: {
                "website_url": "https://cascadecamps.angelfishbooking.co.uk/",
                "activity_type": "Multi-Sport",
                "location": "Tring",
                "child_age": 8,
                "activity_start_date": "2025-09-26",
                "activity_uuid": activityUuid
            }
        });
        
        console.log('\n🔍 DETAILED INCREMENT RESPONSE:');
        console.log(JSON.stringify(incrementResponse.data, null, 2));
        
        // Verify by checking clubs API
        console.log('\n3️⃣ Verifying via clubs API...');
        const clubsResponse = await axios({
            method: 'GET',
            url: 'https://gruju-backend-5014424c95f2.herokuapp.com/api/clubs',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const cascadeClub = clubsResponse.data?.data?.find(c => 
            c.website_url && c.website_url.includes('cascadecamps.angelfishbooking.co.uk')
        );
        
        if (cascadeClub) {
            console.log('📊 Current club count from /api/clubs:', cascadeClub.usage_count);
            console.log('📊 Count from increment response:', incrementResponse.data.new_usage_count);
            
            if (cascadeClub.usage_count == incrementResponse.data.new_usage_count) {
                console.log('✅ Counts match!');
            } else {
                console.log('❌ Counts DO NOT match!');
            }
        }
        
    } catch (error) {
        console.error('❌ Error:', error.response?.status, error.response?.data || error.message);
        if (error.response?.data) {
            console.error('Full error data:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

testIncrementResponse();