import axios, { AxiosResponse } from 'axios';
import { LoginRequest, RegisterRequest, AuthResponse, ApiResponse } from '../types';

// API Configuration - Always use production Heroku backend
const API_BASE_URL = 'https://gruju-backend-5014424c95f2.herokuapp.com';

class ApiService {
  private static instance: ApiService;
  private token: string | null = null;

  private constructor() {
    this.token = localStorage.getItem('authToken');
  }

  public static getInstance(): ApiService {
    if (!ApiService.instance) {
      ApiService.instance = new ApiService();
    }
    return ApiService.instance;
  }

  private getAuthHeaders() {
    return this.token ? { Authorization: `Bearer ${this.token}` } : {};
  }

  private async request<T>(
    method: 'get' | 'post' | 'put' | 'delete',
    endpoint: string,
    data?: any
  ): Promise<ApiResponse<T>> {
    try {
      const config = {
        method,
        url: `${API_BASE_URL}${endpoint}`,
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeaders(),
        },
        data,
      };

      const response: AxiosResponse<T> = await axios(config);
      
      // Handle different backend response formats
      const responseData = response.data as any;
      
      // For auth endpoints, the backend returns { success, token, user } directly
      if (endpoint.includes('/auth/') && responseData.success) {
        return {
          success: true,
          data: responseData,
        };
      }
      
      // For other endpoints, check if response.data has a nested 'data' property
      const actualData = responseData?.data !== undefined 
        ? responseData.data 
        : responseData;

      return {
        success: true,
        data: actualData,
      };
    } catch (error: any) {
      console.error(`API ${method.toUpperCase()} ${endpoint} error:`, {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        timestamp: new Date().toISOString()
      });
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Request failed',
      };
    }
  }

  // Authentication
  async login(credentials: LoginRequest): Promise<ApiResponse<AuthResponse>> {
    const response = await this.request<AuthResponse>('post', '/api/auth/login', credentials);
    if (response.success && response.data) {
      this.token = response.data.token;
      localStorage.setItem('authToken', response.data.token);
      localStorage.setItem('userData', JSON.stringify(response.data.user));
    }
    return response;
  }

  async register(userData: RegisterRequest): Promise<ApiResponse<AuthResponse>> {
    const response = await this.request<AuthResponse>('post', '/api/auth/register', userData);
    if (response.success && response.data) {
      this.token = response.data.token;
      localStorage.setItem('authToken', response.data.token);
      localStorage.setItem('userData', JSON.stringify(response.data.user));
    }
    return response;
  }

  async verifyToken(): Promise<ApiResponse<{ user: any }>> {
    return this.request('get', '/api/auth/verify');
  }

  async logout(): Promise<ApiResponse<any>> {
    try {
      // Call server logout endpoint to invalidate server-side session
      const response = await this.request('post', '/api/auth/logout');
      
      // Clear client-side data regardless of server response
      this.token = null;
      localStorage.removeItem('authToken');
      localStorage.removeItem('userData');
      
      return response;
    } catch (error) {
      // Still clear client-side data even if server call fails
      this.token = null;
      localStorage.removeItem('authToken');
      localStorage.removeItem('userData');
      
      console.error('Logout error:', error);
      return { success: false, error: 'Logout completed locally but server logout failed' };
    }
  }

  // Profile
  async updateProfile(profileData: { username: string; email: string; phone: string }): Promise<ApiResponse<any>> {
    const response = await this.request('put', '/api/users/profile', profileData);
    if (response.success && response.data) {
      // Update stored user data
      const userData = JSON.parse(localStorage.getItem('userData') || '{}');
      const updatedUserData = { ...userData, ...response.data };
      localStorage.setItem('userData', JSON.stringify(updatedUserData));
    }
    return response;
  }

  // Children
  async getChildren(): Promise<ApiResponse<any[]>> {
    return this.request('get', '/api/children');
  }

  async createChild(childData: { first_name: string; last_name?: string; name?: string }): Promise<ApiResponse<any>> {
    return this.request('post', '/api/children', childData);
  }

  async deleteChild(childId: number): Promise<ApiResponse<any>> {
    return this.request('delete', `/api/children/${childId}`);
  }

  // Activities
  async getActivities(childId: number): Promise<ApiResponse<any[]>> {
    return this.request<any[]>('get', `/api/activities/${childId}`);
  }

  async getCalendarActivities(startDate: string, endDate: string): Promise<ApiResponse<any[]>> {
    return this.request('get', `/api/calendar/activities?start=${startDate}&end=${endDate}`);
  }

  async createActivity(childId: number, activityData: any): Promise<ApiResponse<any>> {
    return this.request('post', `/api/activities/${childId}`, activityData);
  }

  async updateActivity(activityId: number, activityData: any): Promise<ApiResponse<any>> {
    return this.request('put', `/api/activities/update/${activityId}`, activityData);
  }

  async deleteActivity(activityId: number): Promise<ApiResponse<any>> {
    return this.request('delete', `/api/activities/delete/${activityId}`);
  }

  async duplicateActivity(activityId: number, newStartDate: string, newEndDate: string): Promise<ApiResponse<any>> {
    return this.request('post', `/api/activities/${activityId}/duplicate`, {
      new_start_date: newStartDate,
      new_end_date: newEndDate
    });
  }

  async getConnectedActivities(startDate: string, endDate: string): Promise<ApiResponse<any[]>> {
    return this.request('get', `/api/calendar/connected-activities?start=${startDate}&end=${endDate}`);
  }

  // Unified method to get all invitations (replaces separate accepted/pending/declined methods)
  async getAllInvitations(startDate: string, endDate: string): Promise<ApiResponse<any[]>> {
    return this.request('get', `/api/calendar/invitations?start=${startDate}&end=${endDate}`);
  }

  // Helper methods to filter invitations by status
  async getInvitedActivities(startDate: string, endDate: string): Promise<ApiResponse<any[]>> {
    const allInvitationsResponse = await this.getAllInvitations(startDate, endDate);
    if (!allInvitationsResponse.success) {
      return allInvitationsResponse;
    }
    
    const acceptedInvitations = allInvitationsResponse.data?.filter(invitation => invitation.status === 'accepted') || [];
    return {
      success: true,
      data: acceptedInvitations
    };
  }

  async getActivityCounts(startDate: string, endDate: string, includeConnected: boolean = false): Promise<ApiResponse<any[]>> {
    return this.request('get', `/api/calendar/activity-counts?start=${startDate}&end=${endDate}&include_connected=${includeConnected}`);
  }

  // Connections
  async getConnectionRequests(): Promise<ApiResponse<any[]>> {
    // Add cache-busting parameter to force fresh request
    const timestamp = Date.now();
    return this.request('get', `/api/connections/requests?_t=${timestamp}`);
  }

  async getSentConnectionRequests(): Promise<ApiResponse<any[]>> {
    // Add cache-busting parameter to force fresh request
    const timestamp = Date.now();
    return this.request('get', `/api/connections/sent-requests?_t=${timestamp}`);
  }

  async searchParent(query: string): Promise<ApiResponse<any[]>> {
    return this.request('get', `/api/connections/search?q=${encodeURIComponent(query)}`);
  }

  async sendConnectionRequest(requestData: any): Promise<ApiResponse<any>> {
    return this.request('post', '/api/connections/request', requestData);
  }

  async respondToConnectionRequest(requestId: number, action: 'accept' | 'reject'): Promise<ApiResponse<any>> {
    return this.request('post', `/api/connections/respond/${requestId}`, { action });
  }

  async getConnections(): Promise<ApiResponse<any[]>> {
    return this.request('get', '/api/connections');
  }

  async deleteConnection(connectionId: number): Promise<ApiResponse<any>> {
    // Try different possible endpoint patterns
    try {
      // First try the standard delete pattern
      return await this.request('delete', `/api/connections/${connectionId}`);
    } catch (error) {
      // If that fails, try using the respond endpoint to "remove" or "delete" the connection
      try {
        return await this.request('post', `/api/connections/respond/${connectionId}`, { action: 'delete' });
      } catch (error2) {
        // If that fails, try a different endpoint pattern
        try {
          return await this.request('post', `/api/connections/${connectionId}/remove`);
        } catch (error3) {
          // If all fail, return the original error
          throw error;
        }
      }
    }
  }

  // Activity Invitations
  async sendActivityInvitation(activityId: number, invitedParentId: number, childId?: number, message?: string): Promise<ApiResponse<any>> {
    return this.request('post', `/api/activities/${activityId}/invite`, { 
      invited_parent_id: invitedParentId,
      child_id: childId,
      message 
    });
  }

  async getActivityInvitations(): Promise<ApiResponse<any[]>> {
    return this.request('get', '/api/activity-invitations');
  }

  async getPendingInvitationsForCalendar(startDate: string, endDate: string): Promise<ApiResponse<any[]>> {
    const allInvitationsResponse = await this.getAllInvitations(startDate, endDate);
    if (!allInvitationsResponse.success) {
      return allInvitationsResponse;
    }
    
    const pendingInvitations = allInvitationsResponse.data?.filter(invitation => invitation.status === 'pending') || [];
    return {
      success: true,
      data: pendingInvitations
    };
  }

  async getDeclinedInvitationsForCalendar(startDate: string, endDate: string): Promise<ApiResponse<any[]>> {
    const allInvitationsResponse = await this.getAllInvitations(startDate, endDate);
    if (!allInvitationsResponse.success) {
      return allInvitationsResponse;
    }
    
    const declinedInvitations = allInvitationsResponse.data?.filter(invitation => invitation.status === 'declined') || [];
    return {
      success: true,
      data: declinedInvitations
    };
  }

  async respondToActivityInvitation(invitationId: number, action: 'accept' | 'reject'): Promise<ApiResponse<any>> {
    return this.request('post', `/api/activity-invitations/${invitationId}/respond`, { action });
  }

  async getActivityParticipants(activityId: number): Promise<ApiResponse<any>> {
    return this.request('get', `/api/activities/${activityId}/participants`);
  }
}

export default ApiService;