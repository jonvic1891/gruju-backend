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
      console.log('🔔 NotificationBell - Loading notifications from server (pre-filtered)');
      
      // Use the new server-side endpoint that constructs and filters notifications
      const notificationsResponse = await apiService.getBellNotifications();
      
      if (notificationsResponse.success && notificationsResponse.data) {
        console.log(`🔔 Loaded ${notificationsResponse.data.length} notifications from server`);
        setNotifications(notificationsResponse.data);
      } else {
        console.error('Failed to load notifications:', notificationsResponse.error);
        setNotifications([]);
      }
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

  const handleDismissNotification = async (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation(); // Prevent triggering the notification click
    console.log('🗑️ Dismissing notification:', notificationId);
    
    try {
      // Find the notification to get its type
      const notification = notifications.find(n => n.id === notificationId);
      const notificationType = notification?.type || 'unknown';
      
      // Call API to persist dismissal
      const response = await apiService.dismissNotification(notificationId, notificationType);
      
      if (response.success) {
        // Remove the notification from the current list
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
        console.log('✅ Notification dismissed successfully:', notificationId);
      } else {
        console.error('❌ Failed to dismiss notification:', response.error);
        alert('Failed to dismiss notification. Please try again.');
      }
    } catch (error) {
      console.error('❌ Error dismissing notification:', error);
      alert('Failed to dismiss notification. Please try again.');
    }
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
                  <button 
                    className="notification-dismiss-btn"
                    onClick={(e) => handleDismissNotification(e, notification.id)}
                    title="Dismiss notification"
                  >
                    ×
                  </button>
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