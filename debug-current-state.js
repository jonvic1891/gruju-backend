const axios = require('axios');

async function debugCurrentState() {
    try {
        const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MywidXVpZCI6IjkyNjk4YTA4LTZhNmMtNDk5OS1hZTA1LWY3ZGI5ZTdkYTg1OCIsImVtYWlsIjoiam9obnNvbkBleGFtcGxlLmNvbSIsInJvbGUiOiJ1c2VyIiwidXNlcm5hbWUiOiJqb2huc29uIiwiaWF0IjoxNzU3MzYyMzA4LCJleHAiOjE3NTc0NDg3MDh9.Dj73pAObMAnUANyQO4jnMGrnpyyiuaEvIseMo77PHL8';
        
        console.log('🔍 Checking current clubs state...');
        
        // Get current clubs data
        const clubsResponse = await axios({
            method: 'GET',
            url: 'https://gruju-backend-5014424c95f2.herokuapp.com/api/clubs',
            headers: {
                'Accept': 'application/json, text/plain, */*',
                'Authorization': `Bearer ${token}`
            }
        });
        
        console.log('🔍 Clubs response structure:', Object.keys(clubsResponse.data));
        console.log('🔍 Full response:', JSON.stringify(clubsResponse.data, null, 2));
        
        const cascadeClub = clubsResponse.data?.find(c => 
            c.website_url && c.website_url.includes('cascadecamps')
        );
        
        if (cascadeClub) {
            console.log('🏢 Current Cascade Camps data:');
            console.log('- Usage Count:', cascadeClub.usage_count);
            console.log('- First Used:', cascadeClub.first_used_date);
            console.log('- Last Used:', cascadeClub.last_used_date);
            console.log('- Website URL:', cascadeClub.website_url);
            console.log('- Location:', cascadeClub.location);
            console.log('- Activity Type:', cascadeClub.activity_type);
        } else {
            console.log('❌ Cascade Camps club not found!');
        }
        
        console.log('\n🎯 Now creating a new test activity...');
        
        // Create a new activity - using the child UUID from the logs
        const childUuid = '1610aa62-a602-42e8-9079-91ffc3aea07c'; // Emma Johnson's UUID
        const activityResponse = await axios({
            method: 'POST',
            url: 'https://gruju-backend-5014424c95f2.herokuapp.com/api/activities/' + childUuid,
            headers: {
                'Accept': 'application/json, text/plain, */*',
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            data: {
                "name": "debug-test-activity-" + Date.now(),
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
        
        console.log('✅ Activity created with response keys:', Object.keys(activityResponse.data));
        console.log('Response structure:', JSON.stringify(activityResponse.data, null, 2));
        
        const activityId = activityResponse.data?.data?.id;
        console.log('📋 Activity ID for club increment:', activityId);
        
        if (activityId) {
            console.log('\n🏢 Now testing club increment...');
            
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
            
            // Check the count again
            console.log('\n📊 Checking clubs count again...');
            const clubsResponse2 = await axios({
                method: 'GET',
                url: 'https://gruju-backend-5014424c95f2.herokuapp.com/api/clubs',
                headers: {
                    'Accept': 'application/json, text/plain, */*',
                    'Authorization': `Bearer ${token}`
                }
            });
            
            const cascadeClub2 = clubsResponse2.data?.find(c => 
                c.website_url && c.website_url.includes('cascadecamps')
            );
            
            if (cascadeClub2) {
                console.log('🏢 Updated Cascade Camps data:');
                console.log('- Usage Count:', cascadeClub2.usage_count, '(was', cascadeClub ? cascadeClub.usage_count : 'unknown', ')');
                console.log('- First Used:', cascadeClub2.first_used_date);
                console.log('- Last Used:', cascadeClub2.last_used_date);
            }
        }
        
    } catch (error) {
        console.error('❌ Error:', error.response?.status, error.response?.data || error.message);
        if (error.response?.data) {
            console.error('Full error data:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

debugCurrentState();