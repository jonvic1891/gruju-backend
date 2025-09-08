const axios = require('axios');

async function checkWeb27() {
    try {
        // Use a working login that we know exists from the logs
        console.log('🔐 Logging in as johnson@example.com...');
        const loginResponse = await axios.post('https://gruju-backend-5014424c95f2.herokuapp.com/api/auth/login', {
            email: 'johnson@example.com',
            password: 'Password123!'
        });
        
        const token = loginResponse.data.token;
        console.log('✅ Login successful');
        
        // Get recent activities
        console.log('📅 Getting recent activities...');
        const activitiesResponse = await axios.get('https://gruju-backend-5014424c95f2.herokuapp.com/api/calendar/activities?start=2025-09-08&end=2025-09-08', {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        const activities = activitiesResponse.data.activities || [];
        const web27 = activities.find(a => a.name && a.name.includes('web27'));
        
        if (web27) {
            console.log('✅ Found web27 activity:');
            console.log(`   Name: ${web27.name}`);
            console.log(`   Website URL: ${web27.website_url}`);
            console.log(`   Activity Type: ${web27.activity_type}`);
            console.log(`   UUID: ${web27.uuid}`);
            
            if (web27.website_url && web27.activity_type) {
                console.log('✅ Has both website_url and activity_type - club logic should have triggered!');
            } else {
                console.log('❌ Missing website_url or activity_type - club logic would not trigger');
            }
        } else {
            console.log('❌ No web27 activity found');
            console.log(`📊 Found ${activities.length} total activities for today`);
        }
        
        // Check clubs to see current count
        console.log('🏢 Checking current club counts...');
        const clubsResponse = await axios.get('https://gruju-backend-5014424c95f2.herokuapp.com/api/clubs', {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        const clubs = clubsResponse.data.clubs || [];
        console.log(`📊 Found ${clubs.length} clubs:`);
        clubs.forEach(club => {
            console.log(`   ${club.name}: usage_count=${club.usage_count}, website_url=${club.website_url}`);
        });
        
    } catch (error) {
        console.error('❌ Error:', error.response?.data || error.message);
    }
}

checkWeb27();