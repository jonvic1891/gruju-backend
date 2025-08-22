const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com';

async function testSkeletonFlow() {
    console.log('🧪 Testing skeleton account flow...');
    
    try {
        // Step 1: Login as roberts98 and search for roberts100@example.com (no match)
        console.log('\n1. Logging in as roberts98@example.com...');
        const login98Response = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'roberts98@example.com',
                password: 'test123'
            })
        });
        
        const login98Data = await login98Response.json();
        if (!login98Data.success) {
            console.log('❌ Roberts98 login failed:', login98Data.message);
            return;
        }
        
        const token98 = login98Data.token;
        console.log('✅ Logged in as roberts98');
        
        // Get children for roberts98
        const childrenResponse = await fetch(`${API_BASE}/api/children`, {
            headers: { 'Authorization': `Bearer ${token98}` }
        });
        
        const childrenData = await childrenResponse.json();
        if (!childrenData.success || !childrenData.data || childrenData.data.length === 0) {
            console.log('❌ No children found for roberts98');
            return;
        }
        
        const emiliaChild = childrenData.data[0]; // Emilia Roberts
        console.log('✅ Found child:', emiliaChild.name);
        
        // Step 2: Search for roberts100@example.com (should find no results)
        console.log('\n2. Searching for roberts100@example.com...');
        const searchResponse = await fetch(`${API_BASE}/api/connections/search?q=roberts100@example.com`, {
            headers: { 'Authorization': `Bearer ${token98}` }
        });
        
        const searchData = await searchResponse.json();
        console.log('🔍 Search results:', searchData);
        
        if (searchData.success && searchData.data.length === 0) {
            console.log('✅ No results found as expected');
            
            // Step 3: Create skeleton account for Jack Bones
            console.log('\n3. Creating skeleton account for Jack Bones...');
            const skeletonResponse = await fetch(`${API_BASE}/api/connections/create-skeleton`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token98}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contact_method: 'roberts100@example.com',
                    contact_type: 'email',
                    my_child_uuid: emiliaChild.uuid,
                    target_child_name: 'Jack Bones',
                    target_child_birth_year: 2015,
                    message: 'Emilia Roberts would like to connect with Jack Bones'
                })
            });
            
            const skeletonData = await skeletonResponse.json();
            console.log('📝 Skeleton account response:', skeletonData);
            
            if (skeletonData.success) {
                console.log('✅ Skeleton account created successfully');
                console.log('👶 Skeleton child Jack Bones created');
                console.log('📞 Connection request from Emilia to Jack created');
            } else {
                console.log('❌ Skeleton account creation failed:', skeletonData.error);
                return;
            }
        } else {
            console.log('❌ Expected no search results but got:', searchData.data.length);
            return;
        }
        
        // Step 4: Login as roberts99 and do the same for phone number
        console.log('\n4. Logging in as roberts99@example.com...');
        const login99Response = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'roberts99@example.com',
                password: 'test123'
            })
        });
        
        const login99Data = await login99Response.json();
        if (!login99Data.success) {
            console.log('❌ Roberts99 login failed');
            return;
        }
        
        const token99 = login99Data.token;
        console.log('✅ Logged in as roberts99');
        
        // Get children for roberts99
        const children99Response = await fetch(`${API_BASE}/api/children`, {
            headers: { 'Authorization': `Bearer ${token99}` }
        });
        
        const children99Data = await children99Response.json();
        const charlieChild = children99Data.data[0]; // Charlie Smith
        console.log('✅ Found child:', charlieChild.name);
        
        // Step 5: Search for phone number 07599699100 (no match)
        console.log('\n5. Searching for phone 07599699100...');
        const searchPhoneResponse = await fetch(`${API_BASE}/api/connections/search?q=07599699100`, {
            headers: { 'Authorization': `Bearer ${token99}` }
        });
        
        const searchPhoneData = await searchPhoneResponse.json();
        if (searchPhoneData.success && searchPhoneData.data.length === 0) {
            console.log('✅ No phone results found as expected');
            
            // Step 6: Create skeleton account for Paul Bones via phone
            console.log('\n6. Creating skeleton account for Paul Bones via phone...');
            const skeletonPhoneResponse = await fetch(`${API_BASE}/api/connections/create-skeleton`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token99}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contact_method: '07599699100',
                    contact_type: 'phone',
                    my_child_uuid: charlieChild.uuid,
                    target_child_name: 'Paul Bones',
                    target_child_birth_year: 2016,
                    message: 'Charlie Smith would like to connect with Paul Bones'
                })
            });
            
            const skeletonPhoneData = await skeletonPhoneResponse.json();
            if (skeletonPhoneData.success) {
                console.log('✅ Phone skeleton account created successfully');
            } else {
                console.log('❌ Phone skeleton account creation failed:', skeletonPhoneData.error);
            }
        }
        
        // Step 7: Login as roberts97 and also create request to Paul Bones
        console.log('\n7. Logging in as roberts97@example.com...');
        const login97Response = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'roberts97@example.com',
                password: 'test123'
            })
        });
        
        const login97Data = await login97Response.json();
        if (login97Data.success) {
            const token97 = login97Data.token;
            console.log('✅ Logged in as roberts97');
            
            // Get children for roberts97
            const children97Response = await fetch(`${API_BASE}/api/children`, {
                headers: { 'Authorization': `Bearer ${token97}` }
            });
            
            const children97Data = await children97Response.json();
            const hugoChild = children97Data.data[0]; // Hugo Stearn
            console.log('✅ Found child:', hugoChild.name);
            
            // Create another skeleton request to Paul Bones
            console.log('\n8. Creating another skeleton request to Paul Bones from Hugo...');
            const skeletonPhone2Response = await fetch(`${API_BASE}/api/connections/create-skeleton`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token97}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contact_method: '07599699100',
                    contact_type: 'phone',
                    my_child_uuid: hugoChild.uuid,
                    target_child_name: 'Paul Bones',
                    target_child_birth_year: 2016,
                    message: 'Hugo Stearn would like to connect with Paul Bones'
                })
            });
            
            const skeletonPhone2Data = await skeletonPhone2Response.json();
            if (skeletonPhone2Data.success) {
                console.log('✅ Second phone skeleton request created successfully');
            } else {
                console.log('❌ Second phone skeleton request failed:', skeletonPhone2Data.error);
            }
        }
        
        // Step 8: Check skeleton accounts status
        console.log('\n9. Checking skeleton accounts status...');
        const skeletonListResponse = await fetch(`${API_BASE}/api/connections/skeleton-accounts`, {
            headers: { 'Authorization': `Bearer ${token98}` }
        });
        
        const skeletonListData = await skeletonListResponse.json();
        if (skeletonListData.success) {
            console.log(`📊 Found ${skeletonListData.data.length} skeleton accounts:`);
            skeletonListData.data.forEach((account, i) => {
                console.log(`  ${i + 1}. ${account.contact_method} (${account.contact_type})`);
                console.log(`     Children: ${account.skeleton_children?.length || 0}`);
                console.log(`     Requests: ${account.connection_requests?.length || 0}`);
            });
        }
        
        console.log('\n🎉 Skeleton flow test completed!');
        console.log('\n📋 Next steps to test:');
        console.log('  1. Create roberts100@example.com account with phone 07599699100');
        console.log('  2. Verify Jack Bones and Paul Bones children are created');
        console.log('  3. Verify 3 connection requests appear for roberts100');
        console.log('  4. Test accepting connection requests');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

testSkeletonFlow().catch(console.error);