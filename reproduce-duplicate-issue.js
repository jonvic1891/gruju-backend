const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com';

async function reproduceIssue() {
    console.log('🔍 Reproducing duplicate participants issue...');
    
    try {
        // Step 1: Create roberts25 account and child25
        console.log('\n1. Creating roberts25 account and child25...');
        const register25Response = await fetch(`${API_BASE}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'roberts25@example.com',
                password: 'test123',
                username: 'roberts 25'
            })
        });
        
        const register25Data = await register25Response.json();
        console.log('✅ Roberts25 account created:', register25Data.success);
        
        if (register25Data.success) {
            const token25 = register25Data.token;
            
            // Add child25
            const child25Response = await fetch(`${API_BASE}/api/children`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token25}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: 'child 25',
                    birth_year: 2015
                })
            });
            
            const child25Data = await child25Response.json();
            console.log('✅ Child25 created:', child25Data.success ? child25Data.data.name : 'failed');
        }
        
        // Step 2: Create roberts26 account and child26
        console.log('\n2. Creating roberts26 account and child26...');
        const register26Response = await fetch(`${API_BASE}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'roberts26@example.com',
                password: 'test123',
                username: 'roberts 26'
            })
        });
        
        const register26Data = await register26Response.json();
        console.log('✅ Roberts26 account created:', register26Data.success);
        
        let token26, child26Data;
        if (register26Data.success) {
            token26 = register26Data.token;
            
            // Add child26
            const child26Response = await fetch(`${API_BASE}/api/children`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token26}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: 'child 26',
                    birth_year: 2015
                })
            });
            
            child26Data = await child26Response.json();
            console.log('✅ Child26 created:', child26Data.success ? child26Data.data.name : 'failed');
        }
        
        // Step 3: Create activity for child26
        console.log('\n3. Creating activity for child26...');
        const activityResponse = await fetch(`${API_BASE}/api/activities/${child26Data.data.uuid}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token26}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: 'Test Duplicate Activity',
                description: 'Testing the duplicate participants bug',
                start_date: '2025-08-25',
                end_date: '2025-08-25',
                start_time: '10:00',
                end_time: '12:00',
                location: 'Test Location',
                website_url: '',
                auto_notify_new_connections: false,
                is_shared: true
            })
        });
        
        const activityData = await activityResponse.json();
        console.log('✅ Activity created:', activityData.success ? activityData.data.name : 'failed');
        
        if (!activityData.success) {
            console.log('❌ Activity creation failed, stopping test');
            return;
        }
        
        const activityUuid = activityData.data.uuid;
        console.log('📋 Activity UUID:', activityUuid);
        
        // Step 4: Add child25 as pending connection via "pending connections feature"
        console.log('\n4. Adding child25 as pending connection...');
        
        // First send a connection request from child26 to child25
        const connectionResponse = await fetch(`${API_BASE}/api/connections/request`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token26}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                target_parent_email: 'roberts25@example.com',
                message: 'Testing connection for duplicate bug'
            })
        });
        
        const connectionData = await connectionResponse.json();
        console.log('✅ Connection request sent:', connectionData.success);
        
        // Step 5: Add child25 as pending invitation in "who is invited" section
        console.log('\n5. Adding child25 as pending invitation in activity...');
        
        // Get child25 UUID
        const login25Response = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'roberts25@example.com',
                password: 'test123'
            })
        });
        const login25Data = await login25Response.json();
        console.log('Login25 response:', login25Data);
        
        if (!login25Data.user?.children?.[0]) {
            console.log('❌ Could not get child25 UUID, stopping test');
            return;
        }
        const child25Uuid = login25Data.user.children[0].uuid;
        
        const pendingInviteResponse = await fetch(`${API_BASE}/api/activities/${activityUuid}/pending-invitations`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token26}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                pending_connections: [`pending-child-${child25Uuid}`]
            })
        });
        
        const pendingInviteData = await pendingInviteResponse.json();
        console.log('✅ Pending invitation added:', pendingInviteData.success);
        
        // Step 6: Login as roberts25 and accept connection
        console.log('\n6. Logging in as roberts25 and accepting connection...');
        const token25 = login25Data.token;
        
        // Get connection requests
        const requestsResponse = await fetch(`${API_BASE}/api/connections/requests`, {
            headers: { 'Authorization': `Bearer ${token25}` }
        });
        const requestsData = await requestsResponse.json();
        console.log('📋 Connection requests found:', requestsData.data?.length || 0);
        
        if (requestsData.data && requestsData.data.length > 0) {
            const request = requestsData.data.find(req => req.requester_parent_username === 'roberts 26');
            if (request) {
                console.log('✅ Found connection request from roberts26:', request.uuid);
                
                // Accept the connection
                const acceptResponse = await fetch(`${API_BASE}/api/connections/accept`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token25}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        request_uuid: request.uuid
                    })
                });
                
                const acceptData = await acceptResponse.json();
                console.log('✅ Connection accepted:', acceptData.success);
                
                // Step 7: Check activity invitations
                console.log('\n7. Checking for new activity invitations...');
                const invitationsResponse = await fetch(`${API_BASE}/api/activity-invitations`, {
                    headers: { 'Authorization': `Bearer ${token25}` }
                });
                const invitationsData = await invitationsResponse.json();
                console.log('📋 Activity invitations found:', invitationsData.data?.length || 0);
                
                if (invitationsData.data && invitationsData.data.length > 0) {
                    const testInvitation = invitationsData.data.find(inv => inv.activity_name === 'Test Duplicate Activity');
                    if (testInvitation) {
                        console.log('✅ Found test activity invitation:', testInvitation.activity_name);
                        
                        // Step 8: Check participants in the activity (this should show duplicates)
                        console.log('\n8. Checking participants in activity - looking for duplicates...');
                        const participantsResponse = await fetch(`${API_BASE}/api/activities/${activityUuid}/participants`, {
                            headers: { 'Authorization': `Bearer ${token25}` }
                        });
                        const participantsData = await participantsResponse.json();
                        
                        console.log('📊 Participants response:', JSON.stringify(participantsData, null, 2));
                        
                        if (participantsData.success) {
                            const participants = participantsData.data.participants;
                            console.log(`\n📋 Found ${participants.length} participant entries:`);
                            
                            participants.forEach((p, i) => {
                                console.log(`${i + 1}. ${p.child_name} (${p.child_uuid}) - ${p.invitation_type} - ${p.status}`);
                            });
                            
                            // Check for duplicates
                            const child25Entries = participants.filter(p => p.child_name === 'child 25');
                            if (child25Entries.length > 1) {
                                console.log(`\n🚨 DUPLICATE FOUND! child 25 appears ${child25Entries.length} times:`);
                                child25Entries.forEach((entry, i) => {
                                    console.log(`  ${i + 1}. Type: ${entry.invitation_type}, Status: ${entry.status}`);
                                    if (entry.invitation_uuid) console.log(`     Invitation UUID: ${entry.invitation_uuid}`);
                                    if (entry.pending_uuid) console.log(`     Pending UUID: ${entry.pending_uuid}`);
                                });
                            } else {
                                console.log('✅ No duplicates found');
                            }
                        }
                    } else {
                        console.log('❌ Test activity invitation not found');
                    }
                } else {
                    console.log('❌ No activity invitations found');
                }
            } else {
                console.log('❌ Connection request from roberts26 not found');
            }
        } else {
            console.log('❌ No connection requests found');
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

reproduceIssue().catch(console.error);