const axios = require('axios');

async function testClubWithActivityId() {
    try {
        const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MywidXVpZCI6IjkyNjk4YTA4LTZhNmMtNDk5OS1hZTA1LWY3ZGI5ZTdkYTg1OCIsImVtYWlsIjoiam9obnNvbkBleGFtcGxlLmNvbSIsInJvbGUiOiJ1c2VyIiwidXNlcm5hbWUiOiJqb2huc29uIiwiaWF0IjoxNzU3MzYyMzA4LCJleHAiOjE3NTc0NDg3MDh9.Dj73pAObMAnUANyQO4jnMGrnpyyiuaEvIseMo77PHL8';
        
        console.log('🔍 Testing club increment API with activity_id...');
        
        const response = await axios.post('https://gruju-backend-5014424c95f2.herokuapp.com/api/clubs/increment-usage', {
            "website_url": "https://cascadecamps.co.uk",
            "activity_type": "Sports",
            "location": "Test Location",
            "child_age": 8,
            "activity_start_date": "2025-09-20"
            // No activity_id - testing without it
        }, {
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✅ Success with activity_id:', response.data);
        
        console.log('🔍 Testing club increment API without activity_id...');
        
        const response2 = await axios.post('https://gruju-backend-5014424c95f2.herokuapp.com/api/clubs/increment-usage', {
            "website_url": "https://testclub.com",
            "activity_type": "Drama",
            "location": "London",
            "child_age": 7,
            "activity_start_date": "2025-09-21"
        }, {
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✅ Success without activity_id:', response2.data);
        
    } catch (error) {
        console.error('❌ Error:', error.response?.status, error.response?.data);
    }
}

testClubWithActivityId();