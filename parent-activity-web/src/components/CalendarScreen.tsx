import React, { useState, useEffect } from 'react';
import ApiService from '../services/api';
import { Activity, Child } from '../types';
import { useAuth } from '../contexts/AuthContext';
import './CalendarScreen.css';

const CalendarScreen = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedActivities, setSelectedActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showAddModal, setShowAddModal] = useState(false);
  const [children, setChildren] = useState<Child[]>([]);
  const [connectionRequests, setConnectionRequests] = useState<any[]>([]);
  const [connectedActivities, setConnectedActivities] = useState<Activity[]>([]);
  const [invitedActivities, setInvitedActivities] = useState<Activity[]>([]);
  const [includeConnected, setIncludeConnected] = useState(false);
  const [includeInvited, setIncludeInvited] = useState(true);
  const { user } = useAuth();
  const apiService = ApiService.getInstance();

  useEffect(() => {
    loadActivities();
    loadChildren();
    loadConnectionRequests();
    if (includeConnected) {
      loadConnectedActivities();
    }
    if (includeInvited) {
      loadInvitedActivities();
    }
  }, [currentMonth, includeConnected, includeInvited]);

  useEffect(() => {
    if (selectedDate) {
      const ownActivities = activities.filter(activity => 
        activity.start_date === selectedDate || 
        (activity.start_date <= selectedDate && (activity.end_date || activity.start_date) >= selectedDate)
      );

      const connectedActivitiesForDay = includeConnected ? connectedActivities.filter(activity => 
        activity.start_date === selectedDate || 
        (activity.start_date <= selectedDate && (activity.end_date || activity.start_date) >= selectedDate)
      ) : [];

      const invitedActivitiesForDay = includeInvited ? invitedActivities.filter(activity => 
        activity.start_date === selectedDate || 
        (activity.start_date <= selectedDate && (activity.end_date || activity.start_date) >= selectedDate)
      ) : [];

      setSelectedActivities([...ownActivities, ...connectedActivitiesForDay, ...invitedActivitiesForDay]);
    }
  }, [selectedDate, activities, connectedActivities, invitedActivities, includeConnected, includeInvited]);

  const loadActivities = async () => {
    try {
      setLoading(true);
      
      const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
      
      const startDate = startOfMonth.toISOString().split('T')[0];
      const endDate = endOfMonth.toISOString().split('T')[0];
      
      const response = await apiService.getCalendarActivities(startDate, endDate);
      
      if (response.success && response.data) {
        setActivities(response.data);
      } else {
        alert(`Error: ${response.error || 'Failed to load activities'}`);
      }
    } catch (error) {
      alert('Failed to load activities');
      console.error('Load activities error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadChildren = async () => {
    try {
      const response = await apiService.getChildren();
      if (response.success && response.data) {
        setChildren(response.data);
      }
    } catch (error) {
      console.error('Load children error:', error);
    }
  };

  const loadConnectionRequests = async () => {
    try {
      const response = await apiService.getConnectionRequests();
      if (response.success && response.data) {
        setConnectionRequests(response.data);
      }
    } catch (error) {
      console.error('Load connection requests error:', error);
    }
  };

  const loadConnectedActivities = async () => {
    try {
      const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
      
      const startDate = startOfMonth.toISOString().split('T')[0];
      const endDate = endOfMonth.toISOString().split('T')[0];
      
      const response = await apiService.getConnectedActivities(startDate, endDate);
      if (response.success && response.data) {
        setConnectedActivities(response.data);
      } else {
        setConnectedActivities([]);
      }
    } catch (error) {
      console.error('Load connected activities error:', error);
      setConnectedActivities([]);
    }
  };

  const loadInvitedActivities = async () => {
    try {
      const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
      
      const startDate = startOfMonth.toISOString().split('T')[0];
      const endDate = endOfMonth.toISOString().split('T')[0];
      
      const response = await apiService.getInvitedActivities(startDate, endDate);
      if (response.success && response.data) {
        setInvitedActivities(response.data);
      } else {
        setInvitedActivities([]);
      }
    } catch (error) {
      console.error('Load invited activities error:', error);
      setInvitedActivities([]);
    }
  };

  const getNotificationIcon = (status: string, isIncoming: boolean) => {
    if (status === 'pending') {
      return isIncoming ? '📩' : '📤'; // Incoming invite vs Outgoing invite
    }
    if (status === 'accepted') {
      return '✅'; // Accepted invite
    }
    if (status === 'rejected') {
      return '❌'; // Rejected invite
    }
    return '🔔'; // General notification
  };

  const getNotificationColor = (status: string, isIncoming: boolean) => {
    if (status === 'pending') {
      return isIncoming ? '#FF9800' : '#2196F3'; // Orange for incoming, Blue for outgoing
    }
    if (status === 'accepted') {
      return '#4CAF50'; // Green for accepted
    }
    if (status === 'rejected') {
      return '#F44336'; // Red for rejected
    }
    return '#9E9E9E'; // Gray for other
  };

  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    const current = new Date(startDate);
    
    for (let i = 0; i < 42; i++) {
      const dateString = current.toISOString().split('T')[0];
      const ownActivities = activities.filter(activity => 
        activity.start_date === dateString || 
        (activity.start_date <= dateString && (activity.end_date || activity.start_date) >= dateString)
      );

      const connectedActivitiesForDay = includeConnected ? connectedActivities.filter(activity => 
        activity.start_date === dateString || 
        (activity.start_date <= dateString && (activity.end_date || activity.start_date) >= dateString)
      ) : [];

      const invitedActivitiesForDay = includeInvited ? invitedActivities.filter(activity => 
        activity.start_date === dateString || 
        (activity.start_date <= dateString && (activity.end_date || activity.start_date) >= dateString)
      ) : [];

      const dayActivities = [...ownActivities, ...connectedActivitiesForDay, ...invitedActivitiesForDay];
      
      // Find connection requests for this date
      const dayNotifications = connectionRequests.filter(request => {
        const requestDate = new Date(request.created_at).toISOString().split('T')[0];
        return requestDate === dateString;
      });
      
      // Determine if there are both activities and notifications
      const hasActivities = dayActivities.length > 0;
      const hasNotifications = dayNotifications.length > 0;
      
      // Priority: show notifications if present, otherwise show activity count
      let primaryIcon = null;
      let primaryColor = null;
      
      if (hasNotifications) {
        const latestNotification = dayNotifications[0];
        const isIncoming = latestNotification.target_parent_id === user?.id; // Current user is the target
        primaryIcon = getNotificationIcon(latestNotification.status, isIncoming);
        primaryColor = getNotificationColor(latestNotification.status, isIncoming);
      }
      
      days.push({
        date: new Date(current),
        dateString,
        isCurrentMonth: current.getMonth() === month,
        isToday: dateString === new Date().toISOString().split('T')[0],
        isSelected: dateString === selectedDate,
        hasActivities,
        hasNotifications,
        activityCount: dayActivities.length,
        notificationCount: dayNotifications.length,
        activities: dayActivities,
        notifications: dayNotifications,
        primaryColor,
        primaryIcon
      });
      
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + (direction === 'next' ? 1 : -1));
    setCurrentMonth(newMonth);
  };

  const handleDateClick = (dateString: string) => {
    setSelectedDate(dateString);
  };

  const formatTime = (activity: Activity) => {
    if (activity.start_time && activity.end_time) {
      return `${activity.start_time} - ${activity.end_time}`;
    } else if (activity.start_time) {
      return `Starts: ${activity.start_time}`;
    }
    return 'All day';
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const days = generateCalendarDays();

  return (
    <div className="calendar-screen">
      <div className="calendar-header">
        <h2>Calendar</h2>
        <div className="calendar-options">
          <label className="connected-toggle">
            <input
              type="checkbox"
              checked={includeConnected}
              onChange={(e) => setIncludeConnected(e.target.checked)}
            />
            <span>Show Connected Activities</span>
          </label>
          <label className="invited-toggle">
            <input
              type="checkbox"
              checked={includeInvited}
              onChange={(e) => setIncludeInvited(e.target.checked)}
            />
            <span>Show Invited Activities</span>
          </label>
        </div>
      </div>

      <div className="calendar-container">
        <div className="calendar-nav">
          <button onClick={() => navigateMonth('prev')} className="nav-btn">
            ‹
          </button>
          <h3 className="month-year">
            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </h3>
          <button onClick={() => navigateMonth('next')} className="nav-btn">
            ›
          </button>
        </div>

        <div className="calendar-grid">
          <div className="weekdays">
            {weekDays.map(day => (
              <div key={day} className="weekday">
                {day}
              </div>
            ))}
          </div>
          
          <div className="days">
            {days.map((day, index) => (
              <div
                key={index}
                className={`day ${!day.isCurrentMonth ? 'other-month' : ''} ${
                  day.isToday ? 'today' : ''
                } ${day.isSelected ? 'selected' : ''} ${
                  day.hasActivities || day.hasNotifications ? 'has-content' : ''
                }`}
                onClick={() => handleDateClick(day.dateString)}
                style={{
                  ...((day.hasActivities || day.hasNotifications) && day.primaryColor ? {
                    borderLeft: `4px solid ${day.primaryColor}`,
                    backgroundColor: `${day.primaryColor}10`
                  } : {})
                }}
              >
                <span className="day-number">{day.date.getDate()}</span>
                {(day.hasNotifications || day.hasActivities) && (
                  <div className="day-indicators">
                    {day.hasNotifications && (
                      <div 
                        className="notification-icon"
                        style={{ color: day.primaryColor || '#FF9800' }}
                        title={`${day.notificationCount} notification${day.notificationCount > 1 ? 's' : ''}`}
                      >
                        {day.primaryIcon}
                      </div>
                    )}
                    {day.hasActivities && (
                      <div 
                        className="activity-count"
                        style={{ 
                          backgroundColor: day.hasNotifications ? '#6c757d' : (day.primaryColor || '#007bff'),
                          color: 'white'
                        }}
                        title={`${day.activityCount} activit${day.activityCount > 1 ? 'ies' : 'y'}`}
                      >
                        {day.activityCount}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {selectedDate && (
        <div className="selected-date-section">
          <h3>Activities for {new Date(selectedDate).toLocaleDateString()}</h3>
          
          {selectedActivities.length > 0 ? (
            <div className="activities-list">
              {selectedActivities.map((activity, index) => {
                // Determine activity type
                const isOwn = activities.some(a => a.id === activity.id);
                const isConnected = connectedActivities.some(a => a.id === activity.id);
                const isInvited = invitedActivities.some(a => a.id === activity.id);
                
                let activityType = '';
                let activityIcon = '';
                let activityColor = '';
                
                if (isOwn) {
                  activityType = 'Your Activity';
                  activityIcon = '🏠';
                  activityColor = '#007bff';
                } else if (isConnected) {
                  activityType = `Connected (${activity.parent_username || 'Friend'})`;
                  activityIcon = '🤝';
                  activityColor = '#28a745';
                } else if (isInvited) {
                  activityType = `Invited by ${activity.host_parent_username || 'Friend'}`;
                  activityIcon = '📩';
                  activityColor = '#fd7e14';
                }

                return (
                  <div key={index} className="activity-card" style={{ borderLeft: `4px solid ${activityColor}` }}>
                    <div className="activity-header">
                      <div className="activity-title-row">
                        <h4 className="activity-name">{activity.name}</h4>
                        <div className="activity-type" style={{ color: activityColor }}>
                          {activityIcon} {activityType}
                        </div>
                      </div>
                      <span className="activity-time">{formatTime(activity)}</span>
                    </div>
                    {activity.description && (
                      <p className="activity-description">{activity.description}</p>
                    )}
                    {activity.location && (
                      <div className="activity-location">📍 {activity.location}</div>
                    )}
                    {activity.cost && (
                      <div className="activity-cost">💰 ${activity.cost}</div>
                    )}
                    {activity.website_url && (
                      <div className="activity-url">🌐 Website available</div>
                    )}
                    {activity.invitation_message && (
                      <div className="invitation-message">💌 "{activity.invitation_message}"</div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="no-activities">
              <p>No activities scheduled for this day</p>
              <button 
                className="add-activity-btn"
                onClick={() => setShowAddModal(true)}
                disabled={children.length === 0}
              >
                {children.length === 0 ? 'Add children first' : '+ Add Activity'}
              </button>
            </div>
          )}
        </div>
      )}

      {!selectedDate && (
        <div className="instructions">
          <p>Click on a date to view activities for that day</p>
        </div>
      )}

      {loading && (
        <div className="loading-overlay">
          <div className="loading">Loading activities...</div>
        </div>
      )}
    </div>
  );
};

export default CalendarScreen;