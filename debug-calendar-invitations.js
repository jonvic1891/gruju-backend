#!/usr/bin/env node

const fetch = require('node-fetch');

const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com';

async function debugCalendarInvitations() {
    try {
        console.log('🔍 DEBUGGING CALENDAR INVITATION DISPLAY');
        console.log('=' .repeat(60));
        
        // Login as Johnson family
        console.log('\n👤 Logging in as Johnson family (Emma\'s parent)...');
        const loginResponse = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'johnson@example.com', password: 'demo123' })
        });
        
        const loginData = await loginResponse.json();
        if (!loginData.success) {
            console.error('❌ Login failed:', loginData);
            return;
        }
        console.log('✅ Login successful');
        const token = loginData.token;
        
        // Test all three calendar endpoints
        const endpoints = [
            { name: 'Own Activities', url: '/api/calendar/activities' },
            { name: 'Accepted Invitations', url: '/api/calendar/invited-activities' },
            { name: 'Pending Invitations', url: '/api/calendar/pending-invitations' }
        ];
        
        console.log('\n📊 Testing all calendar endpoints for August 2025...');
        
        for (const endpoint of endpoints) {
            console.log(`\n${endpoint.name}: ${endpoint.url}?start=2025-08-01&end=2025-08-31`);
            
            const response = await fetch(`${API_BASE}${endpoint.url}?start=2025-08-01&end=2025-08-31`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (response.ok) {
                const data = await response.json();
                console.log(`✅ Status: ${response.status} - Found ${data.data?.length || 0} items`);
                
                if (data.data?.length > 0) {
                    data.data.forEach((item, i) => {
                        console.log(`   ${i+1}. "${item.name}" on ${item.start_date}`);
                        if (item.host_parent_username) {
                            console.log(`      Host: ${item.host_parent_username}`);
                        }
                        if (item.invitation_message) {
                            console.log(`      Message: "${item.invitation_message}"`);
                        }
                        if (item.status) {
                            console.log(`      Status: ${item.status}`);
                        }
                    });
                } else {
                    console.log('   📭 No data returned');
                }
            } else {
                const errorText = await response.text();
                console.log(`❌ Status: ${response.status} - Error: ${errorText}`);
            }
        }
        
        // Check what the frontend CalendarScreen should receive
        console.log('\n🔍 Frontend Integration Check:');
        console.log('The CalendarScreen component calls:');
        console.log('1. loadActivities() -> /api/calendar/activities ✅');
        console.log('2. loadInvitedActivities() -> /api/calendar/invited-activities ✅');
        console.log('3. loadPendingInvitations() -> /api/calendar/pending-invitations ✅');
        
        console.log('\n🎯 Expected Behavior:');
        console.log('- Own activities should show with blue border (🏠)');
        console.log('- Accepted invitations should show with orange border (📩)');  
        console.log('- Pending invitations should show with dark orange border (⏳)');
        console.log('- Toggle controls should show/hide each type');
        
        console.log('\n📝 Next Steps:');
        console.log('1. Check browser console for JavaScript errors');
        console.log('2. Verify toggle states in UI');
        console.log('3. Check if loadPendingInvitations() is being called');
        console.log('4. Verify date filtering logic in frontend');
        
    } catch (error) {
        console.error('❌ Debug error:', error.message);
    }
}

debugCalendarInvitations();