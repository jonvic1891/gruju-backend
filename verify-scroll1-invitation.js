#!/usr/bin/env node

const fetch = require('node-fetch');

const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com';

async function verifyScroll1Invitation() {
    try {
        console.log('🧪 VERIFYING SCROLL1 INVITATION EXISTS');
        console.log('='.repeat(40));
        
        // Login as Emilia
        const emiliaLoginResponse = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'roberts@example.com', password: 'test123' })
        });
        
        const emiliaLoginData = await emiliaLoginResponse.json();
        if (!emiliaLoginData.success) {
            console.log('❌ Emilia login failed');
            return;
        }
        
        console.log('✅ Emilia login successful');
        const emiliaToken = emiliaLoginData.token;
        
        // Check ALL invitations (not just calendar range)
        console.log('\n📬 CHECKING ALL ACTIVITY INVITATIONS...');
        const allInvitationsResponse = await fetch(`${API_BASE}/api/activity-invitations`, {
            headers: { 'Authorization': `Bearer ${emiliaToken}` }
        });
        const allInvitationsData = await allInvitationsResponse.json();
        
        console.log(`📊 Total invitations found: ${(allInvitationsData.data || []).length}`);
        
        // Look for scroll1 invitation
        const scroll1Invitations = (allInvitationsData.data || []).filter(inv => 
            (inv.activity_name && inv.activity_name.toLowerCase().includes('scroll')) ||
            (inv.message && inv.message.toLowerCase().includes('scroll'))
        );
        
        if (scroll1Invitations.length > 0) {
            console.log('🎉 FOUND SCROLL1 INVITATIONS:');
            scroll1Invitations.forEach(inv => {
                console.log('   -', inv.activity_name || 'Unknown Activity');
                console.log('     Message:', inv.message);
                console.log('     Status:', inv.status);
                console.log('     UUID:', inv.activity_uuid);
                console.log('     Invitation ID:', inv.invitation_uuid);
                console.log('');
            });
        } else {
            console.log('❌ No scroll1 invitations found in activity-invitations API');
            
            // Show a sample of what invitations exist
            console.log('\n📝 Sample of existing invitations:');
            (allInvitationsData.data || []).slice(0, 3).forEach(inv => {
                console.log(`   - "${inv.activity_name}" (${inv.status})`);
            });
        }
        
        // Also check calendar invitations with a wide range
        console.log('\n📅 CHECKING CALENDAR INVITATIONS (wide date range)...');
        const startDate = '2025-01-01';
        const endDate = '2025-12-31';
        
        const calendarResponse = await fetch(`${API_BASE}/api/calendar/invitations?start=${startDate}&end=${endDate}`, {
            headers: { 'Authorization': `Bearer ${emiliaToken}` }
        });
        const calendarData = await calendarResponse.json();
        
        const calendarScroll1 = (calendarData.data || []).filter(inv => 
            (inv.activity_name && inv.activity_name.toLowerCase().includes('scroll'))
        );
        
        if (calendarScroll1.length > 0) {
            console.log('🎉 FOUND SCROLL1 IN CALENDAR:');
            calendarScroll1.forEach(inv => {
                console.log('   -', inv.activity_name);
                console.log('     Date:', inv.start_date);
                console.log('     Status:', inv.status);
            });
        } else {
            console.log('❌ No scroll1 invitations found in calendar API');
        }
        
        console.log('\n' + '='.repeat(40));
        console.log('📊 VERIFICATION SUMMARY:');
        console.log(`- Total activity invitations: ${(allInvitationsData.data || []).length}`);
        console.log(`- Total calendar invitations: ${(calendarData.data || []).length}`);
        console.log(`- Scroll1 in activity invitations: ${scroll1Invitations.length}`);
        console.log(`- Scroll1 in calendar: ${calendarScroll1.length}`);
        
        if (scroll1Invitations.length > 0 || calendarScroll1.length > 0) {
            console.log('\n🎉 PENDING INVITATIONS SYSTEM IS WORKING!');
            console.log('✅ The invitation was successfully created and is visible to Emilia');
        } else {
            console.log('\n🔍 INVESTIGATION NEEDED:');
            console.log('- Check if invitation was created in database but not returned by APIs');
            console.log('- Verify date ranges and filtering logic');
            console.log('- Check if invitation status prevents it from appearing');
        }
        
    } catch (error) {
        console.error('❌ Verification error:', error.message);
    }
}

verifyScroll1Invitation();