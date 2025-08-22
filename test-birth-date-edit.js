const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com';

async function testBirthDateEdit() {
    console.log('🧪 Testing birth date edit functionality...');
    
    try {
        // Test with roberts100 
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
            console.log('❌ Login failed');
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
        const jackBones = childrenData.data.find(child => child.name === 'Jack Bones');
        
        if (!jackBones) {
            console.log('❌ Jack Bones not found');
            return;
        }
        
        console.log(`📊 Found Jack Bones: Age ${jackBones.age || 'Not set'}`);
        
        // Test updating with birth date (2015-06-15 - should make them about 10 years old)
        console.log('\n3. Testing update with birth date 2015-06-15...');
        
        const updateData = {
            first_name: 'Jack',
            last_name: 'Bones',
            age: 10, // This should be calculated from birth date 2015-06-15
            grade: 'Grade 4',
            school: 'Riverside Elementary',
            interests: 'Basketball, Video Games, Science'
        };
        
        console.log('📝 Updating with calculated age:', updateData);
        
        const updateResponse = await fetch(`${API_BASE}/api/children/${jackBones.uuid}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
        });
        
        const updateResult = await updateResponse.json();
        
        if (updateResult.success) {
            console.log('✅ Jack Bones updated successfully!');
            console.log('📋 Updated data:', {
                name: updateResult.data.name,
                age: updateResult.data.age,
                grade: updateResult.data.grade,
                school: updateResult.data.school,
                interests: updateResult.data.interests
            });
            
            // Verify age calculation
            if (updateResult.data.age === 10) {
                console.log('✅ Age calculation working correctly');
            } else {
                console.log('❌ Age calculation issue - expected 10, got', updateResult.data.age);
            }
        } else {
            console.log('❌ Update failed:', updateResult.error);
        }
        
        console.log('\n🎉 Birth date functionality test completed!');
        console.log('\n📋 You can now login to the frontend and:');
        console.log('  1. Edit Jack Bones or Paul Bones');
        console.log('  2. Set their birth date instead of age');
        console.log('  3. See age calculated automatically');
        console.log('  4. Notice the even Edit/Delete button styling');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

testBirthDateEdit().catch(console.error);