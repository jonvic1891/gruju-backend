const axios = require('axios');

async function checkClubUsage() {
    try {
        // Get current clubs and their usage counts
        console.log('🏢 Getting current club usage counts...');
        const response = await axios.get('https://gruju-backend-5014424c95f2.herokuapp.com/api/clubs');
        
        const clubs = response.data.clubs || [];
        console.log(`📊 Found ${clubs.length} clubs:`);
        
        clubs.forEach(club => {
            console.log(`   ${club.name} (${club.activity_type}): usage_count = ${club.usage_count}`);
            if (club.website_url && club.website_url.includes('cascadecamps')) {
                console.log(`   ⭐ Cascade Camps current count: ${club.usage_count}`);
            }
        });
        
    } catch (error) {
        console.error('❌ Error:', error.response?.data || error.message);
    }
}

checkClubUsage();