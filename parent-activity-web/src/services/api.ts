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

  async logout(): Promise<void> {
    this.token = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
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

  async createChild(childData: { name: string }): Promise<ApiResponse<any>> {
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
    return this.request('get', '/api/connections/requests');
  }

  async getSentConnectionRequests(): Promise<ApiResponse<any[]>> {
    return this.request('get', '/api/connections/sent-requests');
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