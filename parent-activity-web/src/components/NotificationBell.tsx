import React, { useState, useEffect } from 'react';
import ApiService from '../services/api';
import './NotificationBell.css';

interface Notification {
  id: string;
  type: 'connection_request' | 'activity_invitation' | 'activity_reminder' | 'system';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  data?: any;
}

interface ConnectionRequest {
  id: number;
  requester_name: string;
  requester_email: string;
  child_name?: string;
  target_child_name?: string;
  message?: string;
  created_at: string;
}

interface ActivityInvitation {
  id: number;
  activity_id: number;
  activity_name: string;
  activity_description?: string;
  start_date: string;
  end_date?: string;
  start_time?: string;
  end_time?: string;
  location?: string;
  status: 'pending' | 'accepted' | 'declined';
  host_child_name?: string;
  host_family_name?: string;
  host_parent_name?: string;
  host_parent_email?: string;
  invited_child_id?: number;
  invited_child_name?: string;
  message?: string;
  created_at: string;
}

const NotificationBell: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [connectionRequests, setConnectionRequests] = useState<ConnectionRequest[]>([]);
  const [activityInvitations, setActivityInvitations] = useState<ActivityInvitation[]>([]);
  const [loading, setLoading] = useState(false);
  const apiService = ApiService.getInstance();

  useEffect(() => {
    console.log('🔔 NotificationBell - Component mounted, loading initial notifications');
    loadNotifications();
    // Set up periodic refresh every 30 seconds
    const interval = setInterval(() => {
      console.log('🔔 NotificationBell - Periodic refresh (30s interval)');
      loadNotifications();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadNotifications = async () => {
    console.log('🔔 NotificationBell - loadNotifications called');
    try {
      let allNotifications: Notification[] = [];
      console.log('🔔 NotificationBell - Starting notification loading process');

      // Load parent's children first to filter invitations
      const childrenResponse = await apiService.getChildren();
      const parentChildren = childrenResponse.success && childrenResponse.data 
        ? (Array.isArray(childrenResponse.data) 
           ? childrenResponse.data 
           : (childrenResponse.data as any)?.data || []
          )
        : [];
      const parentChildIds = parentChildren.map((child: any) => child.id);
      
      // Load connection requests
      const requestsResponse = await apiService.getConnectionRequests();
      if (requestsResponse.success && requestsResponse.data) {
        setConnectionRequests(requestsResponse.data);
        
        // Create summary notification for all connection requests
        if (requestsResponse.data.length > 0) {
          allNotifications.push({
            id: 'connection_requests_summary',
            type: 'connection_request' as const,
            title: 'Connection Requests',
            message: `${requestsResponse.data.length} new connection request${requestsResponse.data.length !== 1 ? 's' : ''}`,
            timestamp: requestsResponse.data[0].created_at,
            read: false,
            data: requestsResponse.data
          });
        }
      }

      // Load activity invitations using same endpoint as ChildrenScreen with date range
      const today = new Date();
      const oneYearLater = new Date();
      oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
      const startDate = today.toISOString().split('T')[0];
      const endDate = oneYearLater.toISOString().split('T')[0];
      
      console.log('🔔 NotificationBell - Loading invitations with date range:', startDate, 'to', endDate);
      const invitationsResponse = await apiService.getAllInvitations(startDate, endDate);
      console.log('🔔 NotificationBell - Invitations response:', invitationsResponse);
      
      // Debug series_id in NotificationBell data
      if (invitationsResponse.success && invitationsResponse.data && invitationsResponse.data.length > 0) {
        console.log(`🔔 NotificationBell - Found ${invitationsResponse.data.length} invitations`);
        const rec12Invitations = invitationsResponse.data.filter((inv: any) => inv.activity_name?.includes('rec12'));
        if (rec12Invitations.length > 0) {
          console.log(`🔔 NotificationBell - rec12 invitations found:`, rec12Invitations.map((inv: any) => 
            `"${inv.activity_name}" series_id="${inv.series_id}"`
          ));
        }
      }
      
      if (invitationsResponse.success && invitationsResponse.data) {
        // Filter to only pending invitations for this parent's children
        console.log('🔔 NotificationBell - Parent child IDs:', parentChildIds);
        console.log('🔔 NotificationBell - All invitations:', invitationsResponse.data);
        
        const pendingInvitations = invitationsResponse.data.filter((inv: ActivityInvitation) => {
          const isPending = inv.status === 'pending';
          const hasChildId = inv.invited_child_id !== null;
          const isForMyChild = parentChildIds.includes(inv.invited_child_id);
          
          console.log(`🔔 Filtering invitation "${inv.activity_name}":`, {
            status: inv.status,
            isPending,
            invited_child_id: inv.invited_child_id,
            hasChildId,
            isForMyChild,
            shouldInclude: isPending && hasChildId && isForMyChild
          });
          
          return isPending && hasChildId && isForMyChild;
        });
        
        console.log('🔔 NotificationBell - Filtered pending invitations:', pendingInvitations);
        
        setActivityInvitations(pendingInvitations);
        
        // Group recurring invitations by activity name
        const groupedInvitations = new Map<string, ActivityInvitation[]>();
        const singleInvitations: ActivityInvitation[] = [];
        
        pendingInvitations.forEach(invitation => {
          const seriesId = (invitation as any).series_id;
          const activityName = invitation.activity_name;
          
          if (seriesId) {
            // Use series_id for proper grouping
            const existingGroup = groupedInvitations.get(seriesId);
            
            if (existingGroup) {
              existingGroup.push(invitation);
            } else {
              // Check if there are other invitations with the same series_id
              const seriesInvitations = pendingInvitations.filter(inv => (inv as any).series_id === seriesId);
              
              if (seriesInvitations.length > 1) {
                // This is a recurring series
                groupedInvitations.set(seriesId, seriesInvitations);
              } else {
                // Single activity in series
                singleInvitations.push(invitation);
              }
            }
          } else {
            // Fallback to name-based grouping if no series_id
            const existingGroup = groupedInvitations.get(activityName);
            
            if (existingGroup) {
              existingGroup.push(invitation);
            } else {
              const sameNameInvitations = pendingInvitations.filter(inv => inv.activity_name === activityName);
              
              if (sameNameInvitations.length > 1) {
                groupedInvitations.set(activityName, sameNameInvitations);
              } else {
                if (!groupedInvitations.has(activityName)) {
                  singleInvitations.push(invitation);
                }
              }
            }
          }
        });
        
        // Create notifications for recurring activity groups
        groupedInvitations.forEach((invitations, activityName) => {
          // Get the day of the week from the first invitation
          const firstInvitation = invitations[0];
          const startDate = new Date(firstInvitation.start_date);
          const dayOfWeek = startDate.toLocaleDateString('en-US', { weekday: 'long' });
          
          allNotifications.push({
            id: `recurring_activity_${activityName.replace(/\s+/g, '_')}`,
            type: 'activity_invitation' as const,
            title: 'Recurring Activity Invitation',
            message: `"${activityName}" recurring every ${dayOfWeek} (${invitations.length} activities) from ${firstInvitation.host_child_name || firstInvitation.host_family_name || 'Unknown Host'}`,
            timestamp: firstInvitation.created_at,
            read: false,
            data: { 
              type: 'recurring_series',
              activityName,
              dayOfWeek,
              count: invitations.length,
              invitations 
            }
          });
        });
        
        // Create summary notification for single activity invitations
        if (singleInvitations.length > 0) {
          allNotifications.push({
            id: 'single_activity_invitations_summary',
            type: 'activity_invitation' as const,
            title: 'Activity Invitations',
            message: `${singleInvitations.length} new activity invitation${singleInvitations.length !== 1 ? 's' : ''}`,
            timestamp: singleInvitations[0].created_at,
            read: false,
            data: { 
              type: 'single_activities',
              invitations: singleInvitations 
            }
          });
        }
      }

      // Load hosted activity notifications (activities where our children are hosts and guests have responded)
      const todayForActivities = new Date();
      const oneYearLaterForActivities = new Date();
      oneYearLaterForActivities.setFullYear(oneYearLaterForActivities.getFullYear() + 1);
      const startDateForActivities = todayForActivities.toISOString().split('T')[0];
      const endDateForActivities = oneYearLaterForActivities.toISOString().split('T')[0];
      
      const calendarActivitiesResponse = await apiService.getCalendarActivities(startDateForActivities, endDateForActivities);
      if (calendarActivitiesResponse.success && calendarActivitiesResponse.data) {
        const allActivities = Array.isArray(calendarActivitiesResponse.data) ? calendarActivitiesResponse.data : [];
        
        // Count different types of activity responses where our children are hosts
        let totalAcceptances = 0;
        let totalDeclines = 0;
        let totalResponses = 0;
        
        for (const activity of allActivities) {
          const hostChild = parentChildren.find((child: any) => child.uuid === activity.child_uuid);
          const hasUnviewedResponses = parseInt(activity.unviewed_status_changes || '0') > 0;
          
          if (hostChild && hasUnviewedResponses) {
            const responseCount = parseInt(activity.unviewed_status_changes || '0');
            totalResponses += responseCount;
            
            // Try to categorize by status types if available
            if (activity.unviewed_statuses) {
              const statuses = activity.unviewed_statuses.split(',');
              statuses.forEach((status: string) => {
                if (status.trim() === 'accepted') {
                  totalAcceptances++;
                } else if (status.trim() === 'rejected' || status.trim() === 'declined') {
                  totalDeclines++;
                }
              });
            }
          }
        }
        
        // Create summary notifications for activity responses
        if (totalAcceptances > 0) {
          allNotifications.push({
            id: 'activity_acceptances_summary',
            type: 'activity_invitation' as const,
            title: 'Activity Acceptances',
            message: `${totalAcceptances} activity invitation${totalAcceptances !== 1 ? 's' : ''} accepted`,
            timestamp: new Date().toISOString(),
            read: false,
            data: { type: 'acceptances', count: totalAcceptances }
          });
        }
        
        if (totalDeclines > 0) {
          allNotifications.push({
            id: 'activity_declines_summary',
            type: 'activity_invitation' as const,
            title: 'Activity Declines',
            message: `${totalDeclines} activity invitation${totalDeclines !== 1 ? 's' : ''} declined`,
            timestamp: new Date().toISOString(),
            read: false,
            data: { type: 'declines', count: totalDeclines }
          });
        }
      }

      setNotifications(allNotifications);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (notification.type === 'connection_request' && notification.data) {
      // Handle connection request summary - could open a modal showing all requests
      console.log('Connection requests summary clicked:', notification.data);
    } else if (notification.type === 'activity_invitation' && notification.data) {
      // Handle activity invitation summary - could open a modal showing all invitations
      console.log('Activity invitations summary clicked:', notification.data);
    }
    
    // Mark as read
    setNotifications(prev => 
      prev.map(n => n.id === notification.id ? { ...n, read: true } : n)
    );
  };

  const handleAcceptConnection = async (requestUuid: string) => {
    try {
      setLoading(true);
      const response = await apiService.respondToConnectionRequest(requestUuid, 'accept');
      if (response.success) {
        // Remove from notifications
        setNotifications(prev => prev.filter(n => n.id !== `connection_${requestUuid}`));
        alert('Connection request accepted!');
      } else {
        alert(`Error: ${response.error}`);
      }
    } catch (error) {
      alert('Failed to respond to connection request');
    } finally {
      setLoading(false);
    }
  };

  const handleRejectConnection = async (requestUuid: string) => {
    try {
      setLoading(true);
      const response = await apiService.respondToConnectionRequest(requestUuid, 'reject');
      if (response.success) {
        // Remove from notifications
        setNotifications(prev => prev.filter(n => n.id !== `connection_${requestUuid}`));
        alert('Connection request declined');
      } else {
        alert(`Error: ${response.error}`);
      }
    } catch (error) {
      alert('Failed to respond to connection request');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvitation = async (invitationUuid: string) => {
    try {
      setLoading(true);
      const response = await apiService.respondToActivityInvitation(invitationUuid, 'accept');
      if (response.success) {
        // Remove from notifications
        setNotifications(prev => prev.filter(n => n.id !== `invitation_${invitationUuid}`));
        alert('Activity invitation accepted! It will now appear in your calendar.');
      } else {
        alert(`Error: ${response.error}`);
      }
    } catch (error) {
      alert('Failed to respond to activity invitation');
    } finally {
      setLoading(false);
    }
  };

  const handleRejectInvitation = async (invitationUuid: string) => {
    try {
      setLoading(true);
      const response = await apiService.respondToActivityInvitation(invitationUuid, 'reject');
      if (response.success) {
        // Remove from notifications
        setNotifications(prev => prev.filter(n => n.id !== `invitation_${invitationUuid}`));
        alert('Activity invitation declined');
      } else {
        alert(`Error: ${response.error}`);
      }
    } catch (error) {
      alert('Failed to respond to activity invitation');
    } finally {
      setLoading(false);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="notification-bell">
      <button 
        className="bell-button"
        onClick={() => {
          console.log('🔔 NotificationBell - Bell clicked, toggling dropdown');
          setShowDropdown(!showDropdown);
          // Refresh notifications when opening dropdown
          if (!showDropdown) {
            console.log('🔔 NotificationBell - Refreshing notifications on dropdown open');
            loadNotifications();
          }
        }}
      >
        🔔
        {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
      </button>

      {showDropdown && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <h3>Notifications</h3>
            <button 
              className="close-btn"
              onClick={() => setShowDropdown(false)}
            >
              ×
            </button>
          </div>

          <div className="notifications-list">
            {notifications.length === 0 ? (
              <div className="no-notifications">
                <p>No new notifications</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div 
                  key={notification.id}
                  className={`notification-item ${notification.read ? 'read' : 'unread'}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="notification-content">
                    <div className="notification-title">{notification.title}</div>
                    <div className="notification-message">{notification.message}</div>
                    <div className="notification-time">
                      {formatTimestamp(notification.timestamp)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;