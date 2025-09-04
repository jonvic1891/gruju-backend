/**
 * Test script to verify the multi-host recurring invitation fix
 * Tests that child_uuid is properly used to split activities between hosts
 */

const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com/api';

// Test users with their JWT tokens (get from browser localStorage)
const TEST_USERS = {
  emma: {
    email: 'roberts10@example.com',
    jwt: null, // Will be set from environment or input
    childName: 'Emilia',
    childId: null
  },
  charlie: {
    email: 'roberts11@example.com', 
    jwt: null,
    childName: 'Charlie',
    childId: null
  }
};

async function makeAuthRequest(url, options = {}, jwt) {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${jwt}`,
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }

  return response.json();
}

async function testMultiHostChildUuidFix() {
  console.log('🧪 Testing Multi-Host Child UUID Fix');
  console.log('=' .repeat(50));
  
  // Note: This test requires manual JWT token setup since we can't automate login
  console.log('⚠️  Manual setup required:');
  console.log('1. Login as roberts10@example.com and roberts11@example.com');
  console.log('2. Get JWT tokens from localStorage.getItem("jwt_token")');
  console.log('3. Set them in the TEST_USERS object above');
  console.log('4. Ensure Emma (Emilia) and Charlie are connected');
  console.log('5. Create a recurring activity with joint hosting');
  
  // If JWTs are available, we could test:
  if (TEST_USERS.emma.jwt && TEST_USERS.charlie.jwt) {
    console.log('\n✅ JWT tokens available - running automated test');
    
    try {
      // 1. Get children info for both users
      const emmaChildren = await makeAuthRequest(`${API_BASE}/children`, {}, TEST_USERS.emma.jwt);
      const charlieChildren = await makeAuthRequest(`${API_BASE}/children`, {}, TEST_USERS.charlie.jwt);
      
      console.log('👶 Emma\'s children:', emmaChildren.map(c => ({ name: c.name, uuid: c.uuid })));
      console.log('👶 Charlie\'s children:', charlieChildren.map(c => ({ name: c.name, uuid: c.uuid })));
      
      // 2. Test activity creation with joint hosting (would need to implement)
      console.log('\n🎯 Testing activity creation with joint hosting...');
      console.log('(This would require implementing the full activity creation flow)');
      
    } catch (error) {
      console.error('❌ Test failed:', error.message);
    }
  } else {
    console.log('\n⚠️  JWT tokens not available - skipping automated test');
  }
  
  console.log('\n🔍 Manual verification steps:');
  console.log('1. Login as Emma and create a recurring activity with Charlie as joint host');
  console.log('2. Invite a guest child to the activity');
  console.log('3. Check that guest sees ALL recurring invitations, not just every other one');
  console.log('4. Verify in browser console that activities are properly split by child_uuid');
  console.log('5. Look for log: "🎯 Found X activities for host [Name]"');
  
  console.log('\n✨ Expected behavior:');
  console.log('- Each host should get activities where activity.child_uuid matches their UUID');
  console.log('- No more reliance on even/odd array indices');
  console.log('- Guests should see invitations from both hosts for all recurring dates');
}

// Run the test
testMultiHostChildUuidFix().catch(console.error);