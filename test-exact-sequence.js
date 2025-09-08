const axios = require('axios');

async function testExactSequence() {
    try {
        const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MywidXVpZCI6IjkyNjk4YTA4LTZhNmMtNDk5OS1hZTA1LWY3ZGI5ZTdkYTg1OCIsImVtYWlsIjoiam9obnNvbkBleGFtcGxlLmNvbSIsInJvbGUiOiJ1c2VyIiwidXNlcm5hbWUiOiJqb2huc29uIiwiaWF0IjoxNzU3MzYyMzA4LCJleHAiOjE3NTc0NDg3MDh9.Dj73pAObMAnUANyQO4jnMGrnpyyiuaEvIseMo77PHL8';
        
        console.log('🎯 Testing the exact sequence from your curl logs...\n');
        
        // Step 1: Create activity (your exact call)
        console.log('1️⃣ Creating activity...');
        const activityResponse = await axios({
            method: 'POST',
            url: 'https://gruju-backend-5014424c95f2.herokuapp.com/api/activities/1610aa62-a602-42e8-9079-91ffc3aea07c',
            headers: {
                'Accept': 'application/json, text/plain, */*',
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            data: {
                "name": "web57-test",
                "description": "",
                "start_date": "2025-09-24",
                "end_date": "2025-09-24",
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
        
        console.log('✅ Activity created!');
        console.log('Response structure:', JSON.stringify(activityResponse.data, null, 2));
        
        const activityId = activityResponse.data?.data?.id;
        console.log('📋 Extracted activity ID:', activityId);
        
        // Step 2: Increment club usage (what your frontend is doing - WITHOUT activity_id)
        console.log('\n2️⃣ Testing club increment WITHOUT activity_id (broken behavior)...');
        const brokenResponse = await axios({
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
                "child_age": 8,
                "activity_start_date": "2025-09-24"
                // MISSING: "activity_id": activityId
            }
        });
        
        console.log('❌ Broken increment response:', brokenResponse.data);
        
        // Step 3: Test club increment WITH activity_id (fixed behavior)
        if (activityId) {
            console.log('\n3️⃣ Testing club increment WITH activity_id (fixed behavior)...');
            const fixedResponse = await axios({
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
                    "child_age": 8,
                    "activity_start_date": "2025-09-24",
                    "activity_id": activityId  // NOW INCLUDING THE ACTIVITY ID
                }
            });
            
            console.log('✅ Fixed increment response:', fixedResponse.data);
        }
        
        // Step 4: Check final club count
        console.log('\n4️⃣ Checking final club count...');
        const clubsResponse = await axios({
            method: 'GET',
            url: 'https://gruju-backend-5014424c95f2.herokuapp.com/api/clubs',
            headers: {
                'Accept': 'application/json, text/plain, */*',
                'Authorization': `Bearer ${token}`
            }
        });
        
        const cascadeClub = clubsResponse.data?.find(c => 
            c.website_url && c.website_url.includes('cascadecamps.angelfishbooking.co.uk')
        );
        
        if (cascadeClub) {
            console.log('🏢 Final Cascade Camps usage count:', cascadeClub.usage_count);
        }
        
    } catch (error) {
        console.error('❌ Error:', error.response?.status, error.response?.data || error.message);
        if (error.response?.data) {
            console.error('Full error data:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

testExactSequence();