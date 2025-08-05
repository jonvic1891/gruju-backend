/**
 * Connection Request Validation Unit Tests
 * Tests validation logic for connection request data
 */

const { validateConnectionRequest, extractChildInfo, createMockConnectionRequest } = require('../helpers/testHelpers');

describe('Connection Request Validation', () => {
  
  describe('validateConnectionRequest', () => {
    test('should validate complete connection request structure', () => {
      const validRequest = {
        id: 1,
        requester_id: 3,
        target_parent_id: 5,
        child_id: 1,
        target_child_id: 2,
        status: 'pending',
        message: 'Test message',
        created_at: '2025-08-05T10:00:00Z',
        updated_at: '2025-08-05T10:00:00Z',
        requester_name: 'johnson',
        requester_email: 'johnson@example.com',
        child_name: 'Emma Johnson',
        child_age: 8,
        child_grade: '3rd',
        child_school: 'Elementary School'
      };

      const validation = validateConnectionRequest(validRequest);

      expect(validation.hasRequiredFields).toBe(true);
      expect(validation.hasDetailedInfo).toBe(true);
      expect(validation.missingFields).toEqual([]);
      expect(validation.missingDetailFields).toEqual([]);
    });

    test('should identify missing required fields', () => {
      const incompleteRequest = {
        id: 1,
        requester_id: 3,
        // Missing target_parent_id, child_id, status, created_at
        child_name: 'Emma Johnson',
        requester_name: 'johnson'
      };

      const validation = validateConnectionRequest(incompleteRequest);

      expect(validation.hasRequiredFields).toBe(false);
      expect(validation.hasDetailedInfo).toBe(true);
      expect(validation.missingFields).toEqual(['target_parent_id', 'child_id', 'status', 'created_at']);
      expect(validation.missingDetailFields).toEqual([]);
    });

    test('should identify missing detailed information fields', () => {
      const basicRequest = {
        id: 1,
        requester_id: 3,
        target_parent_id: 5,
        child_id: 1,
        status: 'pending',
        created_at: '2025-08-05T10:00:00Z'
        // Missing requester_name, child_name
      };

      const validation = validateConnectionRequest(basicRequest);

      expect(validation.hasRequiredFields).toBe(true);
      expect(validation.hasDetailedInfo).toBe(false);
      expect(validation.missingFields).toEqual([]);
      expect(validation.missingDetailFields).toEqual(['requester_name', 'child_name']);
    });
  });

  describe('extractChildInfo', () => {
    test('should extract child information when all fields present', () => {
      const requestWithFullInfo = {
        requester_name: 'johnson',
        requester_email: 'johnson@example.com',
        child_name: 'Emma Johnson',
        child_age: 8,
        child_grade: '3rd',
        child_school: 'Elementary School',
        target_parent_name: 'wong',
        target_child_name: 'Mia Wong',
        target_child_age: 9,
        target_child_grade: '4th',
        target_child_school: 'Elementary School'
      };

      const childInfo = extractChildInfo(requestWithFullInfo);

      expect(childInfo.hasRequesterInfo).toBe(true);
      expect(childInfo.hasTargetInfo).toBe(true);
      expect(childInfo.hasDetailedChildInfo).toBe(true);
      expect(childInfo.requesterFields).toEqual(['requester_name', 'requester_email', 'child_name']);
      expect(childInfo.targetFields).toEqual(['target_parent_name', 'target_child_name']);
    });

    test('should handle partial child information', () => {
      const requestWithPartialInfo = {
        requester_name: 'johnson',
        child_name: 'Emma Johnson'
        // Missing target child info
      };

      const childInfo = extractChildInfo(requestWithPartialInfo);

      expect(childInfo.hasRequesterInfo).toBe(true);
      expect(childInfo.hasTargetInfo).toBe(false);
      expect(childInfo.hasDetailedChildInfo).toBe(true);
      expect(childInfo.requesterFields).toEqual(['requester_name', 'child_name']);
      expect(childInfo.targetFields).toEqual([]);
    });

    test('should handle request with no detailed information', () => {
      const basicRequest = {
        id: 1,
        status: 'pending'
      };

      const childInfo = extractChildInfo(basicRequest);

      expect(childInfo.hasRequesterInfo).toBe(false);
      expect(childInfo.hasTargetInfo).toBe(false);
      expect(childInfo.hasDetailedChildInfo).toBe(false);
      expect(childInfo.requesterFields).toEqual([]);
      expect(childInfo.targetFields).toEqual([]);
    });
  });

  describe('createMockConnectionRequest', () => {
    test('should create default mock connection request', () => {
      const mockRequest = createMockConnectionRequest();

      expect(mockRequest).toHaveProperty('requester_id');
      expect(mockRequest).toHaveProperty('target_parent_id');
      expect(mockRequest).toHaveProperty('child_id');
      expect(mockRequest).toHaveProperty('message');
      expect(typeof mockRequest.requester_id).toBe('number');
      expect(typeof mockRequest.target_parent_id).toBe('number');
      expect(typeof mockRequest.child_id).toBe('number');
      expect(typeof mockRequest.message).toBe('string');
    });

    test('should apply overrides to mock connection request', () => {
      const overrides = {
        message: 'Custom test message',
        target_child_id: 999
      };

      const mockRequest = createMockConnectionRequest(overrides);

      expect(mockRequest.message).toBe('Custom test message');
      expect(mockRequest.target_child_id).toBe(999);
      expect(mockRequest).toHaveProperty('requester_id'); // Default values should still be present
      expect(mockRequest).toHaveProperty('target_parent_id');
      expect(mockRequest).toHaveProperty('child_id');
    });

    test('should handle empty overrides', () => {
      const mockRequest1 = createMockConnectionRequest();
      const mockRequest2 = createMockConnectionRequest({});

      expect(mockRequest1).toEqual(mockRequest2);
    });
  });

  describe('Edge Cases', () => {
    test('should handle null and undefined values in connection request', () => {
      const requestWithNulls = {
        id: 1,
        requester_id: 3,
        target_parent_id: 5,
        child_id: 1,
        target_child_id: null,
        status: 'pending',
        message: null,
        created_at: '2025-08-05T10:00:00Z',
        updated_at: '2025-08-05T10:00:00Z',
        requester_name: 'johnson',
        child_name: 'Emma Johnson',
        target_child_name: null,
        target_child_age: null
      };

      const validation = validateConnectionRequest(requestWithNulls);
      const childInfo = extractChildInfo(requestWithNulls);

      expect(validation.hasRequiredFields).toBe(true);
      expect(validation.hasDetailedInfo).toBe(true);
      expect(childInfo.hasRequesterInfo).toBe(true);
      expect(childInfo.hasTargetInfo).toBe(false); // target_child_name is null
    });

    test('should handle empty string values', () => {
      const requestWithEmptyStrings = {
        id: 1,
        requester_id: 3,
        target_parent_id: 5,
        child_id: 1,
        status: 'pending',
        created_at: '2025-08-05T10:00:00Z',
        requester_name: '',
        child_name: '',
        target_child_name: ''
      };

      const validation = validateConnectionRequest(requestWithEmptyStrings);
      const childInfo = extractChildInfo(requestWithEmptyStrings);

      expect(validation.hasRequiredFields).toBe(true);
      expect(validation.hasDetailedInfo).toBe(true); // Fields exist, even if empty
      expect(childInfo.hasRequesterInfo).toBe(false); // Empty strings don't count as valid info
      expect(childInfo.hasTargetInfo).toBe(true); // target_child_name exists (even if empty)
    });
  });
});

console.log('[TEST] Connection request validation unit tests loaded');