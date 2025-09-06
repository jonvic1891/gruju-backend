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

// Helper function to ensure URLs have proper protocol
const ensureProtocol = (url: string): string => {
  if (!url) return url;
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  return `https://${url}`;
};

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
  // Set all activity types to true by default since we removed the filter UI
  const includeConnected = true; // Enable connected activities
  const includeInvited = true;
  const includePending = true;
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [showActivityDetail, setShowActivityDetail] = useState(false);
  const [activityParticipants, setActivityParticipants] = useState<any>(null);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [selectedChildrenFilter, setSelectedChildrenFilter] = useState<string[]>([]); // Empty means show all children
  const { user } = useAuth();
  const apiService = ApiService.getInstance();

  // Child color mapping - consistent colors for each child
  const childColors = [
    '#007bff', // Blue
    '#28a745', // Green
    '#dc3545', // Red
    '#fd7e14', // Orange
    '#6f42c1', // Purple
    '#e83e8c', // Pink
    '#20c997', // Teal
    '#ffc107'  // Yellow
  ];

  const getChildColor = (childUuid: string) => {
    if (!childUuid) return '#007bff';
    // Create a simple hash of the childUuid to get consistent color assignment
    let hash = 0;
    for (let i = 0; i < childUuid.length; i++) {
      hash = childUuid.charCodeAt(i) + ((hash << 5) - hash);
    }
    return childColors[Math.abs(hash) % childColors.length];
  };

  useEffect(() => {
    console.log('📊 useEffect triggered for month/settings change:', {
      currentMonth: currentMonth.toISOString(),
      includeConnected,
      includeInvited,
      includePending,
      childrenCount: children.length
    });
    
    loadActivities();
    loadChildren();
    loadConnectionRequests();
    if (includeInvited) {
      console.log('📩 Loading invited activities...');
      loadInvitedActivities();
    }
    if (includePending) {
      console.log('⏳ Loading pending invitations...');
      loadPendingInvitations();
    }
  }, [currentMonth, includeInvited, includePending]); // Removed selectedChildrenFilter to prevent excessive reloads

  // Separate useEffect for connected activities that depends on children being loaded
  useEffect(() => {
    if (includeConnected && children.length > 0) {
      console.log('🔗 Loading connected activities for', children.length, 'children...');
      loadConnectedActivities();
    }
  }, [children, includeConnected, currentMonth]);

  useEffect(() => {
    if (selectedDate) {
      const ownActivities = activities.filter(activity => {
        if (!activity.start_date) return false;
        const activityDate = activity.start_date.split('T')[0];
        const activityEndDate = activity.end_date ? activity.end_date.split('T')[0] : activityDate;
        return activityDate === selectedDate || 
               (activityDate <= selectedDate && activityEndDate >= selectedDate);
      });

      const connectedActivitiesForDay = includeConnected ? connectedActivities.filter(activity => {
        if (!activity.start_date) return false;
        const activityDate = activity.start_date.split('T')[0];
        const activityEndDate = activity.end_date ? activity.end_date.split('T')[0] : activityDate;
        return activityDate === selectedDate || 
               (activityDate <= selectedDate && activityEndDate >= selectedDate);
      }) : [];

      const invitedActivitiesForDay = includeInvited ? invitedActivities.filter(activity => {
        if (!activity.start_date) return false;
        const activityDate = activity.start_date.split('T')[0];
        const activityEndDate = activity.end_date ? activity.end_date.split('T')[0] : activityDate;
        return activityDate === selectedDate || 
               (activityDate <= selectedDate && activityEndDate >= selectedDate);
      }) : [];

      const pendingInvitationsForDay = includePending ? pendingInvitations.filter(activity => {
        if (!activity.start_date) return false;
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
      // Load connections for each child individually, like the child activity screen does
      const allConnectedActivities: Activity[] = [];
      
      for (const child of children) {
        if (child.uuid) {
          console.log(`📡 Loading connections for child ${child.name} (${child.uuid})`);
          const response = await apiService.getChildConnections(child.uuid);
          if (response.success && response.data) {
            // The response contains connection activities for this child
            allConnectedActivities.push(...response.data);
          }
        }
      }
      
      console.log(`✅ Loaded ${allConnectedActivities.length} connected activities total`);
      setConnectedActivities(allConnectedActivities);
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
      // Use local date format to match activity dates without timezone conversion
      const year = current.getFullYear();
      const month = String(current.getMonth() + 1).padStart(2, '0');
      const day = String(current.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;
      
      // Get local children UUIDs for filtering
      const localChildrenUuids = children.map(c => c.uuid);
      
      // Filter activities by child if filter is applied
      const shouldIncludeChild = (childUuid: string) => {
        return selectedChildrenFilter.length === 0 || selectedChildrenFilter.includes(childUuid);
      };

      // Own activities: where your children are the hosts
      const ownActivities = activities.filter(activity => {
        if (!activity.start_date) return false; // Skip activities without dates
        const activityDate = activity.start_date.split('T')[0]; // Handle full datetime format
        const matchesDate = activityDate === dateString || 
          (activity.start_date <= dateString && (activity.end_date || activity.start_date) >= dateString);
        const isLocalChild = activity.child_uuid && localChildrenUuids.includes(activity.child_uuid);
        const matchesChild = activity.child_uuid ? shouldIncludeChild(activity.child_uuid) : true;
        return matchesDate && isLocalChild && matchesChild;
      });

      const connectedActivitiesForDay = includeConnected ? connectedActivities.filter(activity => {
        if (!activity.start_date) return false; // Skip activities without dates
        const activityDate = activity.start_date.split('T')[0]; // Handle full datetime format
        const matchesDate = activityDate === dateString || 
          (activity.start_date <= dateString && (activity.end_date || activity.start_date) >= dateString);
        const isLocalChild = activity.child_uuid && localChildrenUuids.includes(activity.child_uuid);
        const matchesChild = activity.child_uuid ? shouldIncludeChild(activity.child_uuid) : true;
        return matchesDate && isLocalChild && matchesChild;
      }) : [];

      // Invited activities: where your children were invited and accepted
      const invitedActivitiesForDay = includeInvited ? invitedActivities.filter(activity => {
        if (!activity.start_date) return false; // Skip activities without dates
        const activityDate = activity.start_date.split('T')[0]; // Handle full datetime format
        const matchesDate = activityDate === dateString || 
          (activity.start_date <= dateString && (activity.end_date || activity.start_date) >= dateString);
        // For invited activities, check if one of your children was invited
        const invitedChildUuid = (activity as any).invited_child_uuid;
        const isLocalChildInvited = invitedChildUuid && localChildrenUuids.includes(invitedChildUuid);
        const matchesChild = invitedChildUuid ? shouldIncludeChild(invitedChildUuid) : true;
        return matchesDate && isLocalChildInvited && matchesChild;
      }) : [];

      // Pending invitations: where your children were invited but haven't responded
      const pendingInvitationsForDay = includePending ? pendingInvitations.filter(activity => {
        if (!activity.start_date) return false; // Skip activities without dates
        const activityDate = activity.start_date.split('T')[0];
        const activityEndDate = activity.end_date ? activity.end_date.split('T')[0] : activityDate;
        const matchesDate = activityDate === dateString || 
               (activityDate <= dateString && activityEndDate >= dateString);
        // For pending invitations, check if one of your children was invited
        const invitedChildUuid = (activity as any).invited_child_uuid;
        const isLocalChildInvited = invitedChildUuid && localChildrenUuids.includes(invitedChildUuid);
        const matchesChild = invitedChildUuid ? shouldIncludeChild(invitedChildUuid) : true;
        return matchesDate && isLocalChildInvited && matchesChild;
      }) : [];

      const dayActivities = [...ownActivities, ...connectedActivitiesForDay, ...invitedActivitiesForDay, ...pendingInvitationsForDay];
      
      // Group activities by child for color coding
      const activitiesByChild = dayActivities.reduce((acc, activity) => {
        // For invited activities, use the invited child UUID; for own activities, use the host child UUID
        const isInvited = invitedActivitiesForDay.includes(activity) || pendingInvitationsForDay.includes(activity);
        const childUuid = isInvited 
          ? ((activity as any).invited_child_uuid || activity.child_uuid || 'unknown')
          : (activity.child_uuid || 'unknown');
        
        if (!acc[childUuid]) {
          acc[childUuid] = [];
        }
        acc[childUuid].push(activity);
        return acc;
      }, {} as Record<string, any[]>);

      const childrenWithActivities = Object.keys(activitiesByChild).filter(uuid => uuid !== 'unknown');
      
      // Debug removed - calendar logic is working correctly
      
      
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
        // Use child-specific colors for activities
        if (childrenWithActivities.length === 1) {
          // Single child - use their color
          const childUuid = childrenWithActivities[0];
          primaryColor = getChildColor(childUuid);
        } else if (childrenWithActivities.length > 1) {
          // Multiple children - use a mixed color approach or primary child
          primaryColor = getChildColor(childrenWithActivities[0]); // Use first child's color as primary
        } else {
          // Fallback color
          primaryColor = '#007bff';
        }
      }
      
      days.push({
        date: new Date(current),
        dateString,
        isCurrentMonth: current.getMonth() === currentMonth.getMonth(),
        isToday: dateString === (() => {
          const today = new Date();
          const todayYear = today.getFullYear();
          const todayMonth = String(today.getMonth() + 1).padStart(2, '0');
          const todayDay = String(today.getDate()).padStart(2, '0');
          return `${todayYear}-${todayMonth}-${todayDay}`;
        })(),
        isSelected: dateString === selectedDate,
        hasActivities,
        hasNotifications,
        activityCount: dayActivities.length,
        notificationCount: dayNotifications.length,
        activities: dayActivities,
        notifications: dayNotifications,
        primaryColor,
        primaryIcon,
        activitiesByChild, // Child-specific activities for rendering multiple children
        childrenWithActivities // Array of child UUIDs with activities this day
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
    
    // Auto-scroll to the activities list section
    setTimeout(() => {
      const activitiesSection = document.querySelector('.activities-list');
      if (activitiesSection) {
        activitiesSection.scrollIntoView({ 
          behavior: 'smooth',
          block: 'start'
        });
      }
    }, 100); // Small delay to ensure the activities have rendered
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
      // TODO: Implement batch loading for CalendarScreen to avoid individual API calls
      console.warn('⚠️ CalendarScreen: Individual participants API call disabled for performance - implement batch loading');
      setActivityParticipants(null);
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
          {/* Single Children Filter Dropdown */}
          <div className="filter-dropdown">
            <label>Show activities for:</label>
            <select
              value={selectedChildrenFilter.length === 0 ? 'all' : selectedChildrenFilter.length === 1 ? selectedChildrenFilter[0] : 'multiple'}
              onChange={(e) => {
                const value = e.target.value;
                if (value === 'all') {
                  setSelectedChildrenFilter([]);
                } else {
                  setSelectedChildrenFilter([value]);
                }
              }}
              className="single-select"
            >
              <option value="all">All Children</option>
              {children.map((child) => (
                <option key={child.uuid} value={child.uuid}>
                  {child.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        {/* Color Key Legend */}
        {(() => {
          // Only show local children in the legend since we only show their activities
          const localChildrenUuids = children.map(c => c.uuid);
          
          // Get all unique local children who have activities
          const localChildrenWithActivities = [
            // From own activities (always local children)
            ...activities.map(a => a.child_uuid),
            // From invited activities (only the invited local children)
            ...(includeInvited ? invitedActivities.map(a => (a as any).invited_child_uuid) : []),
            // From pending invitations (only the invited local children)
            ...(includePending ? pendingInvitations.map(a => (a as any).invited_child_uuid) : [])
          ].filter((uuid, index, arr) => {
            return uuid && arr.indexOf(uuid) === index && localChildrenUuids.includes(uuid);
          }); // Only include local children with activities

          const childrenWithActivitiesToShow = localChildrenWithActivities.map(uuid => {
            const localChild = children.find(c => c.uuid === uuid);
            return { uuid, name: localChild?.name || 'Unknown', isLocal: true };
          });

          return childrenWithActivitiesToShow.length > 0 && (
            <div className="color-key-section">
              <h4 style={{ margin: '10px 0 8px 0', fontSize: '14px', color: '#666' }}>Color Key:</h4>
              <div className="color-key-items">
                {childrenWithActivitiesToShow.map((child) => (
                  <div key={child.uuid} className="color-key-item">
                    <div 
                      className="color-swatch" 
                      style={{ 
                        backgroundColor: getChildColor(child.uuid || ''),
                        width: '16px',
                        height: '16px',
                        borderRadius: '50%',
                        marginRight: '6px'
                      }}
                    />
                    <span style={{ 
                      fontSize: '13px', 
                      color: '#333',
                      fontWeight: child.isLocal ? 'bold' : 'normal',
                      fontStyle: child.isLocal ? 'normal' : 'italic'
                    }}>
                      {child.name}{child.isLocal ? '' : ' (external)'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
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
                      <div className="activity-indicators">
                        {(day as any).childrenWithActivities?.length > 1 ? (
                          // Multiple children - show stacked indicators
                          <div className="multi-child-indicators">
                            {(day as any).childrenWithActivities.map((childUuid: string, childIndex: number) => {
                              const childActivities = (day as any).activitiesByChild[childUuid] || [];
                              const childName = children.find(c => c.uuid === childUuid)?.name || 
                                               (childActivities[0]?.child_name) || 'Unknown';
                              const nameParts = childName.split(' ');
                              const firstInitial = nameParts[0]?.charAt(0).toUpperCase() || '';
                              const lastInitial = nameParts[1]?.charAt(0).toUpperCase() || '';
                              const childInitials = firstInitial + lastInitial;
                              return (
                                <div
                                  key={childUuid}
                                  className="child-indicator"
                                  style={{
                                    backgroundColor: getChildColor(childUuid),
                                    color: 'white',
                                    fontSize: '11px',
                                    padding: '3px 8px',
                                    borderRadius: '6px',
                                    marginBottom: '3px',
                                    fontWeight: 'bold',
                                    minWidth: '45px',
                                    height: '20px',
                                    textAlign: 'center',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                                  }}
                                  title={`${childName}: ${childActivities.length} activit${childActivities.length > 1 ? 'ies' : 'y'}`}
                                >
                                  <span style={{ 
                                    letterSpacing: '0.5px', 
                                    fontSize: '9px',
                                    fontWeight: '700',
                                    backgroundColor: 'rgba(255,255,255,0.3)',
                                    borderRadius: '50%',
                                    width: '16px',
                                    height: '16px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    border: '1px solid rgba(255,255,255,0.4)'
                                  }}>{childInitials}</span>
                                  <span style={{ 
                                    fontSize: '13px', 
                                    fontWeight: '900',
                                    color: '#fff',
                                    textShadow: '0 1px 1px rgba(0,0,0,0.2)'
                                  }}>{childActivities.length}</span>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          // Single child - show initials + count
                          (() => {
                            const singleChildUuid = (day as any).childrenWithActivities?.[0];
                            if (singleChildUuid) {
                              const childActivities = (day as any).activitiesByChild[singleChildUuid] || [];
                              const childName = children.find(c => c.uuid === singleChildUuid)?.name || 
                                               (childActivities[0]?.child_name) || 'Unknown';
                              const nameParts = childName.split(' ');
                              const firstInitial = nameParts[0]?.charAt(0).toUpperCase() || '';
                              const lastInitial = nameParts[1]?.charAt(0).toUpperCase() || '';
                              const childInitials = firstInitial + lastInitial;
                              return (
                                <div 
                                  className="activity-count"
                                  style={{ 
                                    backgroundColor: getChildColor(singleChildUuid),
                                    color: 'white',
                                    fontSize: '11px',
                                    padding: '3px 8px',
                                    borderRadius: '6px',
                                    fontWeight: 'bold',
                                    minWidth: '45px',
                                    height: '20px',
                                    textAlign: 'center',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                                  }}
                                  title={`${childName}: ${day.activityCount} activit${day.activityCount > 1 ? 'ies' : 'y'}`}
                                >
                                  <span style={{ 
                                    letterSpacing: '0.5px', 
                                    fontSize: '9px',
                                    fontWeight: '700',
                                    backgroundColor: 'rgba(255,255,255,0.3)',
                                    borderRadius: '50%',
                                    width: '16px',
                                    height: '16px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    border: '1px solid rgba(255,255,255,0.4)'
                                  }}>{childInitials}</span>
                                  <span style={{ 
                                    fontSize: '13px', 
                                    fontWeight: '900',
                                    color: '#fff',
                                    textShadow: '0 1px 1px rgba(0,0,0,0.2)'
                                  }}>{day.activityCount}</span>
                                </div>
                              );
                            } else {
                              // Fallback for activities without clear child attribution
                              return (
                                <div 
                                  className="activity-count"
                                  style={{ 
                                    backgroundColor: '#007bff',
                                    color: 'white',
                                    fontSize: '10px',
                                    padding: '2px 6px',
                                    borderRadius: '3px',
                                    fontWeight: 'bold'
                                  }}
                                  title={`${day.activityCount} activit${day.activityCount > 1 ? 'ies' : 'y'}`}
                                >
                                  {day.activityCount}
                                </div>
                              );
                            }
                          })()
                        )}
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
              {(() => {
                // Group activities by child, excluding pending invitations
                const activitiesByChild = selectedActivities.reduce((groups, activity) => {
                  // Skip activities that are only pending invitations
                  const isPending = pendingInvitations.some(a => a.uuid === activity.uuid || a.id === activity.id);
                  const isOwnActivity = activities.some(a => a.uuid === activity.uuid || a.id === activity.id);
                  const isInvitedActivity = connectedActivities.some(a => a.uuid === activity.uuid || a.id === activity.id) ||
                                           invitedActivities.some(a => a.uuid === activity.uuid || a.id === activity.id);
                  
                  // Only skip if it's pending AND not our own activity AND not an accepted/connected activity
                  if (isPending && !isOwnActivity && !isInvitedActivity) {
                    return groups;
                  }
                  
                  // For invited activities, try to get the child who was invited
                  const childUuid = isInvitedActivity 
                    ? ((activity as any).invited_child_uuid || activity.child_uuid || '')
                    : (activity.child_uuid || '');
                  const childName = children.find(c => c.uuid === childUuid)?.name || 'Unknown Child';
                  
                  if (!groups[childName]) {
                    groups[childName] = {
                      childUuid,
                      activities: []
                    };
                  }
                  groups[childName].activities.push({
                    ...activity,
                    isOwnActivity,
                    isInvitedActivity,
                    childUuid,
                    childName
                  });
                  return groups;
                }, {} as Record<string, { childUuid: string; activities: any[] }>);

                return Object.entries(activitiesByChild).map(([childName, group]) => {
                  const childColor = getChildColor(group.childUuid);
                  
                  return (
                    <div key={childName} className="child-activity-group" style={{ marginBottom: '20px' }}>
                      {/* Child Name Header */}
                      <div className="child-header" style={{
                        display: 'flex',
                        alignItems: 'center',
                        marginBottom: '8px',
                        padding: '8px 12px',
                        backgroundColor: childColor,
                        color: 'white',
                        borderRadius: '6px',
                        fontWeight: 'bold',
                        fontSize: '14px'
                      }}>
                        <span>{childName}</span>
                        <span style={{ 
                          marginLeft: 'auto', 
                          fontSize: '12px', 
                          opacity: 0.9 
                        }}>
                          {group.activities.length} activit{group.activities.length > 1 ? 'ies' : 'y'}
                        </span>
                      </div>

                      {/* Activities for this child */}
                      <div className="child-activities">
                        {group.activities.map((activity, index) => {
                          // Use the flags we already determined during grouping
                          const isOwnActivity = activity.isOwnActivity;
                          const isInvitedActivity = activity.isInvitedActivity;
                          
                          let activitySource = '';
                          if (isInvitedActivity) {
                            // Show the host child's name for invited activities (connected or accepted)
                            const hostChildName = activity.host_child_name || activity.child_name || 'Friend';
                            // Only show "Invited by" if the host is NOT one of the parent's own children
                            const isOwnChildHost = children.some(child => child.name === hostChildName);
                            if (!isOwnChildHost) {
                              activitySource = `Invited by ${hostChildName}`;
                            }
                          }

                          return (
                            <div 
                              key={index} 
                              className="activity-card" 
                              style={{ 
                                borderLeft: `4px solid ${childColor}`,
                                marginBottom: '8px',
                                padding: '10px',
                                position: 'relative'
                              }}
                            >
                              {/* View button - positioned top-right */}
                              <button 
                                className="view-activity-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleActivityClick({
                                    ...activity,
                                    isPendingInvitation: false,
                                    isDeclinedInvitation: false,
                                    hostParent: activity.host_parent_username
                                  });
                                }}
                                style={{
                                  position: 'absolute',
                                  top: '8px',
                                  right: '8px',
                                  fontSize: '12px',
                                  padding: '6px 12px',
                                  backgroundColor: childColor,
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '16px',
                                  cursor: 'pointer',
                                  fontWeight: 'bold',
                                  boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                                  minWidth: '50px'
                                }}
                              >
                                View
                              </button>

                              {/* Activity Name + Time */}
                              <div className="activity-title-time" style={{
                                fontSize: '15px',
                                fontWeight: 'bold',
                                marginBottom: '4px',
                                color: '#333',
                                paddingRight: '80px' // Make space for click hint
                              }}>
                                {activity.name} {formatTime(activity)}
                              </div>

                              {/* Activity Details Row */}
                              <div className="activity-details-row" style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'flex-start',
                                gap: '12px',
                                fontSize: '12px',
                                color: '#666'
                              }}>
                                <div className="activity-left-details">
                                  {activity.location && (
                                    <div className="activity-location">📍 {activity.location}</div>
                                  )}
                                  {activitySource && (
                                    <div className="activity-source" style={{ color: childColor, fontWeight: '500' }}>
                                      {activitySource}
                                    </div>
                                  )}
                                </div>

                                <div className="activity-right-details" style={{ textAlign: 'right' }}>
                                  {activity.cost && (
                                    <div className="activity-cost">💰 ${activity.cost}</div>
                                  )}
                                  {activity.max_participants && (
                                    <div className="activity-max-participants">
                                      👥 Max {activity.max_participants}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Description if present */}
                              {activity.description && (
                                <div className="activity-description" style={{
                                  marginTop: '6px',
                                  fontSize: '12px',
                                  color: '#555',
                                  fontStyle: 'italic',
                                  lineHeight: '1.3'
                                }}>
                                  {activity.description}
                                </div>
                              )}

                              {/* Website link if present */}
                              {activity.website_url && (
                                <div className="activity-url" style={{ marginTop: '4px' }}>
                                  <a href={ensureProtocol(activity.website_url)} target="_blank" rel="noopener noreferrer" 
                                     style={{ fontSize: '11px', color: childColor }}>
                                    🌐 Visit Website
                                  </a>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                });
              })()}
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
                    <a href={ensureProtocol(selectedActivity.website_url)} target="_blank" rel="noopener noreferrer">
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