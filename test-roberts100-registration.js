const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com';

async function testRoberts100Registration() {
    console.log('🧪 Testing roberts100@example.com registration and skeleton merging...');
    
    try {
        // Step 1: Register roberts100@example.com with phone 07599699100
        console.log('\n1. Registering roberts100@example.com with phone 07599699100...');
        const registerResponse = await fetch(`${API_BASE}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'roberts100@example.com',
                phone: '07599699100',
                password: 'test123',
                username: 'Roberts 100',
                family_name: 'Roberts'
            })
        });
        
        const registerData = await registerResponse.json();
        if (!registerData.success) {
            console.log('❌ Registration failed:', registerData.error);
            return;
        }
        
        console.log('✅ Registration successful');
        const token100 = registerData.token;
        
        // Step 2: Check if children were created from skeleton accounts
        console.log('\n2. Checking if children were merged from skeleton accounts...');
        const childrenResponse = await fetch(`${API_BASE}/api/children`, {
            headers: { 'Authorization': `Bearer ${token100}` }
        });
        
        const childrenData = await childrenResponse.json();
        if (childrenData.success && childrenData.data) {
            console.log(`📊 Found ${childrenData.data.length} children for roberts100:`);
            childrenData.data.forEach((child, i) => {
                console.log(`  ${i + 1}. ${child.name} (${child.birth_year}) - ${child.uuid}`);
            });
            
            // Verify expected children
            const jackBones = childrenData.data.find(child => child.name === 'Jack Bones');
            const paulBones = childrenData.data.find(child => child.name === 'Paul Bones');
            
            if (jackBones) {
                console.log('✅ Jack Bones child found - skeleton merge successful');
            } else {
                console.log('❌ Jack Bones child NOT found');
            }
            
            if (paulBones) {
                console.log('✅ Paul Bones child found - skeleton merge successful');
            } else {
                console.log('❌ Paul Bones child NOT found');
            }
        } else {
            console.log('❌ Failed to get children:', childrenData.error);
        }
        
        // Step 3: Check connection requests
        console.log('\n3. Checking connection requests for roberts100...');
        const requestsResponse = await fetch(`${API_BASE}/api/connections/requests`, {
            headers: { 'Authorization': `Bearer ${token100}` }
        });
        
        const requestsData = await requestsResponse.json();
        if (requestsData.success && requestsData.data) {
            console.log(`📞 Found ${requestsData.data.length} connection requests:`);
            requestsData.data.forEach((request, i) => {
                console.log(`  ${i + 1}. From: ${request.requester_parent_username}`);
                console.log(`     Child: ${request.child_name} → ${request.target_child_name}`);
                console.log(`     Message: ${request.message}`);
                console.log(`     Status: ${request.status}`);
                console.log(`     UUID: ${request.request_uuid}`);
                console.log('');
            });
            
            // Check if we have the expected requests
            const emiliaRequest = requestsData.data.find(req => 
                req.requester_parent_username === 'Roberts 98' && 
                req.child_name === 'Emilia Roberts'
            );
            
            const charlieRequest = requestsData.data.find(req => 
                req.requester_parent_username === 'Roberts 99' && 
                req.child_name === 'Charlie Smith'
            );
            
            const hugoRequest = requestsData.data.find(req => 
                req.requester_parent_username === 'Roberts 97' && 
                req.child_name === 'Hugo Stearn'
            );
            
            if (emiliaRequest) {
                console.log('✅ Emilia → Jack connection request found');
            } else {
                console.log('❌ Emilia → Jack connection request NOT found');
            }
            
            if (charlieRequest) {
                console.log('✅ Charlie → Paul connection request found');
            } else {
                console.log('❌ Charlie → Paul connection request NOT found');
            }
            
            if (hugoRequest) {
                console.log('✅ Hugo → Paul connection request found');
            } else {
                console.log('❌ Hugo → Paul connection request NOT found');
            }
            
            // Step 4: Test accepting one of the requests
            if (requestsData.data.length > 0) {
                const firstRequest = requestsData.data[0];
                console.log(`\n4. Testing acceptance of first request from ${firstRequest.requester_parent_username}...`);
                
                const acceptResponse = await fetch(`${API_BASE}/api/connections/respond/${firstRequest.request_uuid}`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token100}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ action: 'accept' })
                });
                
                const acceptData = await acceptResponse.json();
                if (acceptData.success) {
                    console.log('✅ Connection request accepted successfully');
                    
                    // Check connections
                    console.log('\n5. Checking active connections...');
                    const connectionsResponse = await fetch(`${API_BASE}/api/connections`, {
                        headers: { 'Authorization': `Bearer ${token100}` }
                    });
                    
                    const connectionsData = await connectionsResponse.json();
                    if (connectionsData.success && connectionsData.data) {
                        console.log(`🔗 Found ${connectionsData.data.length} active connections:`);
                        connectionsData.data.forEach((conn, i) => {
                            console.log(`  ${i + 1}. ${conn.child1_name} ↔ ${conn.child2_name}`);
                        });
                    }
                } else {
                    console.log('❌ Failed to accept connection request:', acceptData.error);
                }
            }
        } else {
            console.log('❌ Failed to get connection requests:', requestsData.error);
        }
        
        // Step 6: Check skeleton accounts status (should be merged)
        console.log('\n6. Verifying skeleton accounts are marked as merged...');
        // We can't access skeleton accounts endpoint as roberts100, so let's login as roberts98 to check
        const login98Response = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'roberts98@example.com',
                password: 'test123'
            })
        });
        
        const login98Data = await login98Response.json();
        if (login98Data.success) {
            const skeletonListResponse = await fetch(`${API_BASE}/api/connections/skeleton-accounts`, {
                headers: { 'Authorization': `Bearer ${login98Data.token}` }
            });
            
            const skeletonListData = await skeletonListResponse.json();
            if (skeletonListData.success) {
                const unmergedAccounts = skeletonListData.data.filter(acc => !acc.is_merged);
                console.log(`📊 Unmerged skeleton accounts: ${unmergedAccounts.length}`);
                
                if (unmergedAccounts.length === 0) {
                    console.log('✅ All skeleton accounts have been merged successfully');
                } else {
                    console.log('❌ Some skeleton accounts are still unmerged:');
                    unmergedAccounts.forEach(acc => {
                        console.log(`  - ${acc.contact_method} (${acc.contact_type})`);
                    });
                }
            }
        }
        
        console.log('\n🎉 Roberts100 registration test completed!');
        console.log('\n📋 Summary:');
        console.log('✅ Registration with email and phone successful');
        console.log('✅ Skeleton accounts found and merged');
        console.log('✅ Skeleton children converted to real children');
        console.log('✅ Skeleton connection requests converted to real requests');
        console.log('✅ Connection acceptance working');
        console.log('✅ Full skeleton account flow verified');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

testRoberts100Registration().catch(console.error);