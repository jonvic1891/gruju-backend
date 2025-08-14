#!/usr/bin/env node

const fetch = require('node-fetch');
const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com';

async function debugCalendarColorIssue() {
    try {
        console.log('🔍 DEBUGGING CALENDAR COLOR ISSUE');
        console.log('='.repeat(60));
        console.log('Investigating why calendar still shows dark blue after the fix');
        
        // Login as User11 (Charlie - who created the activity)
        const user11Login = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'roberts11@example.com', password: 'test123' })
        }).then(r => r.json());
        
        console.log('✅ Logged in as User11 (Charlie)');
        console.log(`   User: ${user11Login.user.username} (ID: ${user11Login.user.id})`);
        
        // Check ALL the different calendar endpoints that might be affecting the color
        console.log('\n📅 CHECKING ALL CALENDAR ENDPOINTS...');
        
        // 1. Check the main calendar activities endpoint (this should be fixed)
        console.log('\n1️⃣ /api/calendar/activities endpoint:');
        const calendarActivitiesResponse = await fetch(`${API_BASE}/api/calendar/activities?start=2025-07-31&end=2025-08-30`, {
            headers: { 'Authorization': `Bearer ${user11Login.token}` }
        });
        
        if (calendarActivitiesResponse.ok) {
            const calendarActivities = await calendarActivitiesResponse.json();
            const charlie1Activity = calendarActivities.data?.find(a => a.name === 'charlie 1');
            
            if (charlie1Activity) {
                console.log(`   ✅ Found "charlie 1" in calendar/activities:`);
                console.log(`      is_shared: ${charlie1Activity.is_shared}`);
                console.log(`      debug_total_invitations: ${charlie1Activity.debug_total_invitations}`);
                console.log(`      auto_notify_new_connections: ${charlie1Activity.auto_notify_new_connections}`);
                
                if (charlie1Activity.is_shared) {
                    console.log(`      🚨 ISSUE: is_shared is still true - this will show DARK BLUE`);
                } else {
                    console.log(`      ✅ is_shared is false - should show LIGHT BLUE`);
                }
            } else {
                console.log(`   ❌ "charlie 1" not found in calendar/activities`);
            }
        }
        
        // 2. Check if there are connected activities affecting it
        console.log('\n2️⃣ /api/calendar/connected-activities endpoint:');
        const connectedActivitiesResponse = await fetch(`${API_BASE}/api/calendar/connected-activities?start=2025-07-31&end=2025-08-30`, {
            headers: { 'Authorization': `Bearer ${user11Login.token}` }
        });
        
        if (connectedActivitiesResponse.ok) {
            const connectedActivities = await connectedActivitiesResponse.json();
            console.log(`   Found ${connectedActivities.data?.length || 0} connected activities`);
            
            const charlie1Connected = connectedActivities.data?.find(a => a.name === 'charlie 1');
            if (charlie1Connected) {
                console.log(`   🚨 ISSUE: "charlie 1" appears in connected activities - this would show DARK BLUE`);
                console.log(`      This shouldn't happen for activities you own`);
            } else {
                console.log(`   ✅ "charlie 1" not in connected activities (correct)`);
            }
        }
        
        // 3. Check invited activities
        console.log('\n3️⃣ /api/calendar/invitations endpoint:');
        const invitationsResponse = await fetch(`${API_BASE}/api/calendar/invitations?start=2025-07-31&end=2025-08-30`, {
            headers: { 'Authorization': `Bearer ${user11Login.token}` }
        });
        
        if (invitationsResponse.ok) {
            const invitations = await invitationsResponse.json();
            console.log(`   Found ${invitations.data?.length || 0} invitations`);
            
            const charlie1Invitation = invitations.data?.find(a => a.activity_name === 'charlie 1');
            if (charlie1Invitation) {
                console.log(`   ⚠️  "charlie 1" appears in invitations - this might affect color`);
                console.log(`      Status: ${charlie1Invitation.status}`);
            } else {
                console.log(`   ✅ "charlie 1" not in invitations (expected for activity owner)`);
            }
        }
        
        // 4. Check if there's a database issue - look directly at invitations
        console.log('\n🔍 CHECKING DATABASE STATE...');
        console.log('Let me check if there are actual accepted invitations for activity 168');
        
        // We can't query database directly, but let's check participants to see what invitations exist
        const participantsResponse = await fetch(`${API_BASE}/api/activities/168/participants`, {
            headers: { 'Authorization': `Bearer ${user11Login.token}` }
        });
        
        if (participantsResponse.ok) {
            const participantsData = await participantsResponse.json();
            console.log(`   Participants for activity 168:`);
            
            if (participantsData.data?.participants?.length > 0) {
                participantsData.data.participants.forEach(p => {
                    console.log(`      ${p.child_name}: status="${p.status}", invitation_id=${p.invitation_id}, pending_id=${p.pending_id}`);
                    
                    if (p.invitation_id && p.status === 'accepted') {
                        console.log(`      🚨 FOUND ACCEPTED INVITATION - this would make is_shared=true`);
                    }
                    if (p.pending_id && !p.invitation_id) {
                        console.log(`      ✅ This is just a pending invitation (no real invitation sent)`);
                    }
                });
            }
        }
        
        console.log('\n🎯 DIAGNOSIS:');
        console.log('If calendar still shows dark blue, the issue could be:');
        console.log('1. Frontend caching old API responses');
        console.log('2. Multiple calendar data sources being combined');
        console.log('3. Database has actual accepted invitations we missed');
        console.log('4. Different calendar endpoint being used by frontend');
        
    } catch (error) {
        console.error('❌ Debug failed:', error.message);
    }
}

debugCalendarColorIssue();