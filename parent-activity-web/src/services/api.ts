import axios, { AxiosResponse } from 'axios';
import { LoginRequest, RegisterRequest, AuthResponse, ApiResponse } from '../types';

// API Configuration - Force test backend for test environment
const API_BASE_URL = 'https://gruju-backend-5014424c95f2.herokuapp.com';

// Debug logging to verify which backend we're connecting to
console.log('🔗 API Configuration (TEST ENVIRONMENT):', {
  REACT_APP_API_URL: process.env.REACT_APP_API_URL,
  API_BASE_URL: API_BASE_URL,
  NODE_ENV: process.env.NODE_ENV,
  environment: 'TEST',
  timestamp: new Date().toISOString()
});

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
    console.log('🔐 Login attempt:', {
      email: credentials.email,
      backend: API_BASE_URL,
      url: `${API_BASE_URL}/api/auth/login`,
      timestamp: new Date().toISOString()
    });
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

  async changePassword(passwordData: { currentPassword: string; newPassword: string }): Promise<ApiResponse<any>> {
    return this.request('put', '/api/users/change-password', passwordData);
  }

  // Parents
  async getParents(): Promise<ApiResponse<any[]>> {
    // Add cache-busting parameter to force fresh request
    const timestamp = Date.now();
    return this.request('get', `/api/parents?_t=${timestamp}`);
  }

  async createParent(parentData: { username: string; email: string; phone: string; password: string; role?: string }): Promise<ApiResponse<any>> {
    return this.request('post', '/api/parents', parentData);
  }

  async deleteParent(parentUuid: string): Promise<ApiResponse<any>> {
    return this.request('delete', `/api/parents/${parentUuid}`);
  }

  async updateParent(parentUuid: string, parentData: any): Promise<ApiResponse<any>> {
    return this.request('put', `/api/parents/${parentUuid}`, parentData);
  }

  // Children
  async getChildren(): Promise<ApiResponse<any[]>> {
    // Add cache-busting parameter to force fresh request
    const timestamp = Date.now();
    return this.request('get', `/api/children?_t=${timestamp}`);
  }

  async createChild(childData: { first_name: string; last_name?: string; name?: string }): Promise<ApiResponse<any>> {
    return this.request('post', '/api/children', childData);
  }

  async deleteChild(childUuid: string): Promise<ApiResponse<any>> {
    return this.request('delete', `/api/children/${childUuid}`);
  }

  async updateChild(childUuid: string, childData: any): Promise<ApiResponse<any>> {
    return this.request('put', `/api/children/${childUuid}`, childData);
  }

  // Activities
  async getActivities(childUuid: string): Promise<ApiResponse<any[]>> {
    return this.request<any[]>('get', `/api/activities/${childUuid}`);
  }

  async getCalendarActivities(startDate: string, endDate: string): Promise<ApiResponse<any[]>> {
    return this.request('get', `/api/calendar/activities?start=${startDate}&end=${endDate}&_t=${Date.now()}`);
  }

  async createActivity(childUuid: string, activityData: any): Promise<ApiResponse<any>> {
    return this.request('post', `/api/activities/${childUuid}`, activityData);
  }

  async updateActivity(activityUuid: string, activityData: any): Promise<ApiResponse<any>> {
    return this.request('put', `/api/activities/update/${activityUuid}`, activityData);
  }

  async deleteActivity(activityUuid: string): Promise<ApiResponse<any>> {
    return this.request('delete', `/api/activities/delete/${activityUuid}`);
  }

  async deleteActivitySeries(activityName: string, childUuid: string): Promise<ApiResponse<any>> {
    // Try to delete entire series by activity name and child UUID
    // This will delete all activities with the same name for the specific child
    return this.request('delete', `/api/activities/delete-series`, {
      activity_name: activityName,
      child_uuid: childUuid
    });
  }

  async duplicateActivity(activityUuid: string, newStartDate: string, newEndDate: string): Promise<ApiResponse<any>> {
    return this.request('post', `/api/activities/${activityUuid}/duplicate`, {
      new_start_date: newStartDate,
      new_end_date: newEndDate
    });
  }

  async markActivityCantAttend(activityUuid: string): Promise<ApiResponse<any>> {
    return this.request('post', `/api/activities/${activityUuid}/cant-attend`);
  }

  async getConnectedActivities(startDate: string, endDate: string): Promise<ApiResponse<any[]>> {
    return this.request('get', `/api/calendar/connected-activities?start=${startDate}&end=${endDate}`);
  }

  // Unified method to get all invitations (replaces separate accepted/pending/declined methods)
  async getAllInvitations(startDate: string, endDate: string): Promise<ApiResponse<any[]>> {
    // Add cache-busting parameter to force fresh request
    const timestamp = Date.now();
    return this.request('get', `/api/calendar/invitations?start=${startDate}&end=${endDate}&_t=${timestamp}`);
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

  async createSkeletonAccount(requestData: any): Promise<ApiResponse<any>> {
    return this.request('post', '/api/connections/create-skeleton', requestData);
  }

  async respondToConnectionRequest(requestUuid: string, action: 'accept' | 'reject'): Promise<ApiResponse<any>> {
    return this.request('post', `/api/connections/respond/${requestUuid}`, { action });
  }

  async getConnections(): Promise<ApiResponse<any[]>> {
    return this.request('get', '/api/connections');
  }

  async getChildConnections(childUuid: string): Promise<ApiResponse<any[]>> {
    return this.request('get', `/api/connections/${childUuid}`);
  }

  async deleteConnection(connectionId: string): Promise<ApiResponse<any>> {
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

  // Activity Invitations - TEMPORARY: Accept both UUIDs and IDs during migration
  async sendActivityInvitation(activityUuid: string, invitedParentUuid: string, childUuid?: string, message?: string): Promise<ApiResponse<any>> {
    return this.request('post', `/api/activities/${activityUuid}/invite`, { 
      invited_parent_uuid: invitedParentUuid,
      child_uuid: childUuid,
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
    
    const declinedInvitations = allInvitationsResponse.data?.filter(invitation => invitation.status === 'rejected') || [];
    return {
      success: true,
      data: declinedInvitations
    };
  }

  async respondToActivityInvitation(invitationUuid: string, action: 'accept' | 'reject'): Promise<ApiResponse<any>> {
    return this.request('post', `/api/activity-invitations/${invitationUuid}/respond`, { action });
  }

  async markInvitationAsViewed(invitationUuid: string): Promise<ApiResponse<any>> {
    return this.request('post', `/api/activity-invitations/${invitationUuid}/view`);
  }

  async markStatusChangeAsViewed(invitationUuid: string): Promise<ApiResponse<any>> {
    return this.request('post', `/api/activity-invitations/${invitationUuid}/mark-status-viewed`);
  }

  async getActivityParticipants(activityUuid: string): Promise<ApiResponse<any>> {
    return this.request('get', `/api/activities/${activityUuid}/participants`);
  }

  async getBatchActivityParticipants(activityUuids: string[]): Promise<ApiResponse<any>> {
    return this.request('post', '/api/activities/batch/participants', { activityUuids });
  }

  async createPendingInvitations(activityUuid: string, pendingConnections: string[]): Promise<ApiResponse<any>> {
    return this.request('post', `/api/activities/${activityUuid}/pending-invitations`, { 
      pending_connections: pendingConnections 
    });
  }

  // Activity Templates
  async getActivityTemplates(): Promise<ApiResponse<any[]>> {
    return this.request('get', '/api/activity-templates');
  }

  async getActivityTypes(): Promise<ApiResponse<any[]>> {
    return this.request('get', '/api/activity-types');
  }

  async createActivityTemplate(templateData: any): Promise<ApiResponse<any>> {
    return this.request('post', '/api/activity-templates', templateData);
  }

  async updateActivityTemplate(templateUuid: string, templateData: any): Promise<ApiResponse<any>> {
    return this.request('put', `/api/activity-templates/${templateUuid}`, templateData);
  }

  async deleteActivityTemplate(templateUuid: string): Promise<ApiResponse<any>> {
    return this.request('delete', `/api/activity-templates/${templateUuid}`);
  }

  async useActivityTemplate(templateUuid: string): Promise<ApiResponse<any>> {
    return this.request('post', `/api/activity-templates/${templateUuid}/use`);
  }
}

export default ApiService;