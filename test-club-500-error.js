const axios = require('axios');

async function testClub500Error() {
    try {
        // Test the exact request that's causing the 500 error
        const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MywidXVpZCI6IjkyNjk4YTA4LTZhNmMtNDk5OS1hZTA1LWY3ZGI5ZTdkYTg1OCIsImVtYWlsIjoiam9obnNvbkBleGFtcGxlLmNvbSIsInJvbGUiOiJ1c2VyIiwidXNlcm5hbWUiOiJqb2huc29uIiwiaWF0IjoxNzU3MzYyMzA4LCJleHAiOjE3NTc0NDg3MDh9.Dj73pAObMAnUANyQO4jnMGrnpyyiuaEvIseMo77PHL8';
        
        console.log('🔍 Testing club increment API with exact failing data...');
        
        const response = await axios.post('https://gruju-backend-5014424c95f2.herokuapp.com/api/clubs/increment-usage', {
            "website_url": "https://cascadecamps.angelfishbooking.co.uk/",
            "activity_type": "Multi-Sport",
            "location": "Tring",
            "child_age": 10,
            "activity_start_date": "2025-09-18"
        }, {
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✅ Success:', response.data);
        
    } catch (error) {
        console.error('❌ Error status:', error.response?.status);
        console.error('❌ Error data:', error.response?.data);
        console.error('❌ Error message:', error.message);
        
        if (error.response?.status === 500) {
            console.log('🔍 This is the 500 error we need to fix');
        }
    }
}

testClub500Error();