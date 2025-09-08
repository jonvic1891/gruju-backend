const axios = require('axios');

async function testUuidFix() {
    try {
        const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MywidXVpZCI6IjkyNjk4YTA4LTZhNmMtNDk5OS1hZTA1LWY3ZGI5ZTdkYTg1OCIsImVtYWlsIjoiam9obnNvbkBleGFtcGxlLmNvbSIsInJvbGUiOiJ1c2VyIiwidXNlcm5hbWUiOiJqb2huc29uIiwiaWF0IjoxNzU3MzYyMzA4LCJleHAiOjE3NTc0NDg3MDh9.Dj73pAObMAnUANyQO4jnMGrnpyyiuaEvIseMo77PHL8';
        
        console.log('🧪 Testing UUID fix for club increment...\n');
        
        // Get current club count
        console.log('1️⃣ Getting current club count...');
        const clubsResponse = await axios({
            method: 'GET',
            url: 'https://gruju-backend-5014424c95f2.herokuapp.com/api/clubs',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        console.log('Clubs response keys:', Object.keys(clubsResponse.data));
        console.log('Clubs response data type:', Array.isArray(clubsResponse.data));
        
        const clubsArray = Array.isArray(clubsResponse.data) ? clubsResponse.data : clubsResponse.data?.data;
        console.log('Clubs array length:', clubsArray?.length);
        
        const cascadeClub = clubsArray?.find(c => 
            c.website_url && c.website_url.includes('cascadecamps.angelfishbooking.co.uk')
        );
        
        const initialCount = cascadeClub ? cascadeClub.usage_count : 0;
        console.log('🏢 Initial Cascade Camps usage count:', initialCount);
        
        // Create activity and get UUID
        console.log('\n2️⃣ Creating activity...');
        const childUuid = '1610aa62-a602-42e8-9079-91ffc3aea07c';
        const activityResponse = await axios({
            method: 'POST',
            url: 'https://gruju-backend-5014424c95f2.herokuapp.com/api/activities/' + childUuid,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            data: {
                "name": "UUID-fix-test-" + Date.now(),
                "description": "",
                "start_date": "2025-09-25",
                "end_date": "2025-09-25",
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
        
        if (!activityUuid) {
            throw new Error('No UUID returned from activity creation!');
        }
        
        // Test club increment with UUID
        console.log('\n3️⃣ Testing club increment with activity_uuid...');
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
                "activity_start_date": "2025-09-25",
                "activity_uuid": activityUuid  // Using UUID instead of ID!
            }
        });
        
        console.log('✅ Club increment response:', incrementResponse.data);
        
        // Check updated count
        console.log('\n4️⃣ Checking updated count...');
        const updatedClubsResponse = await axios({
            method: 'GET',
            url: 'https://gruju-backend-5014424c95f2.herokuapp.com/api/clubs',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const updatedClubsArray = Array.isArray(updatedClubsResponse.data) ? updatedClubsResponse.data : updatedClubsResponse.data?.data;
        const updatedCascadeClub = updatedClubsArray?.find(c => 
            c.website_url && c.website_url.includes('cascadecamps.angelfishbooking.co.uk')
        );
        
        const finalCount = updatedCascadeClub ? updatedCascadeClub.usage_count : 0;
        console.log('🏢 Final Cascade Camps usage count:', finalCount);
        
        if (parseInt(finalCount) > parseInt(initialCount)) {
            console.log('\n🎉 SUCCESS! Count increased from', initialCount, 'to', finalCount);
            console.log('✅ UUID fix is working correctly!');
        } else {
            console.log('\n❌ FAILED! Count did not increase');
            console.log('Expected count > ' + initialCount + ' but got ' + finalCount);
        }
        
    } catch (error) {
        console.error('❌ Error:', error.response?.status, error.response?.data || error.message);
        if (error.response?.data) {
            console.error('Full error data:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

testUuidFix();