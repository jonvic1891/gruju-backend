#!/usr/bin/env node

const fetch = require('node-fetch');

const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com';

async function findScroll1Activity() {
    try {
        console.log('🔍 FINDING SCROLL1 ACTIVITY');
        console.log('='.repeat(40));
        
        // More comprehensive list of possible demo users
        const demoUsers = [
            { email: 'john.doe@example.com', password: 'test123' },
            { email: 'jane.smith@example.com', password: 'test123' },
            { email: 'charlie@example.com', password: 'test123' },
            { email: 'roberts@example.com', password: 'test123' },
            { email: 'jonathan.roberts006@hotmail.co.uk', password: 'test123' },
            { email: 'test@example.com', password: 'test123' },
            { email: 'test1@example.com', password: 'test123' },
            { email: 'test2@example.com', password: 'test123' },
            { email: 'test3@example.com', password: 'test123' },
            { email: 'demo@example.com', password: 'test123' },
            { email: 'admin@example.com', password: 'test123' },
        ];
        
        let foundScrollActivity = false;
        
        for (const user of demoUsers) {
            try {
                console.log(`\n🔍 Checking ${user.email}...`);
                
                const loginResponse = await fetch(`${API_BASE}/api/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(user)
                });
                
                const loginData = await loginResponse.json();
                if (!loginData.success) {
                    console.log(`❌ Login failed for ${user.email}`);
                    continue;
                }
                
                console.log(`✅ Login successful for ${user.email}`);
                const token = loginData.token;
                
                // Get their children
                const childrenResponse = await fetch(`${API_BASE}/api/children`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const childrenData = await childrenResponse.json();
                
                console.log(`👶 Children: ${(childrenData.data || []).map(c => c.name).join(', ')}`);
                
                // Check activities for each child
                for (const child of childrenData.data || []) {
                    try {
                        const activitiesResponse = await fetch(`${API_BASE}/api/activities/${child.id}`, {
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                        const activitiesData = await activitiesResponse.json();
                        
                        console.log(`📅 ${child.name} has ${(activitiesData.data || []).length} activities`);
                        
                        // Look for scroll1 or any activities with "scroll" in the name
                        const scrollActivities = (activitiesData.data || []).filter(act => 
                            act.name && act.name.toLowerCase().includes('scroll')
                        );
                        
                        if (scrollActivities.length > 0) {
                            console.log('🎯 FOUND SCROLL ACTIVITIES!');
                            scrollActivities.forEach(act => {
                                console.log(`   - "${act.name}" (ID: ${act.id}, UUID: ${act.uuid})`);
                            });
                            foundScrollActivity = true;
                        }
                        
                        // Also show all activities to see what's there
                        if ((activitiesData.data || []).length > 0) {
                            console.log(`   All activities: ${(activitiesData.data || []).map(a => `"${a.name}"`).join(', ')}`);
                        }
                        
                    } catch (error) {
                        console.log(`❌ Error getting activities for ${child.name}:`, error.message);
                    }
                }
                
                // Also check if this user has any connection requests or pending invitations
                try {
                    const requestsResponse = await fetch(`${API_BASE}/api/connections/requests`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    const requestsData = await requestsResponse.json();
                    
                    if ((requestsData.data || []).length > 0) {
                        console.log(`📨 Connection requests: ${requestsData.data.length}`);
                        requestsData.data.forEach(req => {
                            console.log(`   - From: ${req.requester_name}, Status: ${req.status}`);
                        });
                    }
                    
                } catch (error) {
                    console.log(`❌ Error getting connection requests:`, error.message);
                }
                
            } catch (error) {
                console.log(`❌ Error processing ${user.email}:`, error.message);
            }
        }
        
        if (!foundScrollActivity) {
            console.log('\n❌ No "scroll" activities found in any demo account');
            console.log('\n💡 POSSIBLE REASONS:');
            console.log('1. Activity was deleted or renamed');
            console.log('2. Different demo account credentials');
            console.log('3. Activity was created with different naming');
            console.log('4. Database was reset');
            
            console.log('\n🔧 NEXT STEPS:');
            console.log('1. Create a test "scroll1" activity manually');
            console.log('2. Set up pending invitation for Emilia');
            console.log('3. Test the acceptance flow');
        }
        
    } catch (error) {
        console.error('❌ Search error:', error.message);
    }
}

findScroll1Activity();