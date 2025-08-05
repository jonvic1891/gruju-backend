const axios = require('axios');

const API_BASE_URL = 'https://gruju-backend-5014424c95f2.herokuapp.com';
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MzQsImVtYWlsIjoidGVzdHVzZXJAZXhhbXBsZS5jb20iLCJyb2xlIjoidXNlciIsInVzZXJuYW1lIjoidGVzdHVzZXIiLCJpYXQiOjE3NTQzNDUzMjcsImV4cCI6MTc1NDQzMTcyN30.lHwdC56lESvj5RfWKeOcsTWZRU7-DbmYzRxemb0obAQ';
const CHILD_ID = 34;

async function addTestActivities() {
    try {
        console.log('🎯 Adding test activities to Heroku backend...');
        
        const now = new Date();
        const activities = [
            // Monday - Private activity (Dark Blue)
            {
                name: 'Soccer Practice',
                description: 'Weekly soccer training session',
                start_date: getDateForWeekday(now, 1).toISOString().split('T')[0],
                start_time: '16:00',
                end_time: '17:30',
                location: 'Community Sports Center',
                cost: 25
            },
            // Tuesday - Private activity (Dark Blue)
            {
                name: 'Piano Lessons',
                description: 'Individual piano instruction',
                start_date: getDateForWeekday(now, 2).toISOString().split('T')[0],
                start_time: '15:00',
                end_time: '15:45',
                location: 'Music Academy',
                cost: 50
            },
            // Wednesday - Will become shared activity (Light Blue)
            {
                name: 'Art Class',
                description: 'Creative painting and drawing session',
                start_date: getDateForWeekday(now, 3).toISOString().split('T')[0],
                start_time: '14:00',
                end_time: '15:30',
                location: 'Art Studio Downtown',
                cost: 35
            },
            // Thursday - Will have pending invitation (Green)
            {
                name: 'Birthday Party',
                description: 'Sophia\'s 9th birthday celebration!',
                start_date: getDateForWeekday(now, 4).toISOString().split('T')[0],
                start_time: '15:00',
                end_time: '18:00',
                location: 'Fun Zone Entertainment',
                cost: 30
            },
            // Friday - Will be declined (Grey)
            {
                name: 'Baseball Game',
                description: 'Youth league baseball match',
                start_date: getDateForWeekday(now, 5).toISOString().split('T')[0],
                start_time: '09:00',
                end_time: '12:00',
                location: 'Sports Complex',
                cost: 0
            },
            // Saturday - Private activity (Dark Blue)
            {
                name: 'Swimming Lessons',
                description: 'Beginner swimming class',
                start_date: getDateForWeekday(now, 6).toISOString().split('T')[0],
                start_time: '10:00',
                end_time: '11:00',
                location: 'Aquatic Center',
                cost: 45
            },
            // Sunday - Will become shared (Light Blue)
            {
                name: 'Dance Class',
                description: 'Hip-hop dance for kids',
                start_date: getDateForWeekday(now, 0).toISOString().split('T')[0],
                start_time: '17:00',
                end_time: '18:00',
                location: 'Dance Studio Plus',
                cost: 40
            }
        ];

        const headers = {
            'Authorization': `Bearer ${TOKEN}`,
            'Content-Type': 'application/json'
        };

        for (const activity of activities) {
            try {
                const response = await axios.post(
                    `${API_BASE_URL}/api/activities/${CHILD_ID}`,
                    activity,
                    { headers }
                );
                
                if (response.data.success) {
                    console.log(`✅ Created activity: ${activity.name} on ${activity.start_date}`);
                } else {
                    console.log(`⚠️  Activity might exist: ${activity.name} - ${response.data.error}`);
                }
            } catch (error) {
                console.log(`⚠️  Error with ${activity.name}: ${error.response?.data?.error || error.message}`);
            }
        }

        console.log('\n🎉 Test activities added successfully!');
        console.log('\n📋 Login credentials for testing:');
        console.log('- Email: testuser@example.com');
        console.log('- Password: password123');
        console.log('\n🎨 You should see color-coded activities in Emma\'s calendar!');
        console.log('- 🔵 Dark Blue: Private activities (Soccer, Piano, Swimming)');
        console.log('- 🔷 Light Blue: Will be light blue when invitations are accepted');
        console.log('- 🟢 Green: Will be green when invitations are pending');
        console.log('- ⚫ Grey: Will be grey when invitations are declined');
        
        console.log('\n🌐 Test the app at: https://gruju-parent-activity-app.web.app');

    } catch (error) {
        console.error('❌ Error adding activities:', error.message);
    }
}

function getDateForWeekday(currentDate, targetDay) {
    // targetDay: 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const current = new Date(currentDate);
    const currentDay = current.getDay();
    const daysUntilTarget = targetDay - currentDay;
    
    // If the target day is in the past this week, get next week's occurrence
    const adjustedDays = daysUntilTarget < 0 ? daysUntilTarget + 7 : daysUntilTarget;
    
    current.setDate(current.getDate() + adjustedDays);
    return current;
}

addTestActivities();