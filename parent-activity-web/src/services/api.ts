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
  private invitationCache: Map<string, { data: any, timestamp: number }> = new Map();
  private cacheTimeoutMs = 30000; // 30 seconds cache
  private masterInvitationData: { data: any, timestamp: number, dateRange: { start: string, end: string } } | null = null;
  private masterInvitationPromise: Promise<any> | null = null;
  private childrenCache: { data: any, timestamp: number } | null = null;
  private childrenPromise: Promise<any> | null = null;

  private constructor() {
    this.token = localStorage.getItem('authToken');
  }

  public static getInstance(): ApiService {
    if (!ApiService.instance) {
      ApiService.instance = new ApiService();
    }
    return ApiService.instance;
  }

  public setToken(token: string): void {
    this.token = token;
  }

  private getAuthHeaders() {
    return this.token ? { Authorization: `Bearer ${this.token}` } : {};
  }

  // Get a master date range that covers all component needs
  private getMasterDateRange(): { start: string, end: string } {
    const today = new Date();
    // Start from beginning of current week to cover ChildrenScreen's current week view
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
    
    // End 1 year from now to cover NotificationBell and ChildActivityScreen's 1-year view
    const oneYearLater = new Date(today);
    oneYearLater.setFullYear(today.getFullYear() + 1);
    
    return {
      start: startOfWeek.toISOString().split('T')[0],
      end: oneYearLater.toISOString().split('T')[0]
    };
  }

  // Check if requested date range is covered by master data
  private isDateRangeCovered(requestedStart: string, requestedEnd: string, masterStart: string, masterEnd: string): boolean {
    return requestedStart >= masterStart && requestedEnd <= masterEnd;
  }

  // Filter master data to requested date range
  private filterInvitationsByDateRange(invitations: any[], startDate: string, endDate: string): any[] {
    if (!invitations) return [];
    
    return invitations.filter(invitation => {
      const activityStartDate = invitation.start_date?.split('T')[0] || '';
      const activityEndDate = invitation.end_date?.split('T')[0] || activityStartDate;
      
      // Activity overlaps with requested range if:
      // Activity start <= requested end AND activity end >= requested start
      return activityStartDate <= endDate && activityEndDate >= startDate;
    });
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
    // Don't automatically set token/localStorage - let AuthContext handle it
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
  async getProfile(): Promise<ApiResponse<any>> {
    return await this.request('get', '/api/users/profile');
  }

  async updateProfile(profileData: { username: string; email: string; phone: string; address_line_1?: string; town_city?: string; state_province_country?: string; post_code?: string; onboarding_completed?: boolean }): Promise<ApiResponse<any>> {
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

  // Children - with promise deduplication and caching
  async getChildren(): Promise<ApiResponse<any[]>> {
    // Check if we have valid cached data
    if (this.childrenCache && (Date.now() - this.childrenCache.timestamp) < this.cacheTimeoutMs) {
      console.log('📦 Using cached children data');
      return { success: true, data: this.childrenCache.data };
    }

    // If there's already a request in flight, return the same promise
    if (this.childrenPromise) {
      console.log('⏳ Children request already in flight, waiting for existing promise...');
      try {
        const result = await this.childrenPromise;
        return result;
      } catch (error) {
        // If the existing promise failed, clear it and try again
        this.childrenPromise = null;
      }
    }

    // Create new promise for the API request
    console.log('🔄 Loading children data...');
    this.childrenPromise = this.fetchChildren();

    try {
      const result = await this.childrenPromise;
      return result;
    } finally {
      // Clear the promise when done (success or failure)
      this.childrenPromise = null;
    }
  }

  // Separate method for the actual children API call
  private async fetchChildren(): Promise<ApiResponse<any[]>> {
    // Add cache-busting parameter to force fresh request
    const timestamp = Date.now();
    const response = await this.request<any[]>('get', `/api/children?_t=${timestamp}`);
    
    if (response.success && response.data) {
      // Cache successful responses
      this.childrenCache = {
        data: response.data,
        timestamp: Date.now()
      };
      console.log('✅ Children data loaded and cached:', Array.isArray(response.data) ? response.data.length : 'unknown count', 'children');
    }
    
    return response;
  }

  async createChild(childData: { first_name: string; last_name?: string; name?: string }): Promise<ApiResponse<any>> {
    const response = await this.request('post', '/api/children', childData);
    // Clear children cache when data changes
    if (response.success) {
      this.childrenCache = null;
      this.childrenPromise = null;
    }
    return response;
  }

  async deleteChild(childUuid: string): Promise<ApiResponse<any>> {
    const response = await this.request('delete', `/api/children/${childUuid}`);
    // Clear children cache when data changes
    if (response.success) {
      this.childrenCache = null;
      this.childrenPromise = null;
    }
    return response;
  }

  async updateChild(childUuid: string, childData: any): Promise<ApiResponse<any>> {
    const response = await this.request('put', `/api/children/${childUuid}`, childData);
    // Clear children cache when data changes
    if (response.success) {
      this.childrenCache = null;
      this.childrenPromise = null;
    }
    return response;
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

  // Master invitation data loader - loads once with wide date range to serve all components
  // Uses promise deduplication to prevent simultaneous requests
  private async loadMasterInvitationData(): Promise<{ calendar_invitations: any[], pending_invitations: any[], stats: any } | null> {
    const masterRange = this.getMasterDateRange();
    
    // Check if we have valid master data that covers the full range
    if (this.masterInvitationData && 
        (Date.now() - this.masterInvitationData.timestamp) < this.cacheTimeoutMs &&
        this.masterInvitationData.dateRange.start <= masterRange.start &&
        this.masterInvitationData.dateRange.end >= masterRange.end) {
      console.log('📦 Using cached master invitation data', this.masterInvitationData.dateRange);
      return this.masterInvitationData.data;
    }
    
    // If there's already a request in flight, return the same promise
    if (this.masterInvitationPromise) {
      console.log('⏳ Request already in flight, waiting for existing promise...');
      try {
        const result = await this.masterInvitationPromise;
        return result;
      } catch (error) {
        // If the existing promise failed, clear it and try again
        this.masterInvitationPromise = null;
      }
    }
    
    // Create new promise for the API request
    console.log('🔄 Loading master invitation data for range:', masterRange);
    this.masterInvitationPromise = this.fetchMasterInvitationData(masterRange);
    
    try {
      const result = await this.masterInvitationPromise;
      return result;
    } finally {
      // Clear the promise when done (success or failure)
      this.masterInvitationPromise = null;
    }
  }

  // Separate method for the actual API call
  private async fetchMasterInvitationData(masterRange: { start: string, end: string }): Promise<{ calendar_invitations: any[], pending_invitations: any[], stats: any } | null> {
    const response = await this.request<{
      calendar_invitations: any[],
      pending_invitations: any[],
      stats: any
    }>('get', `/api/invitations/batch?start=${masterRange.start}&end=${masterRange.end}`);
    
    if (response.success && response.data) {
      this.masterInvitationData = {
        data: response.data,
        timestamp: Date.now(),
        dateRange: masterRange
      };
      console.log('✅ Master invitation data loaded:', {
        calendar_invitations: response.data.calendar_invitations?.length || 0,
        pending_invitations: response.data.pending_invitations?.length || 0,
        dateRange: masterRange
      });
      return response.data;
    }
    
    return null;
  }

  // Unified batch method to get all invitation data with intelligent caching
  async getBatchInvitations(startDate: string, endDate: string): Promise<ApiResponse<{
    calendar_invitations: any[],
    pending_invitations: any[],
    stats: any
  }>> {
    try {
      const masterData = await this.loadMasterInvitationData();
      
      if (!masterData) {
        return { success: false, error: 'Failed to load invitation data' };
      }
      
      // Filter master data to requested date range
      const filteredCalendarInvitations = this.filterInvitationsByDateRange(
        masterData.calendar_invitations, startDate, endDate
      );
      
      // Pending invitations don't need date filtering as they're status-based
      const filteredData = {
        calendar_invitations: filteredCalendarInvitations,
        pending_invitations: masterData.pending_invitations, // Always return all pending
        stats: {
          total_calendar: filteredCalendarInvitations.length,
          total_pending: masterData.pending_invitations?.length || 0,
          by_status: {} as Record<string, number>
        }
      };
      
      // Recalculate stats for filtered data
      filteredCalendarInvitations.forEach(invitation => {
        const status = invitation.status || 'unknown';
        filteredData.stats.by_status[status] = (filteredData.stats.by_status[status] || 0) + 1;
      });
      
      console.log(`📊 Returning filtered invitations for ${startDate} to ${endDate}:`, {
        calendar: filteredData.stats.total_calendar,
        pending: filteredData.stats.total_pending,
        original_calendar: masterData.calendar_invitations?.length || 0
      });
      
      return { success: true, data: filteredData };
      
    } catch (error) {
      console.error('❌ Error in getBatchInvitations:', error);
      return { success: false, error: 'Failed to get batch invitations' };
    }
  }

  // Legacy method - kept for backward compatibility but now uses batch endpoint
  async getAllInvitations(startDate: string, endDate: string): Promise<ApiResponse<any[]>> {
    const batchResponse = await this.getBatchInvitations(startDate, endDate);
    if (!batchResponse.success) {
      return batchResponse as any;
    }
    
    // Return just the calendar invitations for backward compatibility
    return {
      success: true,
      data: batchResponse.data?.calendar_invitations || []
    };
  }

  // Clear all caches (call when data changes)
  clearAllCaches(): void {
    console.log('🧹 Clearing all caches, master data, and pending promises');
    this.invitationCache.clear();
    this.masterInvitationData = null;
    this.masterInvitationPromise = null;
    this.childrenCache = null;
    this.childrenPromise = null;
  }

  // Legacy method for backward compatibility
  clearInvitationCache(): void {
    this.clearAllCaches();
  }

  // Helper methods to filter invitations by status
  async getInvitedActivities(startDate: string, endDate: string): Promise<ApiResponse<any[]>> {
    const batchResponse = await this.getBatchInvitations(startDate, endDate);
    if (!batchResponse.success) {
      return batchResponse as any;
    }
    
    // Filter accepted invitations from calendar invitations
    const acceptedInvitations = batchResponse.data?.calendar_invitations?.filter(invitation => invitation.status === 'accepted') || [];
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
    const batchResponse = await this.getBatchInvitations(startDate, endDate);
    if (!batchResponse.success) {
      return batchResponse as any;
    }
    
    // Return pending invitations from batch data
    return {
      success: true,
      data: batchResponse.data?.pending_invitations || []
    };
  }

  async getDeclinedInvitationsForCalendar(startDate: string, endDate: string): Promise<ApiResponse<any[]>> {
    const batchResponse = await this.getBatchInvitations(startDate, endDate);
    if (!batchResponse.success) {
      return batchResponse as any;
    }
    
    // Filter rejected invitations from calendar invitations
    const rejectedInvitations = batchResponse.data?.calendar_invitations?.filter(invitation => invitation.status === 'rejected') || [];
    return {
      success: true,
      data: rejectedInvitations
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

  // Club usage increment
  async incrementClubUsage(data: {
    website_url: string;
    activity_type: string;
    location?: string;
    child_age?: number;
    activity_start_date?: string;
    activity_id?: number;
  }): Promise<ApiResponse<any>> {
    return this.request('post', '/api/clubs/increment-usage', data);
  }

  // Notification dismissal
  async dismissNotification(notificationId: string, type?: string): Promise<ApiResponse<any>> {
    return this.request('post', '/api/notifications/dismiss', { notificationId, type });
  }

  async getDismissedNotifications(): Promise<ApiResponse<string[]>> {
    return this.request('get', '/api/notifications/dismissed');
  }

  async getBellNotifications(): Promise<ApiResponse<any[]>> {
    return this.request('get', '/api/notifications/bell');
  }

  // Clubs API
  async getClubs(activityType?: string, search?: string, location?: string): Promise<ApiResponse<any[]>> {
    const params = new URLSearchParams();
    if (activityType) {
      params.append('activity_type', activityType);
    }
    if (search?.trim()) {
      params.append('search', search.trim());
    }
    if (location?.trim()) {
      params.append('location', location.trim());
    }
    
    const queryString = params.toString();
    const url = `/api/clubs${queryString ? `?${queryString}` : ''}`;
    
    return this.request('get', url);
  }
}

export default ApiService;