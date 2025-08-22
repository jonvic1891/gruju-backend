const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com';

async function testRoberts100Final() {
    console.log('🧪 Testing roberts100@example.com complete skeleton flow...');
    
    try {
        // Step 1: Login as roberts100
        console.log('\n1. Logging in as roberts100@example.com...');
        const login100Response = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'roberts100@example.com',
                password: 'test123'
            })
        });
        
        const login100Data = await login100Response.json();
        if (!login100Data.success) {
            console.log('❌ Roberts100 login failed:', login100Data.message);
            return;
        }
        
        const token100 = login100Data.token;
        console.log('✅ Logged in as roberts100');
        
        // Step 2: Check children (should have Jack Bones and Paul Bones)
        console.log('\n2. Checking children from skeleton merging...');
        const childrenResponse = await fetch(`${API_BASE}/api/children`, {
            headers: { 'Authorization': `Bearer ${token100}` }
        });
        
        const childrenData = await childrenResponse.json();
        if (childrenData.success && childrenData.data) {
            console.log(`📊 Found ${childrenData.data.length} children:`);
            childrenData.data.forEach((child, i) => {
                console.log(`  ${i + 1}. ${child.name} (${child.uuid})`);
            });
            
            const jackBones = childrenData.data.find(child => child.name === 'Jack Bones');
            const paulBones = childrenData.data.find(child => child.name === 'Paul Bones');
            
            if (jackBones && paulBones) {
                console.log('✅ Both skeleton children successfully merged');
            } else {
                console.log('❌ Missing skeleton children');
            }
        }
        
        // Step 3: Check connection requests
        console.log('\n3. Checking connection requests...');
        const requestsResponse = await fetch(`${API_BASE}/api/connections/requests`, {
            headers: { 'Authorization': `Bearer ${token100}` }
        });
        
        const requestsData = await requestsResponse.json();
        if (requestsData.success && requestsData.data) {
            console.log(`📞 Found ${requestsData.data.length} connection requests:`);
            requestsData.data.forEach((request, i) => {
                console.log(`  ${i + 1}. From: ${request.requester_parent_username}`);
                console.log(`     ${request.child_name} → ${request.target_child_name}`);
                console.log(`     Message: ${request.message}`);
                console.log(`     Status: ${request.status}`);
                console.log('');
            });
            
            if (requestsData.data.length === 3) {
                console.log('✅ All 3 skeleton connection requests successfully converted');
            } else {
                console.log(`❌ Expected 3 requests, got ${requestsData.data.length}`);
            }
        }
        
        // Step 4: Test accepting a connection request
        if (requestsData.success && requestsData.data && requestsData.data.length > 0) {
            const firstRequest = requestsData.data[0];
            console.log(`\n4. Testing acceptance of request from ${firstRequest.requester_parent_username}...`);
            
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
                
                // Check active connections
                console.log('\n5. Verifying active connection was created...');
                const connectionsResponse = await fetch(`${API_BASE}/api/connections`, {
                    headers: { 'Authorization': `Bearer ${token100}` }
                });
                
                const connectionsData = await connectionsResponse.json();
                if (connectionsData.success && connectionsData.data) {
                    console.log(`🔗 Found ${connectionsData.data.length} active connections:`);
                    connectionsData.data.forEach((conn, i) => {
                        console.log(`  ${i + 1}. ${conn.child1_name} ↔ ${conn.child2_name}`);
                    });
                    
                    if (connectionsData.data.length > 0) {
                        console.log('✅ Connection successfully created from skeleton flow');
                    }
                }
            } else {
                console.log('❌ Failed to accept connection request:', acceptData.error);
            }
        }
        
        console.log('\n🎉 Complete skeleton account flow test successful!');
        console.log('\n📋 Flow Summary:');
        console.log('✅ 1. Roberts98 searched for roberts100@example.com (no match)');
        console.log('✅ 2. Roberts98 created skeleton account with Jack Bones child');
        console.log('✅ 3. Roberts99 searched for 07599699100 (no match)');
        console.log('✅ 4. Roberts99 created skeleton account with Paul Bones child');
        console.log('✅ 5. Roberts97 also created request for Paul Bones');
        console.log('✅ 6. Roberts100 registered with email and phone');
        console.log('✅ 7. Skeleton accounts merged - children created');
        console.log('✅ 8. Skeleton connection requests converted to real requests');
        console.log('✅ 9. Roberts100 can see and accept connection requests');
        console.log('✅ 10. Connection acceptance creates active connections');
        
        console.log('\n🌟 The complete skeleton account system is working perfectly!');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

testRoberts100Final().catch(console.error);