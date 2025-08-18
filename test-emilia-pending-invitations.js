#!/usr/bin/env node

const fetch = require('node-fetch');

const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com';

async function testEmiliaPendingInvitations() {
    try {
        console.log('🔍 TESTING EMILIA PENDING INVITATIONS SYSTEM');
        console.log('='.repeat(60));
        
        // Step 1: Find Charlie (the requester who created the "scroll1" activity)
        console.log('\n1. LOGIN AS ADMIN TO CHECK USERS...');
        
        // Login as admin user first
        const adminLoginResponse = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'jonathan.roberts006@hotmail.co.uk', password: 'test123' })
        });
        
        const adminLoginData = await adminLoginResponse.json();
        if (!adminLoginData.success) {
            console.log('❌ Admin login failed');
            return;
        }
        console.log('✅ Admin login successful');
        const adminToken = adminLoginData.token;
        
        // Step 2: Find Emilia's account details
        console.log('\n2. FINDING EMILIA USER...');
        
        // Login as Emilia (Roberts)
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
        console.log('📋 Emilia user data:', emiliaLoginData.user);
        const emiliaToken = emiliaLoginData.token;
        
        // Check if this matches the UUID from the issue
        const expectedUuid = '5fd73f87-fcab-42d0-b371-e73a87dfa69e';
        if (emiliaLoginData.user.uuid === expectedUuid) {
            console.log('✅ UUID matches expected value');
        } else {
            console.log('⚠️ UUID mismatch:', {
                expected: expectedUuid,
                actual: emiliaLoginData.user.uuid
            });
        }
        
        // Step 3: Check Emilia's children
        console.log('\n3. CHECKING EMILIA\'S CHILDREN...');
        const emiliaChildrenResponse = await fetch(`${API_BASE}/api/children`, {
            headers: { 'Authorization': `Bearer ${emiliaToken}` }
        });
        const emiliaChildrenData = await emiliaChildrenResponse.json();
        console.log('👶 Emilia\'s children:', emiliaChildrenData.data);
        
        // Step 4: Check for "scroll1" activity
        console.log('\n4. SEARCHING FOR "SCROLL1" ACTIVITY...');
        
        // We need to check activities from different users to find "scroll1"
        // Let's try logging in as different demo users and checking their activities
        const demoUsers = [
            { email: 'john.doe@example.com', password: 'test123' },
            { email: 'jane.smith@example.com', password: 'test123' },
            { email: 'charlie@example.com', password: 'test123' },
            { email: 'jonathan.roberts006@hotmail.co.uk', password: 'test123' }
        ];
        
        let scroll1Activity = null;
        let scroll1HostToken = null;
        
        for (const user of demoUsers) {
            try {
                const loginResponse = await fetch(`${API_BASE}/api/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(user)
                });
                
                const loginData = await loginResponse.json();
                if (!loginData.success) continue;
                
                const token = loginData.token;
                console.log(`🔍 Checking ${user.email} for "scroll1" activity...`);
                
                // Get their children
                const childrenResponse = await fetch(`${API_BASE}/api/children`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const childrenData = await childrenResponse.json();
                
                // Check activities for each child
                for (const child of childrenData.data || []) {
                    const activitiesResponse = await fetch(`${API_BASE}/api/activities/${child.id}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    const activitiesData = await activitiesResponse.json();
                    
                    const scroll1 = (activitiesData.data || []).find(act => 
                        act.name && act.name.toLowerCase().includes('scroll1')
                    );
                    
                    if (scroll1) {
                        scroll1Activity = scroll1;
                        scroll1HostToken = token;
                        console.log('✅ Found "scroll1" activity:', scroll1);
                        console.log('📋 Host details:', loginData.user);
                        break;
                    }
                }
                
                if (scroll1Activity) break;
                
            } catch (error) {
                console.log(`❌ Error checking ${user.email}:`, error.message);
            }
        }
        
        if (!scroll1Activity) {
            console.log('❌ Could not find "scroll1" activity');
            return;
        }
        
        // Step 5: Check for pending invitations in the database
        console.log('\n5. CHECKING PENDING INVITATIONS SYSTEM...');
        
        // Check if there's a pending invitation for Emilia for this activity
        console.log('🔍 Looking for pending invitations involving Emilia...');
        
        // Step 6: Check connection requests between Emilia and the scroll1 host
        console.log('\n6. CHECKING CONNECTION REQUESTS...');
        
        // Check Emilia's connection requests
        const emiliaRequestsResponse = await fetch(`${API_BASE}/api/connections/requests`, {
            headers: { 'Authorization': `Bearer ${emiliaToken}` }
        });
        const emiliaRequestsData = await emiliaRequestsResponse.json();
        console.log('📨 Emilia\'s connection requests:', emiliaRequestsData.data);
        
        // Check Emilia's connections
        const emiliaConnectionsResponse = await fetch(`${API_BASE}/api/connections`, {
            headers: { 'Authorization': `Bearer ${emiliaToken}` }
        });
        const emiliaConnectionsData = await emiliaConnectionsResponse.json();
        console.log('🔗 Emilia\'s connections:', emiliaConnectionsData.data);
        
        // Step 7: Check Emilia's current invitations
        console.log('\n7. CHECKING EMILIA\'S CURRENT INVITATIONS...');
        
        const today = new Date();
        const oneYearLater = new Date();
        oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
        const startDate = today.toISOString().split('T')[0];
        const endDate = oneYearLater.toISOString().split('T')[0];
        
        const emiliaInvitationsResponse = await fetch(`${API_BASE}/api/calendar/invitations?start=${startDate}&end=${endDate}`, {
            headers: { 'Authorization': `Bearer ${emiliaToken}` }
        });
        const emiliaInvitationsData = await emiliaInvitationsResponse.json();
        console.log('📬 Emilia\'s invitations:', emiliaInvitationsData.data);
        
        // Look for scroll1 invitation
        const scroll1Invitation = (emiliaInvitationsData.data || []).find(inv => 
            inv.activity_name && inv.activity_name.toLowerCase().includes('scroll1')
        );
        
        if (scroll1Invitation) {
            console.log('✅ Found scroll1 invitation for Emilia:', scroll1Invitation);
        } else {
            console.log('❌ No scroll1 invitation found for Emilia');
            console.log('🔍 All invitations:', emiliaInvitationsData.data?.map(inv => ({
                name: inv.activity_name,
                status: inv.status,
                from: inv.inviter_parent_username
            })));
        }
        
        // Step 8: Test the pending invitations creation process manually
        console.log('\n8. TESTING MANUAL PENDING INVITATIONS CREATION...');
        
        // If Emilia doesn't have the invitation but should, let's try to create it manually
        if (!scroll1Invitation && scroll1Activity) {
            console.log('🔧 Attempting to create pending invitation manually...');
            
            // First, let's check if Emilia has any connection to the scroll1 activity host
            const hostUser = scroll1HostToken; // We have the host's token
            
            // Create a connection request between Emilia and the host if needed
            console.log('🔗 Checking if connection exists between Emilia and scroll1 host...');
            
            // Get host's children
            const hostChildrenResponse = await fetch(`${API_BASE}/api/children`, {
                headers: { 'Authorization': `Bearer ${scroll1HostToken}` }
            });
            const hostChildrenData = await hostChildrenResponse.json();
            const hostChild = hostChildrenData.data?.[0];
            
            if (hostChild && emiliaChildrenData.data?.[0]) {
                const emiliaChild = emiliaChildrenData.data[0];
                
                console.log('👥 Testing connection between:', {
                    hostChild: hostChild.name,
                    emiliaChild: emiliaChild.name
                });
                
                // Try to create a pending invitation using the API
                console.log('📝 Attempting to create pending invitation via API...');
                
                try {
                    const pendingInviteResponse = await fetch(`${API_BASE}/api/activities/${scroll1Activity.id}/pending-invitations`, {
                        method: 'POST',
                        headers: { 
                            'Authorization': `Bearer ${scroll1HostToken}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ 
                            pending_connections: [`pending-${emiliaLoginData.user.uuid}`]
                        })
                    });
                    
                    if (pendingInviteResponse.ok) {
                        const pendingResult = await pendingInviteResponse.json();
                        console.log('✅ Pending invitation created successfully:', pendingResult);
                    } else {
                        const errorText = await pendingInviteResponse.text();
                        console.log('❌ Failed to create pending invitation:', errorText);
                    }
                } catch (error) {
                    console.log('❌ Error creating pending invitation:', error.message);
                }
                
                // If pending invitation creation worked, now simulate the connection acceptance
                console.log('🔄 Now testing connection acceptance flow...');
                
                // This would normally be triggered when Emilia accepts Charlie's connection request
                // Let's see if we can find and accept a pending connection request
                
                const charlieRequests = emiliaRequestsData.data?.filter(req => 
                    req.status === 'pending' && req.requester_name?.toLowerCase().includes('charlie')
                ) || [];
                
                if (charlieRequests.length > 0) {
                    console.log('🔍 Found pending request from Charlie:', charlieRequests[0]);
                    
                    // Try to accept it
                    const acceptResponse = await fetch(`${API_BASE}/api/connections/respond/${charlieRequests[0].uuid}`, {
                        method: 'POST',
                        headers: { 
                            'Authorization': `Bearer ${emiliaToken}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ action: 'accept' })
                    });
                    
                    if (acceptResponse.ok) {
                        const acceptResult = await acceptResponse.json();
                        console.log('✅ Connection request accepted:', acceptResult);
                        
                        // Wait a moment for processing
                        console.log('⏳ Waiting for pending invitations processing...');
                        await new Promise(resolve => setTimeout(resolve, 2000));
                        
                        // Now check Emilia's invitations again
                        const newInvitationsResponse = await fetch(`${API_BASE}/api/calendar/invitations?start=${startDate}&end=${endDate}`, {
                            headers: { 'Authorization': `Bearer ${emiliaToken}` }
                        });
                        const newInvitationsData = await newInvitationsResponse.json();
                        
                        const newScroll1Invitation = (newInvitationsData.data || []).find(inv => 
                            inv.activity_name && inv.activity_name.toLowerCase().includes('scroll1')
                        );
                        
                        if (newScroll1Invitation) {
                            console.log('🎉 SUCCESS! Scroll1 invitation now exists for Emilia:', newScroll1Invitation);
                        } else {
                            console.log('❌ Still no scroll1 invitation after connection acceptance');
                            console.log('📋 Current invitations:', newInvitationsData.data?.map(inv => inv.activity_name));
                        }
                        
                    } else {
                        const errorText = await acceptResponse.text();
                        console.log('❌ Failed to accept connection request:', errorText);
                    }
                } else {
                    console.log('❌ No pending connection request from Charlie found');
                }
            }
        }
        
        // Step 9: Diagnosis and recommendations
        console.log('\n' + '='.repeat(60));
        console.log('🏥 DIAGNOSIS AND RECOMMENDATIONS');
        console.log('='.repeat(60));
        
        console.log('\n📋 FINDINGS:');
        console.log(`- Emilia UUID: ${emiliaLoginData.user.uuid}`);
        console.log(`- Expected UUID: ${expectedUuid}`);
        console.log(`- UUID Match: ${emiliaLoginData.user.uuid === expectedUuid ? '✅' : '❌'}`);
        console.log(`- Scroll1 Activity Found: ${scroll1Activity ? '✅' : '❌'}`);
        console.log(`- Scroll1 Invitation Exists: ${scroll1Invitation ? '✅' : '❌'}`);
        console.log(`- Connection Requests: ${emiliaRequestsData.data?.length || 0}`);
        console.log(`- Active Connections: ${emiliaConnectionsData.data?.length || 0}`);
        console.log(`- Current Invitations: ${emiliaInvitationsData.data?.length || 0}`);
        
        console.log('\n🔧 RECOMMENDED ACTIONS:');
        
        if (!scroll1Invitation) {
            console.log('1. ❌ ISSUE CONFIRMED: Emilia is missing the scroll1 invitation');
            console.log('2. 🔍 ROOT CAUSE: Pending invitations system not working correctly');
            console.log('3. 🔧 IMMEDIATE FIX: Manually create invitation for Emilia');
            console.log('4. 🔨 SYSTEM FIX: Debug and fix pending invitations processing');
        } else {
            console.log('1. ✅ Emilia has the scroll1 invitation - issue may be resolved');
            console.log('2. 🔍 Check if invitation is appearing in the frontend correctly');
        }
        
        console.log('\n📝 MANUAL SQL QUERIES TO RUN:');
        console.log(`
-- Check pending invitations table
SELECT pai.*, a.name as activity_name, u.first_name as host_name
FROM pending_activity_invitations pai
JOIN activities a ON pai.activity_id = a.id
JOIN users u ON a.parent_id = u.id
WHERE pai.pending_connection_id LIKE '%${emiliaLoginData.user.uuid}%';

-- Check activity invitations for Emilia
SELECT ai.*, a.name as activity_name
FROM activity_invitations ai
JOIN activities a ON ai.activity_id = a.id
WHERE ai.invited_parent_id = ${emiliaLoginData.user.id};

-- Check connection requests involving Emilia
SELECT cr.*, u.first_name as requester_name
FROM connection_requests cr
LEFT JOIN users u ON cr.requester_id = u.id
WHERE cr.target_parent_id = ${emiliaLoginData.user.id} OR cr.requester_id = ${emiliaLoginData.user.id};
        `);
        
    } catch (error) {
        console.error('❌ Test error:', error.message);
        console.error('Stack trace:', error.stack);
    }
}

testEmiliaPendingInvitations();