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
    loadNotifications();
    // Set up periodic refresh every 30 seconds
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadNotifications = async () => {
    try {
      let allNotifications: Notification[] = [];

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
        
        // Create summary for connection requests
        if (requestsResponse.data.length > 0) {
          allNotifications.push({
            id: 'connection_requests_summary',
            type: 'connection_request' as const,
            title: 'Connection Requests',
            message: `You have ${requestsResponse.data.length} new connection request${requestsResponse.data.length !== 1 ? 's' : ''}`,
            timestamp: requestsResponse.data[0].created_at,
            read: false,
            data: requestsResponse.data
          });
        }
      }

      // Load activity invitations
      const invitationsResponse = await apiService.getActivityInvitations();
      if (invitationsResponse.success && invitationsResponse.data) {
        // Filter to only pending invitations for this parent's children
        const pendingInvitations = invitationsResponse.data.filter((inv: ActivityInvitation) => 
          inv.status === 'pending' && 
          inv.invited_child_id !== null && 
          parentChildIds.includes(inv.invited_child_id)
        );
        
        setActivityInvitations(pendingInvitations);
        
        // Create summary notifications instead of individual ones
        if (pendingInvitations.length > 0) {
          allNotifications.push({
            id: 'activity_invitations_summary',
            type: 'activity_invitation' as const,
            title: 'Activity Invitations',
            message: `You have ${pendingInvitations.length} new activity invitation${pendingInvitations.length !== 1 ? 's' : ''}`,
            timestamp: pendingInvitations[0].created_at,
            read: false,
            data: pendingInvitations
          });
        }
      }

      // Load hosted activity notifications (activities where our children are hosts and guests have responded)
      const today = new Date();
      const oneYearLater = new Date();
      oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
      const startDate = today.toISOString().split('T')[0];
      const endDate = oneYearLater.toISOString().split('T')[0];
      
      const calendarActivitiesResponse = await apiService.getCalendarActivities(startDate, endDate);
      if (calendarActivitiesResponse.success && calendarActivitiesResponse.data) {
        const allActivities = Array.isArray(calendarActivitiesResponse.data) ? calendarActivitiesResponse.data : [];
        
        // Count activities with unviewed responses where our children are hosts
        let totalHostedNotifications = 0;
        for (const activity of allActivities) {
          const hostChild = parentChildren.find((child: any) => child.uuid === activity.child_uuid);
          const hasUnviewedResponses = parseInt(activity.unviewed_status_changes || '0') > 0;
          
          if (hostChild && hasUnviewedResponses) {
            totalHostedNotifications += parseInt(activity.unviewed_status_changes || '0');
          }
        }
        
        // Add hosted activity notification summary if there are any
        if (totalHostedNotifications > 0) {
          allNotifications.push({
            id: 'hosted_activity_responses_summary',
            type: 'activity_invitation' as const,
            title: 'Activity Responses',
            message: `You have ${totalHostedNotifications} new response${totalHostedNotifications !== 1 ? 's' : ''} to your activities`,
            timestamp: new Date().toISOString(),
            read: false,
            data: { count: totalHostedNotifications }
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

  const handleAcceptConnection = async (requestId: number) => {
    try {
      setLoading(true);
      const response = await apiService.respondToConnectionRequest(requestId, 'accept');
      if (response.success) {
        // Remove from notifications
        setNotifications(prev => prev.filter(n => n.id !== `connection_${requestId}`));
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

  const handleRejectConnection = async (requestId: number) => {
    try {
      setLoading(true);
      const response = await apiService.respondToConnectionRequest(requestId, 'reject');
      if (response.success) {
        // Remove from notifications
        setNotifications(prev => prev.filter(n => n.id !== `connection_${requestId}`));
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
        onClick={() => setShowDropdown(!showDropdown)}
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