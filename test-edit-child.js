const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com';

async function testEditChild() {
    console.log('🧪 Testing edit child functionality...');
    
    try {
        // Test with roberts100 who has skeleton children
        console.log('\n1. Logging in as roberts100@example.com...');
        const loginResponse = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'roberts100@example.com',
                password: 'test123'
            })
        });
        
        const loginData = await loginResponse.json();
        if (!loginData.success) {
            console.log('❌ Login failed:', loginData.message);
            return;
        }
        
        const token = loginData.token;
        console.log('✅ Logged in successfully');
        
        // Get children
        console.log('\n2. Getting children...');
        const childrenResponse = await fetch(`${API_BASE}/api/children`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const childrenData = await childrenResponse.json();
        if (!childrenData.success || !childrenData.data || childrenData.data.length === 0) {
            console.log('❌ No children found');
            return;
        }
        
        console.log(`📊 Found ${childrenData.data.length} children:`);
        childrenData.data.forEach((child, i) => {
            console.log(`  ${i + 1}. ${child.name} (${child.uuid})`);
            console.log(`     Age: ${child.age || 'Not set'}`);
            console.log(`     Grade: ${child.grade || 'Not set'}`);
            console.log(`     School: ${child.school || 'Not set'}`);
        });
        
        // Test editing the first child (should be from skeleton)
        const firstChild = childrenData.data[0];
        console.log(`\n3. Testing edit of child: ${firstChild.name}`);
        
        const updateData = {
            first_name: firstChild.name.split(' ')[0],
            last_name: firstChild.name.split(' ').slice(1).join(' '),
            age: 10,
            grade: 'Grade 5',
            school: 'Test Elementary School',
            interests: 'Reading, Soccer, Video Games'
        };
        
        console.log('📝 Updating with data:', updateData);
        
        const updateResponse = await fetch(`${API_BASE}/api/children/${firstChild.uuid}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
        });
        
        const updateResult = await updateResponse.json();
        
        if (updateResult.success) {
            console.log('✅ Child updated successfully!');
            console.log('📋 Updated child data:', updateResult.data);
            
            // Verify the update by getting children again
            console.log('\n4. Verifying update...');
            const verifyResponse = await fetch(`${API_BASE}/api/children`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            const verifyData = await verifyResponse.json();
            const updatedChild = verifyData.data.find(child => child.uuid === firstChild.uuid);
            
            if (updatedChild) {
                console.log('✅ Update verified:');
                console.log(`  Name: ${updatedChild.name}`);
                console.log(`  Age: ${updatedChild.age}`);
                console.log(`  Grade: ${updatedChild.grade}`);
                console.log(`  School: ${updatedChild.school}`);
                console.log(`  Interests: ${updatedChild.interests}`);
            }
        } else {
            console.log('❌ Update failed:', updateResult.error);
        }
        
        console.log('\n🎉 Edit child test completed!');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

testEditChild().catch(console.error);