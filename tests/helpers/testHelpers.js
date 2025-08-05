/**
 * Test Helpers
 * Utility functions for setting up test data and authentication
 */

const jwt = require('jsonwebtoken');

/**
 * Test user data for consistent testing
 */
const TEST_USERS = {
  johnson: {
    id: 3,
    username: 'johnson',
    email: 'johnson@example.com',
    role: 'user',
    family_name: 'Johnson Family'
  },
  wong: {
    id: 5,
    username: 'wong',
    email: 'wong@example.com',
    role: 'user',
    family_name: 'Wong Family'
  },
  davis: {
    id: 4,
    username: 'davis',
    email: 'davis@example.com',
    role: 'user',
    family_name: 'Davis Family'
  }
};

/**
 * Test children data
 */
const TEST_CHILDREN = {
  emma_johnson: { id: 1, name: 'Emma Johnson', parent_id: 3 },
  alex_johnson: { id: 2, name: 'Alex Johnson', parent_id: 3 },
  jake_davis: { id: 3, name: 'Jake Davis', parent_id: 4 },
  mia_davis: { id: 4, name: 'Mia Davis', parent_id: 4 },
  mia_wong: { id: 5, name: 'Mia Wong', parent_id: 5 },
  ryan_wong: { id: 6, name: 'Ryan Wong', parent_id: 5 },
  zoe_wong: { id: 7, name: 'Zoe Wong', parent_id: 5 }
};

/**
 * Generate JWT token for test user
 * @param {Object} user - User object with id, email, role, username
 * @returns {string} JWT token
 */
function generateTestToken(user) {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    username: user.username
  };
  
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' });
}

/**
 * Create authorization header for supertest requests
 * @param {Object} user - User object
 * @returns {Object} Headers object with authorization
 */
function createAuthHeaders(user) {
  const token = generateTestToken(user);
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
}

/**
 * Wait for a specified number of milliseconds
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise} Promise that resolves after the specified time
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Extract detailed child information from a connection request
 * @param {Object} request - Connection request object
 * @returns {Object} Extracted child information
 */
function extractChildInfo(request) {
  return {
    hasRequesterInfo: !!(request.requester_name && request.child_name),
    hasTargetInfo: !!request.target_child_name,
    hasDetailedChildInfo: !!(request.child_name || request.target_child_name),
    requesterFields: ['requester_name', 'requester_email', 'child_name'].filter(field => request[field]),
    targetFields: ['target_parent_name', 'target_child_name'].filter(field => request[field])
  };
}

/**
 * Validate connection request structure
 * @param {Object} request - Connection request to validate
 * @returns {Object} Validation results
 */
function validateConnectionRequest(request) {
  const requiredFields = ['id', 'requester_id', 'target_parent_id', 'child_id', 'status', 'created_at'];
  const detailFields = ['requester_name', 'child_name'];
  
  const validation = {
    hasRequiredFields: requiredFields.every(field => request.hasOwnProperty(field)),
    hasDetailedInfo: detailFields.every(field => request.hasOwnProperty(field)),
    missingFields: requiredFields.filter(field => !request.hasOwnProperty(field)),
    missingDetailFields: detailFields.filter(field => !request.hasOwnProperty(field))
  };
  
  return validation;
}

/**
 * Mock connection request data for testing
 * @param {Object} overrides - Fields to override in the mock data
 * @returns {Object} Mock connection request
 */
function createMockConnectionRequest(overrides = {}) {
  const defaultRequest = {
    requester_id: TEST_USERS.wong.id,
    target_parent_id: TEST_USERS.johnson.id,
    child_id: TEST_CHILDREN.ryan_wong.id,
    target_child_id: TEST_CHILDREN.emily_johnson.id,
    message: 'Test connection request'
  };
  
  return { ...defaultRequest, ...overrides };
}

module.exports = {
  TEST_USERS,
  TEST_CHILDREN,
  generateTestToken,
  createAuthHeaders,
  sleep,
  extractChildInfo,
  validateConnectionRequest,
  createMockConnectionRequest
};