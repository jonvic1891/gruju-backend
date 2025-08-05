/**
 * API Service Tests
 * Tests the API service connection request methods
 */

import axios from 'axios';
import ApiService from '../api';
import { ApiResponse, ConnectionRequest } from '../../types';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    })
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('ApiService', () => {
  let apiService: ApiService;
  
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    
    // Get a fresh instance
    apiService = ApiService.getInstance();
    
    // Setup default auth token
    localStorageMock.setItem('authToken', 'test-jwt-token');
  });

  describe('Connection Request Methods', () => {
    
    describe('getConnectionRequests', () => {
      test('should fetch connection requests with detailed information', async () => {
        const mockResponse = {
          data: [
            {
              id: 1,
              requester_id: 3,
              target_parent_id: 5,
              child_id: 1,
              status: 'pending',
              requester_name: 'johnson',
              requester_email: 'johnson@example.com',
              child_name: 'Emma Johnson',
              child_age: 8,
              child_grade: '3rd',
              child_school: 'Elementary School',
              target_child_name: 'Mia Wong',
              target_child_age: 9,
              target_child_grade: '4th',
              target_child_school: 'Elementary School'
            }
          ]
        };

        mockedAxios.mockResolvedValue({ data: mockResponse });

        const result = await apiService.getConnectionRequests();

        expect(mockedAxios).toHaveBeenCalledWith({
          method: 'get',
          url: 'https://gruju-backend-5014424c95f2.herokuapp.com/api/connections/requests',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-jwt-token'
          },
          data: undefined
        });

        expect(result.success).toBe(true);
        expect(result.data).toEqual(mockResponse);
        expect(result.data[0]).toHaveProperty('requester_name');
        expect(result.data[0]).toHaveProperty('child_name');
        expect(result.data[0]).toHaveProperty('child_age');
        expect(result.data[0]).toHaveProperty('target_child_name');
      });

      test('should handle API errors', async () => {
        const mockError = {
          response: {
            status: 500,
            data: { error: 'Internal server error' }
          }
        };

        mockedAxios.mockRejectedValue(mockError);

        const result = await apiService.getConnectionRequests();

        expect(result.success).toBe(false);
        expect(result.error).toBe('Internal server error');
      });
    });

    describe('getSentConnectionRequests', () => {
      test('should fetch sent connection requests', async () => {
        const mockResponse = {
          data: [
            {
              id: 2,
              requester_id: 5,
              target_parent_id: 3,
              child_id: 5,
              status: 'pending',
              target_parent_name: 'johnson',
              target_parent_email: 'johnson@example.com',
              child_name: 'Ryan Wong',
              child_age: 10,
              target_child_name: 'Alex Johnson',
              target_child_age: 6
            }
          ]
        };

        mockedAxios.mockResolvedValue({ data: mockResponse });

        const result = await apiService.getSentConnectionRequests();

        expect(mockedAxios).toHaveBeenCalledWith({
          method: 'get',
          url: 'https://gruju-backend-5014424c95f2.herokuapp.com/api/connections/sent-requests',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-jwt-token'
          },
          data: undefined
        });

        expect(result.success).toBe(true);
        expect(result.data).toEqual(mockResponse);
        expect(result.data[0]).toHaveProperty('target_parent_name');
        expect(result.data[0]).toHaveProperty('child_name');
      });
    });

    describe('sendConnectionRequest', () => {
      test('should send connection request with all parameters', async () => {
        const requestData = {
          target_parent_id: 3,
          child_id: 5,
          target_child_id: 1,
          message: 'Test connection request'
        };

        const mockResponse = {
          data: {
            id: 3,
            ...requestData,
            status: 'pending',
            requester_name: 'wong',
            target_parent_name: 'johnson',
            child_name: 'Ryan Wong',
            target_child_name: 'Emma Johnson'
          },
          message: 'Connection request sent successfully'
        };

        mockedAxios.mockResolvedValue({ data: mockResponse });

        const result = await apiService.sendConnectionRequest(requestData);

        expect(mockedAxios).toHaveBeenCalledWith({
          method: 'post',
          url: 'https://gruju-backend-5014424c95f2.herokuapp.com/api/connections/request',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-jwt-token'
          },
          data: requestData
        });

        expect(result.success).toBe(true);
        expect(result.data).toEqual(mockResponse);
        expect(result.data.data).toHaveProperty('requester_name');
        expect(result.data.data).toHaveProperty('target_parent_name');
        expect(result.data.data).toHaveProperty('child_name');
        expect(result.data.data).toHaveProperty('target_child_name');
      });

      test('should send connection request without target child', async () => {
        const requestData = {
          target_parent_id: 3,
          child_id: 5,
          message: 'General connection request'
        };

        const mockResponse = {
          data: {
            id: 4,
            ...requestData,
            target_child_id: null,
            status: 'pending',
            requester_name: 'wong',
            target_parent_name: 'johnson',
            child_name: 'Ryan Wong',
            target_child_name: null
          }
        };

        mockedAxios.mockResolvedValue({ data: mockResponse });

        const result = await apiService.sendConnectionRequest(requestData);

        expect(result.success).toBe(true);
        expect(result.data.data.target_child_id).toBeNull();
        expect(result.data.data.target_child_name).toBeNull();
      });
    });

    describe('respondToConnectionRequest', () => {
      test('should accept connection request', async () => {
        const mockResponse = { success: true };
        mockedAxios.mockResolvedValue({ data: mockResponse });

        const result = await apiService.respondToConnectionRequest(1, 'accept');

        expect(mockedAxios).toHaveBeenCalledWith({
          method: 'post',
          url: 'https://gruju-backend-5014424c95f2.herokuapp.com/api/connections/respond/1',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-jwt-token'
          },
          data: { action: 'accept' }
        });

        expect(result.success).toBe(true);
      });

      test('should reject connection request', async () => {
        const mockResponse = { success: true };
        mockedAxios.mockResolvedValue({ data: mockResponse });

        const result = await apiService.respondToConnectionRequest(2, 'reject');

        expect(mockedAxios).toHaveBeenCalledWith({
          method: 'post',
          url: 'https://gruju-backend-5014424c95f2.herokuapp.com/api/connections/respond/2',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-jwt-token'
          },
          data: { action: 'reject' }
        });

        expect(result.success).toBe(true);
      });
    });

    describe('searchParent', () => {
      test('should search parents by query', async () => {
        const mockResponse = [
          {
            id: 3,
            username: 'johnson',
            email: 'johnson@example.com',
            phone: '123-456-7890',
            children: [
              { id: 1, name: 'Emma Johnson', age: 8 },
              { id: 2, name: 'Alex Johnson', age: 6 }
            ]
          }
        ];

        mockedAxios.mockResolvedValue({ data: mockResponse });

        const result = await apiService.searchParent('johnson@example.com');

        expect(mockedAxios).toHaveBeenCalledWith({
          method: 'get',
          url: 'https://gruju-backend-5014424c95f2.herokuapp.com/api/connections/search?q=johnson%40example.com',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-jwt-token'
          },
          data: undefined
        });

        expect(result.success).toBe(true);
        expect(result.data).toEqual(mockResponse);
        expect(result.data[0]).toHaveProperty('children');
        expect(Array.isArray(result.data[0].children)).toBe(true);
      });

      test('should handle special characters in search query', async () => {
        const mockResponse = [];
        mockedAxios.mockResolvedValue({ data: mockResponse });

        await apiService.searchParent('test+user@example.com');

        expect(mockedAxios).toHaveBeenCalledWith(
          expect.objectContaining({
            url: 'https://gruju-backend-5014424c95f2.herokuapp.com/api/connections/search?q=test%2Buser%40example.com'
          })
        );
      });
    });
  });

  describe('Authentication Handling', () => {
    test('should include authorization header when token is present', async () => {
      localStorageMock.setItem('authToken', 'valid-token');
      
      mockedAxios.mockResolvedValue({ data: [] });
      
      await apiService.getConnectionRequests();
      
      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer valid-token'
          })
        })
      );
    });

    test('should not include authorization header when token is missing', async () => {
      localStorageMock.removeItem('authToken');
      
      // Create new instance to reflect the missing token
      const newApiService = ApiService.getInstance();
      
      mockedAxios.mockResolvedValue({ data: [] });
      
      await newApiService.getConnectionRequests();
      
      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.not.objectContaining({
            'Authorization': expect.any(String)
          })
        })
      );
    });
  });

  describe('Error Handling', () => {
    test('should handle network errors', async () => {
      const networkError = new Error('Network Error');
      mockedAxios.mockRejectedValue(networkError);

      const result = await apiService.getConnectionRequests();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network Error');
    });

    test('should handle HTTP error responses', async () => {
      const httpError = {
        response: {
          status: 404,
          statusText: 'Not Found',
          data: { error: 'Endpoint not found' }
        }
      };
      mockedAxios.mockRejectedValue(httpError);

      const result = await apiService.getConnectionRequests();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Endpoint not found');
    });

    test('should handle malformed error responses', async () => {
      const malformedError = {
        response: {
          status: 500,
          data: 'Internal Server Error'
        }
      };
      mockedAxios.mockRejectedValue(malformedError);

      const result = await apiService.getConnectionRequests();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Request failed');
    });
  });
});

console.log('[TEST] API Service test suite loaded');