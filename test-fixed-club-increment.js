const axios = require('axios');

async function testFixedClubIncrement() {
    try {
        const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MywidXVpZCI6IjkyNjk4YTA4LTZhNmMtNDk5OS1hZTA1LWY3ZGI5ZTdkYTg1OCIsImVtYWlsIjoiam9obnNvbkBleGFtcGxlLmNvbSIsInJvbGUiOiJ1c2VyIiwidXNlcm5hbWUiOiJqb2huc29uIiwiaWF0IjoxNTc3MzYyMzA4LCJleHAiOjE3NTc0NDg3MDh9.Dj73pAObMAnUANyQO4jnMGrnpyyiuaEvIseMo77PHL8';
        
        console.log('🏢 Testing club increment with REAL activity ID (796)...');
        
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
                "activity_id": 796  // Real activity ID from previous test
            }
        });
        
        console.log('✅ Club increment with activity_id response:', clubResponse.data);
        
        console.log('📊 Now checking if count increased...');
        const clubsResponse = await axios({
            method: 'GET',
            url: 'https://gruju-backend-5014424c95f2.herokuapp.com/api/clubs',
            headers: {
                'Accept': 'application/json, text/plain, */*',
                'Authorization': `Bearer ${token}`
            }
        });
        
        const cascadeClub = clubsResponse.data.clubs.find(c => 
            c.website_url && c.website_url.includes('cascadecamps')
        );
        
        console.log('🏢 Cascade Camps usage count:', cascadeClub ? cascadeClub.usage_count : 'Not found');
        
    } catch (error) {
        console.error('❌ Error:', error.response?.status, error.response?.data || error.message);
    }
}

testFixedClubIncrement();