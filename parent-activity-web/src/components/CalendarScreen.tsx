import React, { useState, useEffect } from 'react';
import ApiService from '../services/api';
import { Activity, Child } from '../types';
import { useAuth } from '../contexts/AuthContext';
import './CalendarScreen.css';

console.log('📦 CalendarScreen.tsx loaded');

interface CalendarScreenProps {
  initialDate?: string;
  initialViewMode?: 'month' | 'week';
  onNavigateToActivity?: (child: Child, activity: Activity) => void;
}

const CalendarScreen: React.FC<CalendarScreenProps> = ({ initialDate, initialViewMode = 'month', onNavigateToActivity }) => {
  console.log('🎯 CalendarScreen component rendering with initialDate:', initialDate);
  
  const [activities, setActivities] = useState<Activity[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedActivities, setSelectedActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(initialDate ? new Date(initialDate) : new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week'>(initialViewMode);
  const [showAddModal, setShowAddModal] = useState(false);
  const [children, setChildren] = useState<Child[]>([]);
  const [connectionRequests, setConnectionRequests] = useState<any[]>([]);
  const [connectedActivities, setConnectedActivities] = useState<Activity[]>([]);
  const [invitedActivities, setInvitedActivities] = useState<Activity[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<Activity[]>([]);
  const [includeConnected, setIncludeConnected] = useState(false);
  const [includeInvited, setIncludeInvited] = useState(true);
  const [includePending, setIncludePending] = useState(true);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [showActivityDetail, setShowActivityDetail] = useState(false);
  const [activityParticipants, setActivityParticipants] = useState<any>(null);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const { user } = useAuth();
  const apiService = ApiService.getInstance();

  useEffect(() => {
    console.log('📊 useEffect triggered with:', {
      currentMonth: currentMonth.toISOString(),
      includeConnected,
      includeInvited,
      includePending
    });
    
    loadActivities();
    loadChildren();
    loadConnectionRequests();
    if (includeConnected) {
      console.log('🔗 Loading connected activities...');
      loadConnectedActivities();
    }
    if (includeInvited) {
      console.log('📩 Loading invited activities...');
      loadInvitedActivities();
    }
    if (includePending) {
      console.log('⏳ Loading pending invitations...');
      loadPendingInvitations();
    } else {
      console.log('⚠️ includePending is false, skipping loadPendingInvitations');
    }
  }, [currentMonth, includeConnected, includeInvited, includePending]);

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

      const pendingInvitationsForDay = includePending ? pendingInvitations.filter(activity => {
        const activityDate = activity.start_date.split('T')[0];
        const activityEndDate = activity.end_date ? activity.end_date.split('T')[0] : activityDate;
        return activityDate === selectedDate || 
               (activityDate <= selectedDate && activityEndDate >= selectedDate);
      }) : [];

      setSelectedActivities([...ownActivities, ...connectedActivitiesForDay, ...invitedActivitiesForDay, ...pendingInvitationsForDay]);
    }
  }, [selectedDate, activities, connectedActivities, invitedActivities, pendingInvitations, includeConnected, includeInvited, includePending]);

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

  const loadPendingInvitations = async () => {
    console.log('🚀 loadPendingInvitations function started');
    try {
      const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
      
      const startDate = startOfMonth.toISOString().split('T')[0];
      const endDate = endOfMonth.toISOString().split('T')[0];
      
      console.log('📡 Calling getPendingInvitationsForCalendar with:', { startDate, endDate });
      console.log('🔍 ApiService method exists?', typeof apiService.getPendingInvitationsForCalendar);
      
      const response = await apiService.getPendingInvitationsForCalendar(startDate, endDate);
      console.log('📊 getPendingInvitationsForCalendar response:', response);
      
      if (response.success && response.data) {
        console.log('✅ Setting pending invitations:', response.data);
        setPendingInvitations(response.data);
      } else {
        console.log('❌ No pending invitations data, setting empty array');
        setPendingInvitations([]);
      }
    } catch (error) {
      console.error('Load pending invitations error:', error);
      setPendingInvitations([]);
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
    console.log('🔍 generateCalendarDays called with:', {
      currentMonth: currentMonth.toISOString(),
      includePending,
      pendingInvitationsCount: pendingInvitations.length,
      invitedActivitiesCount: invitedActivities.length,
      activitiesCount: activities.length
    });
    
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

      const pendingInvitationsForDay = includePending ? pendingInvitations.filter(activity => {
        const activityDate = activity.start_date.split('T')[0];
        const activityEndDate = activity.end_date ? activity.end_date.split('T')[0] : activityDate;
        return activityDate === dateString || 
               (activityDate <= dateString && activityEndDate >= dateString);
      }) : [];

      const dayActivities = [...ownActivities, ...connectedActivitiesForDay, ...invitedActivitiesForDay, ...pendingInvitationsForDay];
      
      // Debug specific dates
      if (dateString === '2025-08-04' || dateString === '2025-08-07' || dateString === '2025-08-08' || dateString === '2025-08-15') {
        console.log(`📅 ${dateString} DEBUG:`, {
          ownActivities: ownActivities.length,
          connectedActivitiesForDay: connectedActivitiesForDay.length,
          invitedActivitiesForDay: invitedActivitiesForDay.length,
          pendingInvitationsForDay: pendingInvitationsForDay.length,
          totalDayActivities: dayActivities.length,
          includePending,
          pendingInvitationsTotal: pendingInvitations.length,
          samplePendingDates: pendingInvitations.map(p => ({ name: p.name, date: p.start_date }))
        });
      }
      
      
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
      } else if (hasActivities) {
        // Set primary color based on activity types when no notifications
        const hasPending = pendingInvitationsForDay.length > 0;
        const hasInvited = invitedActivitiesForDay.length > 0;
        const hasConnected = connectedActivitiesForDay.length > 0;
        const hasOwn = ownActivities.length > 0;
        
        if (hasPending) {
          primaryColor = '#fd7e14'; // Orange for pending invitations
          primaryIcon = '⏳';
          console.log(`🎯 ${dateString} set as PENDING with color ${primaryColor}`);
        } else if (hasInvited) {
          primaryColor = '#ff9800'; // Light orange for accepted invitations
          primaryIcon = '📩';
        } else if (hasConnected) {
          primaryColor = '#28a745'; // Green for connected activities
          primaryIcon = '🤝';
        } else if (hasOwn) {
          primaryColor = '#007bff'; // Blue for own activities
          primaryIcon = '🏠';
        }
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
    const newDate = new Date(currentMonth);
    if (viewMode === 'week') {
      // Navigate week by week
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    } else {
      // Navigate month by month
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    }
    setCurrentMonth(newDate);
  };

  // Generate week days for week view
  const generateWeekDays = () => {
    const startOfWeek = new Date(currentMonth);
    const day = startOfWeek.getDay();
    startOfWeek.setDate(startOfWeek.getDate() - day); // Start from Sunday
    
    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(startOfWeek);
      currentDate.setDate(startOfWeek.getDate() + i);
      
      const dateString = currentDate.toISOString().split('T')[0];
      const dayActivities = activities.filter(activity => {
        const activityDate = activity.start_date ? activity.start_date.split('T')[0] : '';
        return activityDate === dateString;
      });
      
      const dayConnectedActivities = connectedActivities.filter(activity => {
        const activityDate = activity.start_date ? activity.start_date.split('T')[0] : '';
        return activityDate === dateString;
      });
      
      const dayInvitedActivities = invitedActivities.filter(activity => {
        const activityDate = activity.start_date ? activity.start_date.split('T')[0] : '';
        return activityDate === dateString;
      });
      
      const dayPendingInvitations = pendingInvitations.filter(activity => {
        const activityDate = activity.start_date ? activity.start_date.split('T')[0] : '';
        return activityDate === dateString;
      });
      
      const activityCount = dayActivities.length + 
        (includeConnected ? dayConnectedActivities.length : 0) + 
        (includeInvited ? dayInvitedActivities.length : 0) + 
        (includePending ? dayPendingInvitations.length : 0);
      
      weekDays.push({
        date: currentDate,
        dateString,
        activityCount,
        isToday: dateString === new Date().toISOString().split('T')[0],
        hasNotifications: dayPendingInvitations.length > 0
      });
    }
    
    return weekDays;
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

  const loadActivityParticipants = async (activityId: string) => {
    try {
      setLoadingParticipants(true);
      const response = await apiService.getActivityParticipants(activityId);
      if (response.success && response.data) {
        setActivityParticipants(response.data);
      } else {
        setActivityParticipants(null);
        console.error('Failed to load activity participants:', response.error);
      }
    } catch (error) {
      console.error('Error loading activity participants:', error);
      setActivityParticipants(null);
    } finally {
      setLoadingParticipants(false);
    }
  };

  const handleActivityClick = (activity: Activity) => {
    // If navigation prop is available, use it to navigate to activity-specific URL
    if (onNavigateToActivity) {
      // Find the child that owns this activity
      const activityWithChild = activity as any;
      const childUuid = activityWithChild.child_uuid;
      
      if (childUuid) {
        // Find the child object with this UUID
        const child = children.find(c => c.uuid === childUuid);
        if (child) {
          onNavigateToActivity(child, activity);
          return;
        }
      }
    }

    // Fallback to modal behavior if navigation not available or child not found
    setSelectedActivity(activity);
    setShowActivityDetail(true);
    // Load participants for the activity (if it's a real activity with a UUID)
    if ((activity as any).activity_uuid && !isPendingInvitation(activity)) {
      loadActivityParticipants((activity as any).activity_uuid);
    } else {
      setActivityParticipants(null);
    }
  };

  const isPendingInvitation = (activity: Activity) => {
    return pendingInvitations.some(a => a.uuid === activity.uuid || a.id === activity.id);
  };

  const isDeclinedInvitation = (activity: Activity) => {
    // For CalendarScreen, we don't currently load declined invitations
    // but we'll add this helper for consistency
    return false;
  };

  const handleInvitationResponse = async (invitationUuid: string, action: 'accept' | 'reject') => {
    try {
      const response = await apiService.respondToActivityInvitation(invitationUuid, action);
      if (response.success) {
        const message = action === 'accept' 
          ? 'Invitation accepted! Activity will appear in your calendar.' 
          : 'Invitation rejected.';
        alert(message);
        // Reload all activities to reflect the change
        loadActivities();
        if (includeInvited) loadInvitedActivities();
        if (includePending) loadPendingInvitations();
        setShowActivityDetail(false);
      } else {
        alert(`Error: ${response.error || 'Failed to respond to invitation'}`);
      }
    } catch (error) {
      console.error('Failed to respond to invitation:', error);
      alert('Failed to respond to invitation');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const weekDayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const days = viewMode === 'month' ? generateCalendarDays() : generateWeekDays();
  
  console.log('🎨 CalendarScreen about to render JSX...');

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
            <span>Show Accepted Invitations</span>
          </label>
          <label className="pending-toggle">
            <input
              type="checkbox"
              checked={includePending}
              onChange={(e) => setIncludePending(e.target.checked)}
            />
            <span>Show Pending Invitations</span>
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

        <div className="view-toggle">
          <button 
            className={`view-btn ${viewMode === 'month' ? 'active' : ''}`}
            onClick={() => setViewMode('month')}
          >
            Month
          </button>
          <button 
            className={`view-btn ${viewMode === 'week' ? 'active' : ''}`}
            onClick={() => setViewMode('week')}
          >
            Week
          </button>
        </div>

        <div className="calendar-grid">
          <div className="weekdays">
            {weekDayNames.map(day => (
              <div key={day} className="weekday">
                {day}
              </div>
            ))}
          </div>
          
          <div className={`days ${viewMode === 'week' ? 'week-view' : ''}`}>
            {days.map((day, index) => (
              <div
                key={index}
                className={`day ${viewMode === 'month' && !(day as any).isCurrentMonth ? 'other-month' : ''} ${
                  day.isToday ? 'today' : ''
                } ${(day as any).isSelected ? 'selected' : ''} ${
                  (day as any).hasActivities || day.hasNotifications || day.activityCount > 0 ? 'has-content' : ''
                }`}
                onClick={() => handleDateClick(day.dateString)}
                style={{
                  ...(((day as any).hasActivities || day.hasNotifications || day.activityCount > 0) && (day as any).primaryColor ? {
                    borderLeft: `4px solid ${(day as any).primaryColor}`,
                    backgroundColor: `${(day as any).primaryColor}10`
                  } : {})
                }}
              >
                <span className="day-number">{day.date.getDate()}</span>
                {(day.hasNotifications || (day as any).hasActivities || day.activityCount > 0) && (
                  <div className="day-indicators">
                    {day.hasNotifications && (
                      <div 
                        className="notification-icon"
                        style={{ color: (day as any).primaryColor || '#FF9800' }}
                        title={`${(day as any).notificationCount || 0} notification${((day as any).notificationCount || 0) > 1 ? 's' : ''}`}
                      >
                        {(day as any).primaryIcon || '●'}
                      </div>
                    )}
                    {((day as any).hasActivities || day.activityCount > 0) && (
                      <div 
                        className="activity-count"
                        style={{ 
                          backgroundColor: day.hasNotifications ? '#6c757d' : ((day as any).primaryColor || '#007bff'),
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
                const isOwn = activities.some(a => a.uuid === activity.uuid || a.id === activity.id);
                const isConnected = connectedActivities.some(a => a.uuid === activity.uuid || a.id === activity.id);
                const isInvited = invitedActivities.some(a => a.uuid === activity.uuid || a.id === activity.id);
                const isPending = pendingInvitations.some(a => a.uuid === activity.uuid || a.id === activity.id);
                
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
                  activityColor = '#ff9800';
                } else if (isPending) {
                  activityType = `Pending Invitation from ${activity.host_parent_username || 'Friend'}`;
                  activityIcon = '⏳';
                  activityColor = '#fd7e14';
                }

                return (
                  <div 
                    key={index} 
                    className="activity-card clickable-card" 
                    style={{ borderLeft: `4px solid ${activityColor}` }}
                    onClick={() => handleActivityClick({
                      ...activity,
                      isPendingInvitation: isPending,
                      isDeclinedInvitation: false,
                      invitationId: isPending ? activity.invitation_id : undefined,
                      hostParent: activity.host_parent_username,
                      message: activity.invitation_message
                    })}
                  >
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
                      <div className="activity-url">
                        <a href={activity.website_url} target="_blank" rel="noopener noreferrer">
                          🌐 Visit Website
                        </a>
                      </div>
                    )}
                    {activity.invitation_message && (
                      <div className="invitation-message">💌 "{activity.invitation_message}"</div>
                    )}
                    <div className="click-hint" style={{ 
                      fontSize: '12px', 
                      color: '#666', 
                      marginTop: '8px',
                      fontStyle: 'italic' 
                    }}>
                      Click for details
                    </div>
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

      {/* Enhanced Activity Detail Modal */}
      {showActivityDetail && selectedActivity && (
        <div className="modal-overlay" onClick={() => setShowActivityDetail(false)}>
          <div className="modal activity-detail-modal" onClick={(e) => e.stopPropagation()}>
            <h3>{selectedActivity.name}</h3>
            <div className="activity-detail-content">
              {selectedActivity.isPendingInvitation && (
                <div className="invitation-info">
                  <div className="detail-item">
                    <strong>Invitation from:</strong>
                    <p>👤 {selectedActivity.hostParent}</p>
                  </div>
                  {selectedActivity.message && (
                    <div className="detail-item">
                      <strong>Message:</strong>
                      <p>💬 "{selectedActivity.message}"</p>
                    </div>
                  )}
                  <div className="detail-item">
                    <strong>Status:</strong>
                    <p>
                      <span style={{ color: '#48bb78' }}>📩 Pending</span>
                    </p>
                  </div>
                </div>
              )}
              
              {selectedActivity.description && (
                <div className="detail-item">
                  <strong>Description:</strong>
                  <p>{selectedActivity.description}</p>
                </div>
              )}
              <div className="detail-item">
                <strong>Date & Time:</strong>
                <p>📅 {formatDate(selectedActivity.start_date)} {selectedActivity.start_time && `🕐 ${selectedActivity.start_time}${selectedActivity.end_time ? ` - ${selectedActivity.end_time}` : ''}`}</p>
              </div>
              {selectedActivity.location && (
                <div className="detail-item">
                  <strong>Location:</strong>
                  <p>📍 {selectedActivity.location}</p>
                </div>
              )}
              {selectedActivity.cost && (
                <div className="detail-item">
                  <strong>Cost:</strong>
                  <p>${selectedActivity.cost}</p>
                </div>
              )}
              {selectedActivity.max_participants && (
                <div className="detail-item">
                  <strong>Max Participants:</strong>
                  <p>{selectedActivity.max_participants}</p>
                </div>
              )}
              {selectedActivity.website_url && (
                <div className="detail-item">
                  <strong>Website:</strong>
                  <p>
                    <a href={selectedActivity.website_url} target="_blank" rel="noopener noreferrer">
                      {selectedActivity.website_url}
                    </a>
                  </p>
                </div>
              )}
              
              {/* Activity Participants Section */}
              {!selectedActivity.isPendingInvitation && (
                <div className="participants-section">
                  <div className="detail-item">
                    <strong>Participants:</strong>
                    {loadingParticipants ? (
                      <p>Loading participants...</p>
                    ) : activityParticipants ? (
                      <div className="participants-list">
                        <div className="host-info">
                          <p>👤 <strong>{activityParticipants.host?.host_name} (Host)</strong></p>
                        </div>
                        {activityParticipants.participants?.length > 0 ? (
                          <div className="invited-participants">
                            <h4>Invited Families:</h4>
                            {activityParticipants.participants.map((participant: any, index: number) => (
                              <div key={index} className="participant-item">
                                <div className="participant-info">
                                  <span className="participant-name">👤 {participant.parent_name}</span>
                                  {participant.child_name && (
                                    <span className="participant-child"> ({participant.child_name})</span>
                                  )}
                                </div>
                                <div className="participant-status">
                                  {participant.status === 'pending' && (
                                    <span style={{ color: '#fd7e14', fontSize: '12px' }}>📩 Pending</span>
                                  )}
                                  {participant.status === 'accepted' && (
                                    <span style={{ color: '#48bb78', fontSize: '12px' }}>✅ Accepted</span>
                                  )}
                                  {participant.status === 'rejected' && (
                                    <span style={{ color: '#a0aec0', fontSize: '12px' }}>❌ Rejected</span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p style={{ fontSize: '14px', color: '#666', fontStyle: 'italic' }}>
                            No invitations sent yet
                          </p>
                        )}
                      </div>
                    ) : (
                      <p style={{ fontSize: '14px', color: '#666' }}>
                        Unable to load participants
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="modal-actions">
              <button
                onClick={() => setShowActivityDetail(false)}
                className="cancel-btn"
              >
                Close
              </button>
              
              {/* Show accept/decline buttons for pending invitations */}
              {selectedActivity.isPendingInvitation && selectedActivity.invitationId && (
                <>
                  <button
                    onClick={() => handleInvitationResponse(selectedActivity.invitationUuid || String(selectedActivity.invitationId!), 'accept')}
                    className="confirm-btn"
                    style={{ background: 'linear-gradient(135deg, #48bb78, #68d391)', marginRight: '8px' }}
                  >
                    ✅ Accept Invitation
                  </button>
                  <button
                    onClick={() => handleInvitationResponse(selectedActivity.invitationUuid || String(selectedActivity.invitationId!), 'reject')}
                    className="delete-btn"
                  >
                    ❌ Decline Invitation
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarScreen;