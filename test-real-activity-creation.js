const axios = require('axios');

async function testRealActivityCreation() {
    try {
        const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MywidXVpZCI6IjkyNjk4YTA4LTZhNmMtNDk5OS1hZTA1LWY3ZGI5ZTdkYTg1OCIsImVtYWlsIjoiam9obnNvbkBleGFtcGxlLmNvbSIsInJvbGUiOiJ1c2VyIiwidXNlcm5hbWUiOiJqb2huc29uIiwiaWF0IjoxNzU3MzYyMzA4LCJleHAiOjE3NTc0NDg3MDh9.Dj73pAObMAnUANyQO4jnMGrnpyyiuaEvIseMo77PHL8';
        
        console.log('🎯 Testing exact activity creation from your logs...');
        
        // Your exact activity creation call
        const activityResponse = await axios({
            method: 'PUT',
            url: 'https://gruju-backend-5014424c95f2.herokuapp.com/api/activities/5bf4af26-c42d-4db6-9e79-d16f43a3b982',
            headers: {
                'Accept': 'application/json, text/plain, */*',
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            data: {
                "name": "test-debug-activity",
                "description": "",
                "start_date": "2025-09-19",
                "end_date": "2025-09-19",
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
        
        console.log('✅ Activity creation response:');
        console.log('Status:', activityResponse.status);
        console.log('Data keys:', Object.keys(activityResponse.data));
        console.log('Full data:', JSON.stringify(activityResponse.data, null, 2));
        
        // Check what ID we should use
        const activityId = activityResponse.data?.id || activityResponse.data?.activities?.[0]?.id;
        console.log('📋 Activity ID for club increment:', activityId);
        
        if (activityId) {
            console.log('🏢 Now testing club increment with the actual activity ID...');
            
            const clubResponse = await axios({
                method: 'POST',
                url: 'https://gruju-backend-5014424c95f2.herokuapp.com/api/clubs/increment-usage',
                headers: {
                    'Accept': 'application/json, text/plain, */*',
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                data: {
                    "website_url": "https://cascadecamps.angelfishbooking.co.uk/",
                    "activity_type": "Multi-Sport",
                    "location": "Tring",
                    "child_age": 10,
                    "activity_start_date": "2025-09-19",
                    "activity_id": activityId
                }
            });
            
            console.log('✅ Club increment response:', clubResponse.data);
        } else {
            console.log('❌ No activity ID found in response - this is why club increment has no activity_id!');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.response?.status, error.response?.data || error.message);
    }
}

testRealActivityCreation();