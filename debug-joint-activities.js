/**
 * Debug script to test joint activities creation
 */

const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com/api';

async function testJointActivities() {
    console.log('🔍 Testing joint activities creation...');
    
    // Test data - these are the UUIDs from the console logs
    const miawongChildUuid = 'eff7d1e5-b308-4846-8ff7-6b929b91ce4c'; // Mia Wong
    const zoewongChildUuid = '6795debd-d0cf-4c23-a5a1-a4ce65339fe6'; // Zoe Wong
    
    const testActivity = {
        name: 'Debug Joint Activity Test',
        description: 'Testing joint activity creation',
        start_date: '2025-09-05',
        end_date: '2025-09-05',
        start_time: '10:00',
        end_time: '11:00',
        is_shared: true,
        joint_host_children: [zoewongChildUuid], // Joint host is Zoe Wong
        is_recurring: true,
        recurring_days: ['Friday'],
        series_start_date: '2025-09-05'
    };
    
    console.log('📡 Sending test activity creation request...');
    console.log('Primary host child UUID:', miawongChildUuid);
    console.log('Joint host children:', testActivity.joint_host_children);
    
    try {
        // You need to provide the JWT token for wong@example.com
        const jwt = process.env.JWT_TOKEN || 'YOUR_JWT_TOKEN_HERE';
        
        if (jwt === 'YOUR_JWT_TOKEN_HERE') {
            console.log('❌ Please set the JWT_TOKEN environment variable');
            console.log('   1. Login as wong@example.com');
            console.log('   2. Get the token from localStorage.getItem("jwt_token")');
            console.log('   3. Run: JWT_TOKEN="your_token_here" node debug-joint-activities.js');
            return;
        }
        
        const response = await fetch(`${API_BASE}/activities/${miawongChildUuid}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${jwt}`
            },
            body: JSON.stringify(testActivity)
        });
        
        const result = await response.json();
        
        console.log('📊 Response received:', {
            success: result.success,
            hasData: !!result.data,
            hasJointActivities: !!result.joint_activities,
            jointActivitiesLength: result.joint_activities ? result.joint_activities.length : 0
        });
        
        if (result.success) {
            console.log('✅ Activity creation successful');
            
            if (result.joint_activities && result.joint_activities.length > 0) {
                console.log(`📋 Created ${result.joint_activities.length} activities:`);
                result.joint_activities.forEach((activity, index) => {
                    console.log(`   ${index + 1}. UUID: ${activity.uuid}`);
                    console.log(`      child_uuid: ${activity.child_uuid}`);
                    console.log(`      name: ${activity.name}`);
                });
                
                // Check if we have activities for both hosts
                const miawongActivities = result.joint_activities.filter(a => a.child_uuid === miawongChildUuid);
                const zoewongActivities = result.joint_activities.filter(a => a.child_uuid === zoewongChildUuid);
                
                console.log(`🎯 Activities for Mia Wong (${miawongChildUuid}): ${miawongActivities.length}`);
                console.log(`🎯 Activities for Zoe Wong (${zoewongChildUuid}): ${zoewongActivities.length}`);
                
                if (miawongActivities.length > 0 && zoewongActivities.length > 0) {
                    console.log('✅ SUCCESS: Both hosts have activities created!');
                } else {
                    console.log('❌ FAILURE: Missing activities for one or both hosts');
                }
            } else {
                console.log('❌ No joint_activities returned in response');
            }
        } else {
            console.log('❌ Activity creation failed:', result.error || result.message);
        }
        
    } catch (error) {
        console.error('❌ Request failed:', error.message);
    }
}

testJointActivities();