/**
 * Connection Requests API Integration Tests
 * Tests the complete connection request functionality including detailed child information
 */

const request = require('supertest');
const { TEST_USERS, TEST_CHILDREN, createAuthHeaders, validateConnectionRequest, createMockConnectionRequest } = require('../../helpers/testHelpers');

// Import the app - we'll need to structure this properly
let app;
let server;

beforeAll(async () => {
  // Start the server for testing
  const { Pool } = require('pg');
  
  // Test that we can connect to the database
  console.log('[TEST] Starting connection requests integration tests');
  
  // Import and start the server
  delete require.cache[require.resolve('../../../postgres-backend.js')];
  app = require('../../../postgres-backend.js');
  
  // Wait for server to be ready
  await new Promise(resolve => setTimeout(resolve, 2000));
});

afterAll(async () => {
  if (server) {
    await new Promise(resolve => server.close(resolve));
  }
});

describe('Connection Requests API', () => {
  
  describe('GET /api/connections/requests', () => {
    test('should return detailed connection requests for authenticated user', async () => {
      const headers = createAuthHeaders(TEST_USERS.johnson);
      
      const response = await request(app)
        .get('/api/connections/requests')
        .set(headers)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      
      // If there are requests, validate their structure
      if (response.body.data.length > 0) {
        const firstRequest = response.body.data[0];
        
        // Validate basic structure
        const validation = validateConnectionRequest(firstRequest);
        expect(validation.hasRequiredFields).toBe(true);
        
        // Validate detailed information fields
        expect(firstRequest).toHaveProperty('requester_name');
        expect(firstRequest).toHaveProperty('requester_email');
        expect(firstRequest).toHaveProperty('child_name');
        
        // Validate data types
        expect(typeof firstRequest.id).toBe('number');
        expect(typeof firstRequest.requester_id).toBe('number');
        expect(typeof firstRequest.target_parent_id).toBe('number');
        expect(typeof firstRequest.child_id).toBe('number');
        expect(firstRequest.status).toBe('pending');
        expect(typeof firstRequest.created_at).toBe('string');
        
        // Validate detailed child information
        expect(typeof firstRequest.requester_name).toBe('string');
        expect(typeof firstRequest.child_name).toBe('string');
        
        console.log('[TEST] ✅ Connection request structure validated:', {
          hasDetailedInfo: validation.hasDetailedInfo,
          requesterName: firstRequest.requester_name,
          childName: firstRequest.child_name,
          targetChildName: firstRequest.target_child_name
        });
      }
    });

    test('should return 401 for unauthenticated requests', async () => {
      const response = await request(app)
        .get('/api/connections/requests')
        .expect(401);

      expect(response.text).toBe('Unauthorized');
    });

    test('should return empty array when user has no pending requests', async () => {
      // Use a user who likely has no pending requests
      const headers = createAuthHeaders({
        id: 999,
        username: 'testuser',
        email: 'test@example.com',
        role: 'user'
      });
      
      const response = await request(app)
        .get('/api/connections/requests')
        .set(headers)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('GET /api/connections/sent-requests', () => {
    test('should return detailed sent connection requests for authenticated user', async () => {
      const headers = createAuthHeaders(TEST_USERS.wong);
      
      const response = await request(app)
        .get('/api/connections/sent-requests')
        .set(headers)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      
      // If there are sent requests, validate their structure
      if (response.body.data.length > 0) {
        const firstRequest = response.body.data[0];
        
        // Validate basic structure
        const validation = validateConnectionRequest(firstRequest);
        expect(validation.hasRequiredFields).toBe(true);
        
        // Validate sent request specific fields
        expect(firstRequest).toHaveProperty('target_parent_name');
        expect(firstRequest).toHaveProperty('target_parent_email');
        expect(firstRequest).toHaveProperty('child_name');
        
        // Validate that this is indeed a sent request (requester_id matches our user)
        expect(firstRequest.requester_id).toBe(TEST_USERS.wong.id);
        
        console.log('[TEST] ✅ Sent request structure validated:', {
          targetParentName: firstRequest.target_parent_name,
          childName: firstRequest.child_name,
          targetChildName: firstRequest.target_child_name
        });
      }
    });

    test('should return 401 for unauthenticated requests', async () => {
      const response = await request(app)
        .get('/api/connections/sent-requests')
        .expect(401);

      expect(response.text).toBe('Unauthorized');
    });
  });

  describe('POST /api/connections/request', () => {
    test('should create connection request with detailed information', async () => {
      const headers = createAuthHeaders(TEST_USERS.davis);
      
      const requestData = {
        target_parent_id: TEST_USERS.johnson.id,
        child_id: TEST_CHILDREN.jake_davis.id,
        target_child_id: TEST_CHILDREN.alex_johnson.id,
        message: 'Test connection request with detailed info'
      };

      const response = await request(app)
        .post('/api/connections/request')
        .set(headers)
        .send(requestData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.message).toBe('Connection request sent successfully');
      
      // Validate the returned detailed information
      const createdRequest = response.body.data;
      expect(createdRequest).toHaveProperty('id');
      expect(createdRequest).toHaveProperty('requester_name');
      expect(createdRequest).toHaveProperty('target_parent_name');
      expect(createdRequest).toHaveProperty('child_name');
      expect(createdRequest).toHaveProperty('target_child_name');
      
      // Validate specific values
      expect(createdRequest.requester_id).toBe(TEST_USERS.davis.id);
      expect(createdRequest.target_parent_id).toBe(TEST_USERS.johnson.id);
      expect(createdRequest.child_id).toBe(TEST_CHILDREN.jake_davis.id);
      expect(createdRequest.target_child_id).toBe(TEST_CHILDREN.alex_johnson.id);
      expect(createdRequest.message).toBe('Test connection request with detailed info');
      expect(createdRequest.status).toBe('pending');
      
      console.log('[TEST] ✅ Connection request created with detailed info:', {
        requesterName: createdRequest.requester_name,
        targetParentName: createdRequest.target_parent_name,
        childName: createdRequest.child_name,
        targetChildName: createdRequest.target_child_name
      });
    });

    test('should create connection request without target child (general request)', async () => {
      const headers = createAuthHeaders(TEST_USERS.davis);
      
      const requestData = {
        target_parent_id: TEST_USERS.wong.id,
        child_id: TEST_CHILDREN.mia_davis.id,
        message: 'General connection request without specific target child'
      };

      const response = await request(app)
        .post('/api/connections/request')
        .set(headers)
        .send(requestData)
        .expect(200);

      expect(response.body.success).toBe(true);
      
      const createdRequest = response.body.data;
      expect(createdRequest.target_child_id).toBeNull();
      expect(createdRequest.target_child_name).toBeNull();
      expect(createdRequest.child_name).toBeDefined();
      expect(createdRequest.requester_name).toBeDefined();
    });

    test('should return 400 for missing required fields', async () => {
      const headers = createAuthHeaders(TEST_USERS.davis);
      
      const requestData = {
        target_parent_id: TEST_USERS.johnson.id
        // Missing child_id
      };

      const response = await request(app)
        .post('/api/connections/request')
        .set(headers)
        .send(requestData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('required');
    });

    test('should return 401 for unauthenticated requests', async () => {
      const requestData = createMockConnectionRequest();
      
      const response = await request(app)
        .post('/api/connections/request')
        .send(requestData)
        .expect(401);

      expect(response.text).toBe('Unauthorized');
    });
  });

  describe('GET /api/connections/search', () => {
    test('should search parents and return results with children', async () => {
      const headers = createAuthHeaders(TEST_USERS.davis);
      
      const response = await request(app)
        .get('/api/connections/search?q=johnson@example.com')
        .set(headers)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      
      if (response.body.data.length > 0) {
        const parent = response.body.data[0];
        expect(parent).toHaveProperty('id');
        expect(parent).toHaveProperty('username');
        expect(parent).toHaveProperty('email');
        expect(parent).toHaveProperty('children');
        expect(Array.isArray(parent.children)).toBe(true);
        
        console.log('[TEST] ✅ Parent search result:', {
          username: parent.username,
          email: parent.email,
          childrenCount: parent.children.length
        });
      }
    });

    test('should return empty array for non-existent email', async () => {
      const headers = createAuthHeaders(TEST_USERS.davis);
      
      const response = await request(app)
        .get('/api/connections/search?q=nonexistent@example.com')
        .set(headers)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });

    test('should return 400 for missing query parameter', async () => {
      const headers = createAuthHeaders(TEST_USERS.davis);
      
      const response = await request(app)
        .get('/api/connections/search')
        .set(headers)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/connections/respond/:requestId', () => {
    test('should accept connection request', async () => {
      // First, create a connection request to accept
      const headers = createAuthHeaders(TEST_USERS.davis);
      
      const createResponse = await request(app)
        .post('/api/connections/request')
        .set(headers)
        .send({
          target_parent_id: TEST_USERS.johnson.id,
          child_id: TEST_CHILDREN.jake_davis.id,
          message: 'Request to accept'
        })
        .expect(200);

      const requestId = createResponse.body.data.id;
      
      // Now accept it as Johnson
      const johnsonHeaders = createAuthHeaders(TEST_USERS.johnson);
      
      const acceptResponse = await request(app)
        .post(`/api/connections/respond/${requestId}`)
        .set(johnsonHeaders)
        .send({ action: 'accept' })
        .expect(200);

      expect(acceptResponse.body.success).toBe(true);
      
      console.log('[TEST] ✅ Connection request accepted successfully');
    });

    test('should reject connection request', async () => {
      // First, create a connection request to reject
      const headers = createAuthHeaders(TEST_USERS.davis);
      
      const createResponse = await request(app)
        .post('/api/connections/request')
        .set(headers)
        .send({
          target_parent_id: TEST_USERS.johnson.id,
          child_id: TEST_CHILDREN.mia_davis.id,
          message: 'Request to reject'
        })
        .expect(200);

      const requestId = createResponse.body.data.id;
      
      // Now reject it as Johnson
      const johnsonHeaders = createAuthHeaders(TEST_USERS.johnson);
      
      const rejectResponse = await request(app)
        .post(`/api/connections/respond/${requestId}`)
        .set(johnsonHeaders)
        .send({ action: 'reject' })
        .expect(200);

      expect(rejectResponse.body.success).toBe(true);
      
      console.log('[TEST] ✅ Connection request rejected successfully');
    });

    test('should return 400 for invalid action', async () => {
      const headers = createAuthHeaders(TEST_USERS.johnson);
      
      const response = await request(app)
        .post('/api/connections/respond/999')
        .set(headers)
        .send({ action: 'invalid' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});

console.log('[TEST] Connection Requests API test suite loaded');