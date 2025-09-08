const axios = require('axios');

async function testClubApiDirect() {
    try {
        console.log('🏢 Testing club increment API directly...');
        
        // Test the club increment endpoint without authentication first
        const response = await axios.post('https://gruju-backend-5014424c95f2.herokuapp.com/api/clubs/increment-usage', {
            website_url: 'https://cascadecamps.co.uk',
            activity_type: 'Sports',
            location: 'Test Location',
            child_age: 8,
            activity_start_date: '2024-12-17',
            activity_id: 12345
        });
        
        console.log('✅ Club increment API response:', response.data);
        
    } catch (error) {
        if (error.response?.status === 401) {
            console.log('🔐 Expected: Authentication required for club increment API');
            console.log('✅ Club increment endpoint is deployed and accessible');
        } else {
            console.error('❌ Unexpected error:', error.response?.data || error.message);
        }
    }
}

testClubApiDirect();