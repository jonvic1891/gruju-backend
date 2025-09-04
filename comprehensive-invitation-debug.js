/**
 * COMPREHENSIVE INVITATION DEBUG SCRIPT
 * 
 * This script will thoroughly test the multi-host invitation system
 * and identify why Emma Johnson isn't receiving invitations.
 */

const API_BASE = 'https://gruju-backend-5014424c95f2.herokuapp.com/api';

// Test configuration
const TEST_CONFIG = {
  // Test users - need to get JWTs manually from browser
  users: {
    emma: {
      email: 'roberts10@example.com',
      jwt: null, // Set from localStorage.getItem("jwt_token")
      expectedChildName: 'Emilia'
    },
    charlie: {
      email: 'roberts11@example.com', 
      jwt: null, // Set from localStorage.getItem("jwt_token")
      expectedChildName: 'Charlie'
    },
    guest: {
      email: 'charlie@example.com',
      jwt: null, // Set from localStorage.getItem("jwt_token")
      expectedChildName: 'Emma Johnson' // The child who should receive invitations
    }
  }
};

async function makeAuthRequest(url, options = {}, jwt) {
  if (!jwt) {
    throw new Error('JWT token required');
  }
  
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

async function debugInvitationFlow() {
  console.log('🔍 COMPREHENSIVE INVITATION DEBUG');
  console.log('=' .repeat(60));
  
  console.log('\n⚠️  SETUP REQUIRED:');
  console.log('1. Open 3 browser tabs and login as:');
  console.log('   - roberts10@example.com (Emma)');
  console.log('   - roberts11@example.com (Charlie)'); 
  console.log('   - charlie@example.com (Guest parent)');
  console.log('2. Get JWT from localStorage.getItem("jwt_token") for each');
  console.log('3. Set them in TEST_CONFIG.users above');
  console.log('4. Ensure connections exist between all users');
  console.log('5. Create rechost26 with Emma & Charlie as joint hosts');
  console.log('6. Invite Emma Johnson to the activity');
  
  // Since we can't get JWTs automatically, provide manual debugging steps
  if (!TEST_CONFIG.users.emma.jwt || !TEST_CONFIG.users.charlie.jwt || !TEST_CONFIG.users.guest.jwt) {
    console.log('\n🔧 MANUAL DEBUGGING STEPS:');
    console.log('\n1. CREATE ACTIVITY (Emma\'s browser):');
    console.log('   - Open DevTools console');
    console.log('   - Create recurring activity with Charlie as joint host');
    console.log('   - Look for logs: "🎯 Primary activity created:" and "✅ Joint host activity created:"');
    console.log('   - Check if both activities have child_uuid field');
    
    console.log('\n2. CHECK ACTIVITY CREATION RESPONSE:');
    console.log('   - In Network tab, find the POST to /api/activities/[uuid]');
    console.log('   - Check response body for createdActivities array');
    console.log('   - Verify each activity has child_uuid field populated');
    
    console.log('\n3. CHECK INVITATION SENDING (Emma\'s browser):');
    console.log('   - Look for log: "🎯 Invitations grouped by host:"');
    console.log('   - Look for log: "🎯 Found X activities for host [Name]"');
    console.log('   - Check if hostActivities array is populated correctly');
    
    console.log('\n4. CHECK GUEST RECEIVING (Guest browser):');
    console.log('   - Open Emma Johnson\'s calendar');
    console.log('   - Check if invitations appear');
    console.log('   - Check console for any errors');
    
    console.log('\n🐛 LIKELY ISSUES TO CHECK:');
    console.log('• child_uuid is null/undefined in activity response');
    console.log('• Frontend filter hostActivities.filter(activity => activity.child_uuid === hostChildUuid) returns empty');
    console.log('• Joint host connections not properly loaded');
    console.log('• Invitation sending logic has bugs');
    
    return;
  }
  
  // If JWTs are available, run automated tests
  try {
    console.log('\n✅ JWT tokens detected - running automated tests');
    
    // Test 1: Get all children for each user
    console.log('\n📋 TEST 1: Getting children for each user');
    const emmaChildren = await makeAuthRequest(`${API_BASE}/children`, {}, TEST_CONFIG.users.emma.jwt);
    const charlieChildren = await makeAuthRequest(`${API_BASE}/children`, {}, TEST_CONFIG.users.charlie.jwt);
    const guestChildren = await makeAuthRequest(`${API_BASE}/children`, {}, TEST_CONFIG.users.guest.jwt);
    
    console.log('Emma\'s children:', emmaChildren.map(c => ({ name: c.name, uuid: c.uuid })));
    console.log('Charlie\'s children:', charlieChildren.map(c => ({ name: c.name, uuid: c.uuid })));
    console.log('Guest\'s children:', guestChildren.map(c => ({ name: c.name, uuid: c.uuid })));
    
    const emmaChild = emmaChildren.find(c => c.name === TEST_CONFIG.users.emma.expectedChildName);
    const charlieChild = charlieChildren.find(c => c.name === TEST_CONFIG.users.charlie.expectedChildName);
    const guestChild = guestChildren.find(c => c.name === TEST_CONFIG.users.guest.expectedChildName);
    
    if (!emmaChild || !charlieChild || !guestChild) {
      console.error('❌ Could not find expected children');
      return;
    }
    
    // Test 2: Check connections
    console.log('\n📋 TEST 2: Checking connections');
    const emmaConnections = await makeAuthRequest(`${API_BASE}/connections/${emmaChild.uuid}`, {}, TEST_CONFIG.users.emma.jwt);
    const charlieConnections = await makeAuthRequest(`${API_BASE}/connections/${charlieChild.uuid}`, {}, TEST_CONFIG.users.charlie.jwt);
    
    console.log('Emma\'s connections:', emmaConnections.map(c => ({ name: c.name, uuid: c.uuid })));
    console.log('Charlie\'s connections:', charlieConnections.map(c => ({ name: c.name, uuid: c.uuid })));
    
    // Test 3: Get recent activities to see if rechost26 exists
    console.log('\n📋 TEST 3: Checking for recent rechost activities');
    const emmaActivities = await makeAuthRequest(`${API_BASE}/calendar/activities?start=2025-09-01&end=2025-12-01`, {}, TEST_CONFIG.users.emma.jwt);
    const guestActivities = await makeAuthRequest(`${API_BASE}/calendar/activities?start=2025-09-01&end=2025-12-01`, {}, TEST_CONFIG.users.guest.jwt);
    
    const rechostActivities = emmaActivities.filter(a => a.name && a.name.toLowerCase().includes('rechost'));
    console.log('Emma\'s rechost activities:', rechostActivities.map(a => ({ 
      name: a.name, 
      uuid: a.uuid, 
      child_uuid: a.child_uuid,
      is_host: a.is_host,
      start_date: a.start_date 
    })));
    
    const guestInvitations = guestActivities.filter(a => 
      a.name && a.name.toLowerCase().includes('rechost') && 
      a.invitation_status && a.invitation_status !== 'none'
    );
    console.log('Guest\'s rechost invitations:', guestInvitations.map(a => ({ 
      name: a.name, 
      uuid: a.uuid, 
      invitation_status: a.invitation_status,
      invited_child_uuid: a.invited_child_uuid,
      start_date: a.start_date 
    })));
    
    if (guestInvitations.length === 0) {
      console.log('\n❌ PROBLEM IDENTIFIED: Guest has no rechost invitations!');
      console.log('This suggests the invitation sending logic is not working.');
    } else {
      console.log('\n✅ Guest has rechost invitations - checking if all are present...');
    }
    
  } catch (error) {
    console.error('❌ Automated test failed:', error.message);
  }
}

// Additional debugging functions
function logFrontendDebugging() {
  console.log('\n🎯 FRONTEND DEBUGGING CODE:');
  console.log('Add this to ChildActivityScreen.tsx around line 2046 to debug:');
  console.log(`
console.log('🔍 DEBUG: createdActivities:', createdActivities);
console.log('🔍 DEBUG: hostChildUuid:', hostChildUuid);
console.log('🔍 DEBUG: jointHostChildren:', jointHostChildren);

// Before filtering
console.log('🔍 DEBUG: Activities before filter:', createdActivities.map(a => ({ 
  uuid: a.uuid, 
  name: a.name,
  child_uuid: a.child_uuid 
})));

// After filtering
console.log('🔍 DEBUG: Activities after filter:', hostActivities.map(a => ({ 
  uuid: a.uuid, 
  name: a.name,
  child_uuid: a.child_uuid 
})));
  `);
  
  console.log('\n📱 BACKEND DEBUGGING CODE:');
  console.log('Add this to postgres-backend.js around line 2240 to debug:');
  console.log(`
console.log('🔍 DEBUG: childUuid parameter:', childUuid);
console.log('🔍 DEBUG: primaryActivity:', primaryActivity);
console.log('🔍 DEBUG: jointChildUuid:', jointChildUuid);
console.log('🔍 DEBUG: jointActivity:', jointActivity);
  `);
}

// Run the debug
debugInvitationFlow().catch(console.error);
logFrontendDebugging();