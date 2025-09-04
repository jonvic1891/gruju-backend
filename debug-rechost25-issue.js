/**
 * Debug script for rechost25 issue - Emma Johnson not seeing invitations
 */

const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com/api';

async function debugRechost25() {
  console.log('🚨 DEBUGGING: Emma Johnson not seeing invitations after rechost25 creation');
  console.log('=' .repeat(70));
  
  console.log('\n🔍 Checking recent activities created...');
  
  try {
    // Check what activities were created for rechost25
    const response = await fetch(`${API_BASE}/activities/debug/recent`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const recentActivities = await response.json();
      console.log('📊 Recent activities:', recentActivities);
      
      // Look for activities with name containing "rechost25"
      const rechost25Activities = recentActivities.filter(a => 
        a.name && a.name.toLowerCase().includes('rechost25')
      );
      
      console.log('\n🎯 Rechost25 activities found:', rechost25Activities.length);
      rechost25Activities.forEach((activity, index) => {
        console.log(`\n📋 Activity ${index + 1}:`);
        console.log(`   - UUID: ${activity.uuid}`);
        console.log(`   - Name: ${activity.name}`);
        console.log(`   - Child UUID: ${activity.child_uuid || 'MISSING!'}`);
        console.log(`   - Child ID: ${activity.child_id}`);
        console.log(`   - Series ID: ${activity.series_id}`);
        console.log(`   - Start Date: ${activity.start_date}`);
        console.log(`   - Is Recurring: ${activity.is_recurring}`);
        console.log(`   - Recurring Days: ${activity.recurring_days}`);
      });
      
    } else {
      console.log('❌ Could not fetch recent activities');
    }
    
  } catch (error) {
    console.error('❌ Error fetching debug info:', error);
  }
  
  console.log('\n🔧 Things to check manually:');
  console.log('1. Open browser DevTools and check console logs during invitation sending');
  console.log('2. Look for "🎯 Found X activities for host [Name]" messages');
  console.log('3. Check if child_uuid is present in createdActivities array');
  console.log('4. Verify that hostActivities.filter() is working correctly');
  console.log('5. Check if Emma Johnson\'s UUID is matching the child_uuid in activities');
  
  console.log('\n🐛 Possible issues:');
  console.log('- child_uuid might be null/undefined in activity response');
  console.log('- Filter logic might be too strict');
  console.log('- Emma Johnson\'s child UUID might not match activity child_uuid');
  console.log('- Backend might not be returning child_uuid properly');
}

debugRechost25();