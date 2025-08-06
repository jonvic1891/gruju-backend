#!/usr/bin/env node

const fetch = require('node-fetch');

const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com';

async function debugCalendarFrontend() {
    try {
        console.log('🔍 DEBUGGING CALENDAR FRONTEND INTEGRATION');
        console.log('=' .repeat(60));
        
        // Login as Johnson family
        const loginResponse = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'johnson@example.com', password: 'demo123' })
        });
        
        const loginData = await loginResponse.json();
        const token = loginData.token;
        
        // Test the current month (August 2025) - this is what CalendarScreen does
        console.log('\n📅 Simulating CalendarScreen loadPendingInvitations()...');
        
        // Simulate CalendarScreen's month calculation
        const currentMonth = new Date(); // Default behavior
        console.log(`Current month object: ${currentMonth}`);
        
        const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
        const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
        
        const startDate = startOfMonth.toISOString().split('T')[0];
        const endDate = endOfMonth.toISOString().split('T')[0];
        
        console.log(`Date range: ${startDate} to ${endDate}`);
        console.log('⚠️  This might be the issue - CalendarScreen might be loading current month (Jan 2025) instead of Aug 2025!');
        
        // Test with current month range
        console.log(`\n📊 Testing pending invitations for current month: ${startDate} to ${endDate}`);
        const currentResponse = await fetch(`${API_BASE}/api/calendar/pending-invitations?start=${startDate}&end=${endDate}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (currentResponse.ok) {
            const currentData = await currentResponse.json();
            console.log(`✅ Current month pending invitations: ${currentData.data?.length || 0}`);
        }
        
        // Test with August 2025 (where the invitations actually are)
        console.log('\n📊 Testing pending invitations for August 2025 (where data exists)...');
        const augustResponse = await fetch(`${API_BASE}/api/calendar/pending-invitations?start=2025-08-01&end=2025-08-31`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (augustResponse.ok) {
            const augustData = await augustResponse.json();
            console.log(`✅ August 2025 pending invitations: ${augustData.data?.length || 0}`);
            
            if (augustData.data?.length > 0) {
                console.log('\n📋 Found invitations in August 2025:');
                augustData.data.forEach((inv, i) => {
                    console.log(`   ${i+1}. "${inv.name}" on ${inv.start_date}`);
                });
            }
        }
        
        console.log('\n🔍 DIAGNOSIS:');
        if (startDate.startsWith('2025-01') || startDate.startsWith('2024')) {
            console.log('❌ PROBLEM FOUND: CalendarScreen is loading current month instead of August 2025');
            console.log('💡 SOLUTION: User needs to navigate to August 2025 in the calendar');
            console.log('   1. Open calendar');
            console.log('   2. Click the navigation arrows to go to August 2025');
            console.log('   3. Make sure "Show Pending Invitations" toggle is checked');
            console.log('   4. Pending invitations should then appear');
        } else if (startDate.startsWith('2025-08')) {
            console.log('✅ Calendar is loading August 2025 - there might be another issue');
            console.log('💡 Check:');
            console.log('   1. "Show Pending Invitations" toggle is checked');
            console.log('   2. Browser console for JavaScript errors');
            console.log('   3. Frontend state management');
        }
        
        console.log('\n🌐 Instructions for user:');
        console.log('1. Visit: https://gruju-parent-activity-app.web.app');
        console.log('2. Login as: johnson@example.com / demo123');
        console.log('3. Go to Calendar screen');
        console.log('4. Navigate to August 2025 using < > arrows');
        console.log('5. Check "Show Pending Invitations" toggle');
        console.log('6. Look for orange-bordered activities on Aug 4, 7, 8, 15');
        
    } catch (error) {
        console.error('❌ Debug error:', error.message);
    }
}

debugCalendarFrontend();