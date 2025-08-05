import React, { useState, useEffect } from 'react';
import ApiService from '../services/api';
import './NotificationBell.css';

interface Notification {
  id: string;
  type: 'connection_request' | 'activity_reminder' | 'system';
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

const NotificationBell: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [connectionRequests, setConnectionRequests] = useState<ConnectionRequest[]>([]);
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
      // Load connection requests
      const requestsResponse = await apiService.getConnectionRequests();
      if (requestsResponse.success && requestsResponse.data) {
        setConnectionRequests(requestsResponse.data);
        
        // Convert connection requests to notifications
        const requestNotifications: Notification[] = requestsResponse.data.map((request: ConnectionRequest) => ({
          id: `connection_${request.id}`,
          type: 'connection_request' as const,
          title: 'New Connection Request',
          message: `${request.requester_name} wants to connect${request.child_name ? ` with ${request.child_name}` : ''}`,
          timestamp: request.created_at,
          read: false,
          data: request
        }));

        // Add upcoming activity reminders (mock for now - would come from backend)
        const activityReminders: Notification[] = [
          {
            id: 'activity_reminder_1',
            type: 'activity_reminder',
            title: 'Activity Reminder',
            message: 'Soccer practice starts in 2 hours',
            timestamp: new Date().toISOString(),
            read: false
          }
        ];

        setNotifications([...requestNotifications, ...activityReminders]);
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (notification.type === 'connection_request' && notification.data) {
      // Handle connection request - could open a modal or navigate
      console.log('Connection request clicked:', notification.data);
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

                  {notification.type === 'connection_request' && notification.data && (
                    <div className="notification-actions">
                      <button 
                        className="accept-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAcceptConnection(notification.data.id);
                        }}
                        disabled={loading}
                      >
                        Accept
                      </button>
                      <button 
                        className="reject-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRejectConnection(notification.data.id);
                        }}
                        disabled={loading}
                      >
                        Decline
                      </button>
                    </div>
                  )}
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