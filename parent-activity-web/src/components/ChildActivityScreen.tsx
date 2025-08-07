import React, { useState, useEffect } from 'react';
import ApiService from '../services/api';
import { Child, Activity } from '../types';
import TimePickerDropdown from './TimePickerDropdown';
import CalendarDatePicker from './CalendarDatePicker';
import './ChildActivityScreen.css';

interface ChildActivityScreenProps {
  child: Child;
  onBack: () => void;
}

const ChildActivityScreen: React.FC<ChildActivityScreenProps> = ({ child, onBack }) => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [invitedActivities, setInvitedActivities] = useState<any[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<any[]>([]);
  const [declinedInvitations, setDeclinedInvitations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [calendarView, setCalendarView] = useState<'5day' | '7day'>('5day');
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [showActivityDetail, setShowActivityDetail] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [duplicatingActivity, setDuplicatingActivity] = useState<Activity | null>(null);
  const [duplicateDate, setDuplicateDate] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [invitingActivity, setInvitingActivity] = useState<Activity | null>(null);
  const [connectedFamilies, setConnectedFamilies] = useState<any[]>([]);
  const [invitationMessage, setInvitationMessage] = useState('');
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [isSharedActivity, setIsSharedActivity] = useState(false);
  const [selectedConnectedChildren, setSelectedConnectedChildren] = useState<number[]>([]);
  const [connectedChildren, setConnectedChildren] = useState<any[]>([]);
  const [newActivity, setNewActivity] = useState({
    name: '',
    description: '',
    start_date: '',
    end_date: '',
    start_time: '',
    end_time: '',
    location: '',
    website_url: '',
    cost: '',
    max_participants: ''
  });
  const [addingActivity, setAddingActivity] = useState(false);
  const [activityParticipants, setActivityParticipants] = useState<any>(null);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const apiService = ApiService.getInstance();

  useEffect(() => {
    loadActivities();
    loadConnectedChildren();
  }, [child.id]);

  // Prevent body scroll when any modal is open
  useEffect(() => {
    const isAnyModalOpen = showAddModal || showActivityDetail || showEditModal || showDuplicateModal || showInviteModal;
    
    if (isAnyModalOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = '0px'; // Prevent layout shift
    } else {
      document.body.style.overflow = 'unset';
      document.body.style.paddingRight = 'unset';
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = 'unset';
      document.body.style.paddingRight = 'unset';
    };
  }, [showAddModal, showActivityDetail, showEditModal, showDuplicateModal, showInviteModal]);

  const loadActivities = async () => {
    try {
      setLoading(true);
      
      // Load child's own activities
      const activitiesResponse = await apiService.getActivities(child.id);
      if (activitiesResponse.success && activitiesResponse.data) {
        const activitiesData = Array.isArray(activitiesResponse.data) ? activitiesResponse.data : [];
        setActivities(activitiesData);
      } else {
        console.error('Failed to load activities:', activitiesResponse.error);
        setActivities([]);
      }
      
      // Load invitations using the proper calendar endpoints (like CalendarScreen does)
      // Get date range for current month to load all relevant invitations
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const startDate = startOfMonth.toISOString().split('T')[0];
      const endDate = endOfMonth.toISOString().split('T')[0];
      
      console.log(`📩 Loading invitations for ${child.name} from ${startDate} to ${endDate}`);
      console.log(`🔗 API URL will be: /api/calendar/pending-invitations?start=${startDate}&end=${endDate}`);
      
      // Load accepted/invited activities
      const invitedResponse = await apiService.getInvitedActivities(startDate, endDate);
      if (invitedResponse.success && invitedResponse.data) {
        // Filter for this specific child
        const childInvitedActivities = invitedResponse.data.filter((invitation: any) => 
          invitation.invited_child_name === child.name
        );
        
        console.log(`✅ Found ${childInvitedActivities.length} accepted invitations for ${child.name}`);
        setInvitedActivities(childInvitedActivities);
      } else {
        console.error('Failed to load invited activities:', invitedResponse.error);
        setInvitedActivities([]);
      }
      
      // Load pending invitations
      const pendingResponse = await apiService.getPendingInvitationsForCalendar(startDate, endDate);
      if (pendingResponse.success && pendingResponse.data) {
        // Filter for this specific child
        const childPendingInvitations = pendingResponse.data.filter((invitation: any) => 
          invitation.invited_child_name === child.name
        );
        
        console.log(`📩 Found ${childPendingInvitations.length} pending invitations for ${child.name}`);
        setPendingInvitations(childPendingInvitations);
      } else {
        console.error('Failed to load pending invitations:', pendingResponse.error);
        setPendingInvitations([]);
      }
      
      // Load declined invitations
      const declinedResponse = await apiService.getDeclinedInvitationsForCalendar(startDate, endDate);
      if (declinedResponse.success && declinedResponse.data) {
        // Filter for this specific child
        const childDeclinedInvitations = declinedResponse.data.filter((invitation: any) => 
          invitation.invited_child_name === child.name
        );
        
        console.log(`❌ Found ${childDeclinedInvitations.length} declined invitations for ${child.name}`);
        setDeclinedInvitations(childDeclinedInvitations);
      } else {
        console.error('Failed to load declined invitations:', declinedResponse.error);
        setDeclinedInvitations([]);
      }
      
    } catch (error) {
      console.error('Load activities error:', error);
      setActivities([]);
      setInvitedActivities([]);
      setPendingInvitations([]);
      setDeclinedInvitations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInvitationResponse = async (invitationId: number, action: 'accept' | 'reject') => {
    try {
      const response = await apiService.respondToActivityInvitation(invitationId, action);
      
      if (response.success) {
        const message = action === 'accept' 
          ? 'Invitation accepted! Activity will appear in your calendar.' 
          : 'Invitation declined.';
        alert(message);
        
        // Reload activities to update the display
        loadActivities();
        
        // Close the detail modal
        setShowActivityDetail(false);
      } else {
        alert(`Error: ${response.error || 'Failed to respond to invitation'}`);
      }
    } catch (error) {
      console.error('Failed to respond to invitation:', error);
      alert('Failed to respond to invitation');
    }
  };

  const loadConnectedChildren = async () => {
    try {
      const response = await apiService.getConnections();
      if (response.success && response.data) {
        // Get current user info to determine which children are ours vs connected
        const currentUser = JSON.parse(localStorage.getItem('userData') || '{}');
        const currentUsername = currentUser.username;
        
        // Extract connected children from connections
        const children: any[] = [];
        response.data.forEach((connection: any) => {
          // For each connection, add the child that belongs to the OTHER family
          
          // Add child1 if it belongs to the other family
          if (connection.child1_name && connection.child1_parent_name !== currentUsername) {
            children.push({
              id: connection.child1_id,
              name: connection.child1_name,
              parentId: connection.child1_parent_id,
              parentName: connection.child1_parent_name,
              connectionId: connection.id
            });
          }
          
          // Add child2 if it belongs to the other family
          if (connection.child2_name && connection.child2_parent_name !== currentUsername) {
            children.push({
              id: connection.child2_id,
              name: connection.child2_name,
              parentId: connection.child2_parent_id,
              parentName: connection.child2_parent_name,
              connectionId: connection.id
            });
          }
        });
        
        console.log('Connected children loaded:', children);
        setConnectedChildren(children);
      }
    } catch (error) {
      console.error('Failed to load connected children:', error);
      setConnectedChildren([]);
    }
  };

  const handleAddActivity = () => {
    setShowAddModal(true);
  };

  const loadActivityParticipants = async (activityId: number) => {
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
    setSelectedActivity(activity);
    setShowActivityDetail(true);
    
    // Populate newActivity state with selected activity data for inline editing
    setNewActivity({
      name: activity.name || '',
      description: activity.description || '',
      start_date: activity.start_date || '',
      end_date: activity.end_date || '',
      start_time: activity.start_time || '',
      end_time: activity.end_time || '',
      location: activity.location || '',
      website_url: activity.website_url || '',
      cost: activity.cost ? activity.cost.toString() : '',
      max_participants: activity.max_participants ? activity.max_participants.toString() : ''
    });
    
    // Load participants for any activity that has a real backend activity ID
    // For invitations, we need to get the original activity ID from the backend
    if (activity.isPendingInvitation || activity.isDeclinedInvitation) {
      // For invitations, we need to load participants using the original activity ID
      // The invitation data should contain the original activity_id
      const originalActivityId = (activity as any).activity_id || (activity as any).id;
      if (originalActivityId && typeof originalActivityId === 'number') {
        loadActivityParticipants(originalActivityId);
      } else {
        setActivityParticipants(null);
      }
    } else if (activity.id) {
      // For regular activities, use the activity ID directly
      loadActivityParticipants(activity.id);
    } else {
      setActivityParticipants(null);
    }
  };

  const handleEditActivity = (activity: Activity) => {
    setEditingActivity(activity);
    setNewActivity({
      name: activity.name,
      description: activity.description || '',
      start_date: activity.start_date.split('T')[0],
      end_date: activity.end_date ? activity.end_date.split('T')[0] : activity.start_date.split('T')[0],
      start_time: activity.start_time || '',
      end_time: activity.end_time || '',
      location: activity.location || '',
      website_url: activity.website_url || '',
      cost: activity.cost ? activity.cost.toString() : '',
      max_participants: activity.max_participants ? activity.max_participants.toString() : ''
    });
    setShowActivityDetail(false);
    setShowEditModal(true);
  };

  const handleUpdateActivity = async () => {
    if (!selectedActivity || !newActivity.name.trim() || !newActivity.start_date) {
      alert('Please enter activity name and start date');
      return;
    }

    setAddingActivity(true);
    try {
      const activityData = {
        ...newActivity,
        cost: newActivity.cost ? parseFloat(newActivity.cost) : undefined,
        max_participants: newActivity.max_participants ? parseInt(newActivity.max_participants) : undefined
      };

      const response = await apiService.updateActivity(selectedActivity.id, activityData);
      
      if (response.success) {
        // Update the selected activity with new data for immediate UI update
        const updatedActivity = { ...selectedActivity, ...activityData };
        setSelectedActivity(updatedActivity);
        
        alert('Activity updated successfully!');
        loadActivities(); // Reload activities to reflect changes
        // Keep modal open to see updated data
      } else {
        alert(`Error: ${response.error || 'Failed to update activity'}`);
      }
    } catch (error) {
      alert('Failed to update activity');
      console.error('Update activity error:', error);
    } finally {
      setAddingActivity(false);
    }
  };

  const handleDeleteActivity = async (activity: Activity) => {
    if (window.confirm(`Are you sure you want to delete "${activity.name}"?`)) {
      try {
        const response = await apiService.deleteActivity(activity.id);
        if (response.success) {
          setShowActivityDetail(false);
          loadActivities();
          alert('Activity deleted successfully');
        } else {
          alert(`Error: ${response.error || 'Failed to delete activity'}`);
        }
      } catch (error) {
        alert('Failed to delete activity');
        console.error('Delete activity error:', error);
      }
    }
  };

  const handleDuplicateActivity = (activity: Activity) => {
    setDuplicatingActivity(activity);
    setDuplicateDate(new Date().toISOString().split('T')[0]);
    setShowActivityDetail(false);
    setShowDuplicateModal(true);
  };

  const handleConfirmDuplicate = async () => {
    if (!duplicatingActivity || !duplicateDate) {
      alert('Please select a date for the duplicate activity');
      return;
    }

    setAddingActivity(true);
    try {
      const response = await apiService.duplicateActivity(
        duplicatingActivity.id, 
        duplicateDate, 
        duplicateDate
      );
      
      if (response.success) {
        setShowDuplicateModal(false);
        setDuplicatingActivity(null);
        setDuplicateDate('');
        loadActivities();
        alert('Activity duplicated successfully');
      } else {
        alert(`Error: ${response.error || 'Failed to duplicate activity'}`);
      }
    } catch (error) {
      alert('Failed to duplicate activity');
      console.error('Duplicate activity error:', error);
    } finally {
      setAddingActivity(false);
    }
  };

  const handleCreateActivity = async () => {
    if (!newActivity.name.trim()) {
      alert('Please enter activity name');
      return;
    }

    if (selectedDates.length === 0) {
      alert('Please select at least one date from the calendar');
      return;
    }
    
    const datesToCreate = selectedDates;

    setAddingActivity(true);
    try {
      const createdActivities = [];
      
      // Create activity for each selected date
      for (const date of datesToCreate) {
        const activityData = {
          ...newActivity,
          start_date: date,
          end_date: date, // Single day activities for each date
          cost: newActivity.cost ? parseFloat(newActivity.cost) : undefined,
          max_participants: newActivity.max_participants ? parseInt(newActivity.max_participants) : undefined
        };

        const response = await apiService.createActivity(child.id, activityData);
        
        if (response.success) {
          createdActivities.push(response.data);
        } else {
          console.error(`Failed to create activity for ${date}:`, response.error);
        }
      }

      // If it's a shared activity, send invitations to selected connected children
      if (isSharedActivity && selectedConnectedChildren.length > 0 && createdActivities.length > 0) {
        for (const activity of createdActivities) {
          for (const childId of selectedConnectedChildren) {
            try {
              // Find the connected child data to get the parent ID
              const connectedChild = connectedChildren.find(cc => cc.id === childId);
              if (connectedChild) {
                await apiService.sendActivityInvitation(
                  activity.id, 
                  connectedChild.parentId, // Use the correct parent ID
                  childId, // The child ID for the invitation
                  `${child.name} would like to invite your child to join: ${activity.name}`
                );
              }
            } catch (inviteError) {
              console.error('Failed to send invitation:', inviteError);
            }
          }
        }
      }

      // Reset form
      setNewActivity({
        name: '',
        description: '',
        start_date: '',
        end_date: '',
        start_time: '',
        end_time: '',
        location: '',
        website_url: '',
        cost: '',
        max_participants: ''
      });
      setSelectedDates([]);
      setIsSharedActivity(false);
      setSelectedConnectedChildren([]);
      setShowAddModal(false);
      loadActivities();
      
      const message = createdActivities.length === 1 
        ? 'Activity created successfully!' 
        : `${createdActivities.length} activities created successfully!`;
      alert(message);
      
    } catch (error) {
      alert('Failed to create activity');
      console.error('Create activity error:', error);
    } finally {
      setAddingActivity(false);
    }
  };

  const handleInviteActivity = async (activity: Activity) => {
    try {
      // Load connected families
      const response = await apiService.getConnections();
      if (response.success && response.data) {
        setConnectedFamilies(response.data);
        setInvitingActivity(activity);
        setInvitationMessage(`Hi! I'd like to invite you to join us for "${activity.name}" on ${formatDate(activity.start_date)}. Let me know if you're interested!`);
        setShowInviteModal(true);
      } else {
        alert('Failed to load connected families');
      }
    } catch (error) {
      console.error('Load connections error:', error);
      alert('Failed to load connected families');
    }
  };

  const handleSendInvitation = async (invitedParentId: number, childId?: number) => {
    if (!invitingActivity) return;

    try {
      const response = await apiService.sendActivityInvitation(
        invitingActivity.id, 
        invitedParentId, 
        childId, 
        invitationMessage
      );
      
      if (response.success) {
        alert('Invitation sent successfully!');
        setShowInviteModal(false);
        setInvitingActivity(null);
        setInvitationMessage('');
      } else {
        alert(`Error: ${response.error || 'Failed to send invitation'}`);
      }
    } catch (error) {
      console.error('Send invitation error:', error);
      alert('Failed to send invitation');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatTime = (timeString?: string) => {
    if (!timeString) return '';
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getActivityColor = (activity: Activity | any) => {
    // Green for pending invitations (our main invitation system)
    if (activity.isPendingInvitation) {
      return {
        background: 'linear-gradient(135deg, #48bb78, #68d391)',
        borderColor: '#38a169'
      };
    }
    
    // Grey for declined invitations
    if (activity.isDeclinedInvitation) {
      return {
        background: 'linear-gradient(135deg, #a0aec0, #cbd5e0)',
        borderColor: '#718096'
      };
    }
    
    // Light blue for shared/accepted activities
    if (activity.is_shared) {
      return {
        background: 'linear-gradient(135deg, #4299e1, #63b3ed)',
        borderColor: '#3182ce'
      };
    }
    
    // Dark blue for private activities (default)
    return {
      background: 'linear-gradient(135deg, #2d3748, #4a5568)',
      borderColor: '#1a202c'
    };
  };

  const generateWeekDays = () => {
    const startOfWeek = new Date(currentWeek);
    const dayOfWeek = startOfWeek.getDay();
    startOfWeek.setDate(startOfWeek.getDate() - dayOfWeek);
    
    const days = [];
    const daysToShow = calendarView === '5day' ? 5 : 7;
    const startDay = calendarView === '5day' ? 1 : 0; // Monday for 5-day, Sunday for 7-day
    
    for (let i = startDay; i < startDay + daysToShow; i++) {
      const current = new Date(startOfWeek);
      current.setDate(startOfWeek.getDate() + i);
      const dateString = current.toISOString().split('T')[0];
      
      // Get activities for this day
      const dayActivities = activities.filter(activity => {
        // Convert activity dates to simple date strings for comparison
        const activityStartDate = activity.start_date.split('T')[0];
        const activityEndDate = activity.end_date ? activity.end_date.split('T')[0] : activityStartDate;
        
        return activityStartDate === dateString || 
               (activityStartDate <= dateString && activityEndDate >= dateString);
      });
      
      // Get invited activities for this day (convert to activity format)
      const dayInvitedActivities = invitedActivities.filter(invitation => {
        const invitationStartDate = invitation.start_date.split('T')[0];
        return invitationStartDate === dateString;
      }).map(invitation => ({
        ...invitation,
        id: `accepted-${invitation.id}`,
        activity_id: invitation.id, // Original activity ID from backend for participants API
        name: invitation.activity_name,
        description: invitation.activity_description,
        isAcceptedInvitation: true,
        invitationId: invitation.invitation_id,
        hostParent: invitation.host_parent_username,
        host_child_name: invitation.child_name,
        host_parent_name: invitation.host_parent_username,
        is_shared: true // Mark as shared so it gets the blue color
      }));

      // Get pending invitations for this day (convert to activity format)
      const dayPendingInvitations = pendingInvitations.filter(invitation => {
        const invitationStartDate = invitation.start_date.split('T')[0];
        return invitationStartDate === dateString;
      }).map(invitation => ({
        ...invitation,
        id: `invitation-${invitation.id}`,
        activity_id: invitation.id, // Original activity ID from backend for participants API
        name: invitation.activity_name,
        description: invitation.activity_description,
        isPendingInvitation: true,
        invitationId: invitation.invitation_id,
        hostParent: invitation.host_parent_username,
        host_child_name: invitation.child_name,
        host_parent_name: invitation.host_parent_username
      }));
      
      // Get declined invitations for this day (convert to activity format)
      const dayDeclinedInvitations = declinedInvitations.filter(invitation => {
        const invitationStartDate = invitation.start_date.split('T')[0];
        return invitationStartDate === dateString;
      }).map(invitation => ({
        ...invitation,
        id: `declined-${invitation.id}`,
        activity_id: invitation.id, // Original activity ID from backend for participants API
        name: invitation.activity_name,
        description: invitation.activity_description,
        isDeclinedInvitation: true,
        invitationId: invitation.invitation_id,
        hostParent: invitation.host_parent_username,
        host_child_name: invitation.child_name,
        host_parent_name: invitation.host_parent_username
      }));
      
      // Combine activities and all types of invitations
      const allDayItems = [...dayActivities, ...dayInvitedActivities, ...dayPendingInvitations, ...dayDeclinedInvitations];
      
      // Sort all items by start time
      const sortedItems = allDayItems.sort((a, b) => {
        const timeA = a.start_time || '00:00:00';
        const timeB = b.start_time || '00:00:00';
        return timeA.localeCompare(timeB);
      });
      
      days.push({
        date: new Date(current),
        dateString,
        isToday: dateString === new Date().toISOString().split('T')[0],
        hasActivities: sortedItems.length > 0,
        activities: sortedItems,
        count: sortedItems.length
      });
    }
    
    return days;
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newWeek = new Date(currentWeek);
    newWeek.setDate(newWeek.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentWeek(newWeek);
  };

  const getWeekRange = () => {
    const days = generateWeekDays();
    if (days.length === 0) return '';
    const firstDay = days[0].date;
    const lastDay = days[days.length - 1].date;
    
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    const firstFormatted = firstDay.toLocaleDateString('en-US', options);
    const lastFormatted = lastDay.toLocaleDateString('en-US', options);
    
    if (firstDay.getFullYear() === lastDay.getFullYear()) {
      return `${firstFormatted} - ${lastFormatted}, ${firstDay.getFullYear()}`;
    } else {
      return `${firstFormatted}, ${firstDay.getFullYear()} - ${lastFormatted}, ${lastDay.getFullYear()}`;
    }
  };

  const weekDayNames = calendarView === '5day' 
    ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  if (loading) {
    return (
      <div className="child-activity-screen">
        <div className="loading">Loading activities...</div>
      </div>
    );
  }

  return (
    <div className="child-activity-screen">
      <div className="activity-header">
        <button onClick={onBack} className="back-btn">
          ← Back to Children
        </button>
        <div className="child-info">
          <h2>{child.name}'s Activities</h2>
          <p>
            {child.age && `Age: ${child.age}`}
            {child.age && child.grade && ' • '}
            {child.grade && `Grade: ${child.grade}`}
          </p>
        </div>
        <div className="header-actions">
          <div className="view-toggle">
            <button
              onClick={() => setCalendarView('5day')}
              className={`toggle-btn ${calendarView === '5day' ? 'active' : ''}`}
            >
              5 Day
            </button>
            <button
              onClick={() => setCalendarView('7day')}
              className={`toggle-btn ${calendarView === '7day' ? 'active' : ''}`}
            >
              7 Day
            </button>
          </div>
        </div>
      </div>

      {/* Color Legend */}
      <div className="color-legend">
        <h4>Activity Color Guide:</h4>
        <div className="legend-items">
          <div className="legend-item">
            <div className="legend-color" style={{ background: 'linear-gradient(135deg, #2d3748, #4a5568)' }}></div>
            <span>Private activities</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ background: 'linear-gradient(135deg, #4299e1, #63b3ed)' }}></div>
            <span>Shared/Accepted activities</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ background: 'linear-gradient(135deg, #48bb78, #68d391)' }}></div>
            <span>Pending invitations</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ background: 'linear-gradient(135deg, #a0aec0, #cbd5e0)' }}></div>
            <span>Declined invitations</span>
          </div>
        </div>
      </div>

      {/* Week Calendar View */}
      <div className="week-calendar-container" data-view={calendarView}>
        <div className="calendar-nav">
          <button onClick={() => navigateWeek('prev')} className="nav-btn">
            ‹
          </button>
          <h3 className="week-range">{getWeekRange()}</h3>
          <button onClick={() => navigateWeek('next')} className="nav-btn">
            ›
          </button>
        </div>

        <div className="week-calendar-grid">
          <div className="week-headers">
            {generateWeekDays().map((day, index) => (
              <div key={index} className="week-header">
                <div className="day-name">
                  {day.date.toLocaleDateString('en-US', { weekday: 'short' })}
                </div>
                <div className={`date-number ${day.isToday ? 'today' : ''}`}>
                  {day.date.getDate()}
                </div>
              </div>
            ))}
          </div>
          
          <div className="week-days">
            {generateWeekDays().map((day, index) => (
              <div 
                key={index} 
                className={`week-day ${day.isToday ? 'today' : ''} ${day.activities.length > 0 ? 'has-activities' : ''}`}
              >
                <div className="day-activities">
                  {day.activities.length > 0 ? (
                    day.activities.map((activity, actIndex) => {
                      const colors = getActivityColor(activity);
                      return (
                        <div 
                          key={actIndex} 
                          className="activity-block"
                          style={{
                            background: colors.background,
                            borderLeftColor: colors.borderColor
                          }}
                          onClick={() => handleActivityClick(activity)}
                        >
                          <div className="activity-time">
                            {activity.start_time ? formatTime(activity.start_time) : 'All day'}
                          </div>
                          <div className="activity-name">
                            {activity.name}
                            {activity.isPendingInvitation && <span className="invitation-badge">📩</span>}
                            {activity.isDeclinedInvitation && <span className="invitation-badge">❌</span>}
                          </div>
                          {(activity.isPendingInvitation || activity.isDeclinedInvitation) && (
                            <div className="activity-host">from {activity.host_child_name || activity.hostParent}</div>
                          )}
                          {activity.location && (
                            <div className="activity-location">📍 {activity.location}</div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="no-activities">No activities</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Add Activity Button */}
      <div className="add-activity-section">
        <button onClick={handleAddActivity} className="add-btn">
          + Add New Activity
        </button>
      </div>

      {/* Week Activities List */}
      <div className="week-activities-list">
        <h3>This Week's Activities</h3>
        {activities.filter(activity => {
          const weekDays = generateWeekDays();
          const activityDate = activity.start_date.split('T')[0];
          return weekDays.some(day => day.dateString === activityDate);
        }).length > 0 ? (
          <div className="activities-grid">
            {activities
              .filter(activity => {
                const weekDays = generateWeekDays();
                const activityDate = activity.start_date.split('T')[0];
                return weekDays.some(day => day.dateString === activityDate);
              })
              .sort((a, b) => {
                const dateA = new Date(a.start_date + 'T' + (a.start_time || '00:00'));
                const dateB = new Date(b.start_date + 'T' + (b.start_time || '00:00'));
                return dateA.getTime() - dateB.getTime();
              })
              .map((activity, index) => {
                const colors = getActivityColor(activity);
                return (
                  <div 
                    key={index} 
                    className="activity-card"
                    style={{
                      borderLeftColor: colors.borderColor
                    }}
                    onClick={() => {
                      setSelectedActivity(activity);
                      setShowActivityDetail(true);
                    }}
                  >
                    <h4 className="activity-name">{activity.name}</h4>
                  {activity.description && (
                    <p className="activity-description">{activity.description}</p>
                  )}
                  <div className="activity-details">
                    <div>📅 {formatDate(activity.start_date)}</div>
                    {activity.start_time && (
                      <div>
                        🕐 {formatTime(activity.start_time)}
                        {activity.end_time && ` - ${formatTime(activity.end_time)}`}
                      </div>
                    )}
                    {activity.location && <div>📍 {activity.location}</div>}
                    {activity.cost && <div>💰 ${activity.cost}</div>}
                  </div>
                    <div className="activity-date-added">
                      Added {formatDate(activity.created_at)}
                    </div>
                  </div>
                );
              })}
          </div>
        ) : (
          <div className="empty-state">
            <h3>No activities this week</h3>
            <p>Add your first activity to get started!</p>
            <button onClick={handleAddActivity} className="add-first-btn">
              + Add Activity
            </button>
          </div>
        )}
      </div>


      {/* Add Activity Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal activity-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Add New Activity for {child.name}</h3>
            <div className="modal-form">
              <input
                type="text"
                placeholder="Activity name *"
                value={newActivity.name}
                onChange={(e) => setNewActivity({...newActivity, name: e.target.value})}
                className="modal-input"
                autoFocus
              />
              <textarea
                placeholder="Description"
                value={newActivity.description}
                onChange={(e) => setNewActivity({...newActivity, description: e.target.value})}
                className="modal-textarea"
                rows={3}
              />
              
              {/* Date Selection Section */}
              <div className="date-selection-section">
                <label className="section-label">Select Activity Dates</label>
                <p className="section-description">Click dates to select/deselect them. You can choose multiple dates for recurring activities.</p>
                <CalendarDatePicker
                  selectedDates={selectedDates}
                  onChange={setSelectedDates}
                  minDate={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div className="time-row">
                <div className="time-field">
                  <label>Start Time</label>
                  <TimePickerDropdown
                    value={newActivity.start_time}
                    onChange={(time) => setNewActivity({...newActivity, start_time: time})}
                    placeholder="Start time"
                  />
                </div>
                <div className="time-field">
                  <label>End Time</label>
                  <TimePickerDropdown
                    value={newActivity.end_time}
                    onChange={(time) => setNewActivity({...newActivity, end_time: time})}
                    placeholder="End time"
                  />
                </div>
              </div>
              <input
                type="text"
                placeholder="Location"
                value={newActivity.location}
                onChange={(e) => setNewActivity({...newActivity, location: e.target.value})}
                className="modal-input"
              />
              <input
                type="url"
                placeholder="Website URL"
                value={newActivity.website_url}
                onChange={(e) => setNewActivity({...newActivity, website_url: e.target.value})}
                className="modal-input"
              />
              <div className="number-row">
                <input
                  type="number"
                  placeholder="Cost ($)"
                  value={newActivity.cost}
                  onChange={(e) => setNewActivity({...newActivity, cost: e.target.value})}
                  className="modal-input"
                  min="0"
                  step="0.01"
                />
                <input
                  type="number"
                  placeholder="Max participants"
                  value={newActivity.max_participants}
                  onChange={(e) => setNewActivity({...newActivity, max_participants: e.target.value})}
                  className="modal-input"
                  min="1"
                />
              </div>
              
              {/* Privacy and Sharing Section */}
              <div className="privacy-section">
                <label className="section-label">Activity Privacy</label>
                <div className="privacy-options">
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="privacyMode"
                      checked={!isSharedActivity}
                      onChange={() => setIsSharedActivity(false)}
                    />
                    🔒 Private (Only you and {child.name})
                  </label>
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="privacyMode"
                      checked={isSharedActivity}
                      onChange={() => setIsSharedActivity(true)}
                    />
                    🌐 Shared (Invite connected families)
                  </label>
                </div>
                
                {isSharedActivity && (
                  <div className="connected-children-section">
                    <label>Invite Children:</label>
                    {connectedChildren.length === 0 ? (
                      <p className="no-connections">No connected families found. Add connections first!</p>
                    ) : (
                      <div className="children-list">
                        {connectedChildren.map((connectedChild) => (
                          <label key={connectedChild.id} className="child-checkbox">
                            <input
                              type="checkbox"
                              checked={selectedConnectedChildren.includes(connectedChild.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedConnectedChildren([...selectedConnectedChildren, connectedChild.id]);
                                } else {
                                  setSelectedConnectedChildren(
                                    selectedConnectedChildren.filter(id => id !== connectedChild.id)
                                  );
                                }
                              }}
                            />
                            {connectedChild.name} ({connectedChild.parentName})
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="modal-actions">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNewActivity({
                    name: '',
                    description: '',
                    start_date: '',
                    end_date: '',
                    start_time: '',
                    end_time: '',
                    location: '',
                    website_url: '',
                    cost: '',
                    max_participants: ''
                  });
                  setSelectedDates([]);
                  setIsSharedActivity(false);
                  setSelectedConnectedChildren([]);
                }}
                className="cancel-btn"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateActivity}
                disabled={addingActivity}
                className={`confirm-btn ${addingActivity ? 'disabled' : ''}`}
              >
                {addingActivity ? 'Adding...' : 'Add Activity'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Activity Detail Modal with Inline Editing */}
      {showActivityDetail && selectedActivity && (
        <div className="modal-overlay" onClick={() => setShowActivityDetail(false)}>
          <div className="modal activity-detail-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Activity Details</h3>
            <div className="activity-detail-content">
              {(selectedActivity.isPendingInvitation || selectedActivity.isDeclinedInvitation) && (
                <div className="invitation-info">
                  <div className="detail-item">
                    <strong>Invitation from:</strong>
                    <p>👤 {selectedActivity.host_child_name || selectedActivity.child_name} ({selectedActivity.host_parent_name || selectedActivity.host_parent_username})</p>
                  </div>
                  <div className="detail-item">
                    <strong>Status:</strong>
                    <p>
                      {selectedActivity.isPendingInvitation && <span style={{ color: '#48bb78' }}>📩 Pending</span>}
                      {selectedActivity.isDeclinedInvitation && <span style={{ color: '#a0aec0' }}>❌ Declined</span>}
                    </p>
                  </div>
                </div>
              )}
              
              {/* Activity Details Form - Always Editable for Host */}
              <div className="activity-details-form">
                <div className="form-row">
                  <label><strong>Activity Name:</strong></label>
                  {selectedActivity.is_host && !selectedActivity.isPendingInvitation && !selectedActivity.isDeclinedInvitation ? (
                    <input
                      type="text"
                      value={newActivity.name}
                      onChange={(e) => setNewActivity({...newActivity, name: e.target.value})}
                      className="inline-edit-input"
                      placeholder="Activity name"
                    />
                  ) : (
                    <span className="readonly-value">{selectedActivity.name}</span>
                  )}
                </div>

                <div className="form-row">
                  <label><strong>Description:</strong></label>
                  {selectedActivity.is_host && !selectedActivity.isPendingInvitation && !selectedActivity.isDeclinedInvitation ? (
                    <textarea
                      value={newActivity.description}
                      onChange={(e) => setNewActivity({...newActivity, description: e.target.value})}
                      className="inline-edit-textarea"
                      placeholder="Activity description"
                      rows={2}
                    />
                  ) : (
                    <span className="readonly-value">{selectedActivity.description || 'No description'}</span>
                  )}
                </div>

                <div className="form-row">
                  <label><strong>Start Date:</strong></label>
                  {selectedActivity.is_host && !selectedActivity.isPendingInvitation && !selectedActivity.isDeclinedInvitation ? (
                    <input
                      type="date"
                      value={newActivity.start_date}
                      onChange={(e) => setNewActivity({...newActivity, start_date: e.target.value})}
                      className="inline-edit-input"
                    />
                  ) : (
                    <span className="readonly-value">📅 {formatDate(selectedActivity.start_date)}</span>
                  )}
                </div>

                <div className="form-row">
                  <label><strong>End Date:</strong></label>
                  {selectedActivity.is_host && !selectedActivity.isPendingInvitation && !selectedActivity.isDeclinedInvitation ? (
                    <input
                      type="date"
                      value={newActivity.end_date}
                      onChange={(e) => setNewActivity({...newActivity, end_date: e.target.value})}
                      className="inline-edit-input"
                    />
                  ) : (
                    <span className="readonly-value">{selectedActivity.end_date ? formatDate(selectedActivity.end_date) : 'Same day'}</span>
                  )}
                </div>

                <div className="form-row-group">
                  <div className="form-row">
                    <label><strong>Start Time:</strong></label>
                    {selectedActivity.is_host && !selectedActivity.isPendingInvitation && !selectedActivity.isDeclinedInvitation ? (
                      <TimePickerDropdown
                        value={newActivity.start_time}
                        onChange={(time) => setNewActivity({...newActivity, start_time: time})}
                        placeholder="Start time"
                      />
                    ) : (
                      <span className="readonly-value">🕐 {selectedActivity.start_time ? formatTime(selectedActivity.start_time) : 'All day'}</span>
                    )}
                  </div>

                  <div className="form-row">
                    <label><strong>End Time:</strong></label>
                    {selectedActivity.is_host && !selectedActivity.isPendingInvitation && !selectedActivity.isDeclinedInvitation ? (
                      <TimePickerDropdown
                        value={newActivity.end_time}
                        onChange={(time) => setNewActivity({...newActivity, end_time: time})}
                        placeholder="End time"
                      />
                    ) : (
                      <span className="readonly-value">{selectedActivity.end_time ? formatTime(selectedActivity.end_time) : 'Not set'}</span>
                    )}
                  </div>
                </div>

                <div className="form-row">
                  <label><strong>Location:</strong></label>
                  {selectedActivity.is_host && !selectedActivity.isPendingInvitation && !selectedActivity.isDeclinedInvitation ? (
                    <input
                      type="text"
                      value={newActivity.location}
                      onChange={(e) => setNewActivity({...newActivity, location: e.target.value})}
                      className="inline-edit-input"
                      placeholder="Activity location"
                    />
                  ) : (
                    <span className="readonly-value">📍 {selectedActivity.location || 'No location specified'}</span>
                  )}
                </div>

                <div className="form-row">
                  <label><strong>Website:</strong></label>
                  {selectedActivity.is_host && !selectedActivity.isPendingInvitation && !selectedActivity.isDeclinedInvitation ? (
                    <input
                      type="url"
                      value={newActivity.website_url}
                      onChange={(e) => setNewActivity({...newActivity, website_url: e.target.value})}
                      className="inline-edit-input"
                      placeholder="Website URL"
                    />
                  ) : (
                    <span className="readonly-value">
                      {selectedActivity.website_url ? (
                        <a href={selectedActivity.website_url} target="_blank" rel="noopener noreferrer">
                          🌐 {selectedActivity.website_url}
                        </a>
                      ) : (
                        'No website'
                      )}
                    </span>
                  )}
                </div>

                <div className="form-row-group">
                  <div className="form-row">
                    <label><strong>Cost:</strong></label>
                    {selectedActivity.is_host && !selectedActivity.isPendingInvitation && !selectedActivity.isDeclinedInvitation ? (
                      <input
                        type="number"
                        value={newActivity.cost}
                        onChange={(e) => setNewActivity({...newActivity, cost: e.target.value})}
                        className="inline-edit-input"
                        placeholder="Cost ($)"
                        min="0"
                        step="0.01"
                      />
                    ) : (
                      <span className="readonly-value">💰 {selectedActivity.cost ? `$${selectedActivity.cost}` : 'Free'}</span>
                    )}
                  </div>

                  <div className="form-row">
                    <label><strong>Max Participants:</strong></label>
                    {selectedActivity.is_host && !selectedActivity.isPendingInvitation && !selectedActivity.isDeclinedInvitation ? (
                      <input
                        type="number"
                        value={newActivity.max_participants}
                        onChange={(e) => setNewActivity({...newActivity, max_participants: e.target.value})}
                        className="inline-edit-input"
                        placeholder="Max participants"
                        min="1"
                      />
                    ) : (
                      <span className="readonly-value">{selectedActivity.max_participants || 'No limit'}</span>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Activity Participants Section */}
              <div className="participants-section">
                <div className="detail-item">
                  <strong>Who's Invited:</strong>
                  {loadingParticipants ? (
                    <p>Loading participants...</p>
                  ) : activityParticipants ? (
                    <div className="participants-list">
                      <div className="host-info">
                        <p>👤 <strong>{activityParticipants.host?.host_name} (Host)</strong></p>
                      </div>
                      {activityParticipants.participants?.length > 0 ? (
                        <div className="invited-participants">
                          <h4>Invited Children & Families:</h4>
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
                                {participant.status === 'declined' && (
                                  <span style={{ color: '#a0aec0', fontSize: '12px' }}>❌ Declined</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p style={{ fontSize: '14px', color: '#666', fontStyle: 'italic' }}>
                          No other families invited yet
                        </p>
                      )}
                    </div>
                  ) : (
                    <p style={{ fontSize: '14px', color: '#666' }}>
                      Unable to load participant information
                    </p>
                  )}
                </div>
              </div>
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
                    onClick={() => handleInvitationResponse(selectedActivity.invitationId!, 'accept')}
                    className="confirm-btn"
                    style={{ background: 'linear-gradient(135deg, #48bb78, #68d391)', marginRight: '8px' }}
                  >
                    ✅ Accept Invitation
                  </button>
                  <button
                    onClick={() => handleInvitationResponse(selectedActivity.invitationId!, 'reject')}
                    className="delete-btn"
                  >
                    ❌ Decline Invitation
                  </button>
                </>
              )}
              
              {/* Show enhanced buttons for activity host */}
              {selectedActivity.is_host && !selectedActivity.isPendingInvitation && !selectedActivity.isDeclinedInvitation && (
                <>
                  <button
                    onClick={handleUpdateActivity}
                    className="confirm-btn"
                    style={{ background: 'linear-gradient(135deg, #28a745, #34ce57)' }}
                  >
                    💾 Save Changes
                  </button>
                  <button
                    onClick={() => handleInviteActivity(selectedActivity)}
                    className="confirm-btn"
                    style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)' }}
                  >
                    ➕ Invite More
                  </button>
                  <button
                    onClick={() => handleDuplicateActivity(selectedActivity)}
                    className="add-btn"
                  >
                    📋 Duplicate
                  </button>
                  <button
                    onClick={() => handleDeleteActivity(selectedActivity)}
                    className="delete-btn"
                  >
                    🗑️ Delete
                  </button>
                </>
              )}
              
              {/* For non-host activities, show limited actions */}
              {!selectedActivity.is_host && !selectedActivity.isPendingInvitation && !selectedActivity.isDeclinedInvitation && (
                <>
                  <button
                    onClick={() => handleDuplicateActivity(selectedActivity)}
                    className="add-btn"
                  >
                    📋 Duplicate
                  </button>
                  <div className="host-info">
                    <p style={{ fontSize: '14px', color: '#666', fontStyle: 'italic' }}>
                      Only the activity host can edit this activity
                    </p>
                  </div>
                </>
              )}
              
              {/* For declined invitations, show informational text */}
              {selectedActivity.isDeclinedInvitation && (
                <div className="declined-info">
                  <p style={{ fontSize: '14px', color: '#666', fontStyle: 'italic' }}>
                    This invitation has been declined. Contact the host if you'd like to reconsider.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Activity Modal */}
      {showEditModal && editingActivity && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal activity-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Edit Activity: {editingActivity.name}</h3>
            <div className="modal-form">
              <input
                type="text"
                placeholder="Activity name *"
                value={newActivity.name}
                onChange={(e) => setNewActivity({...newActivity, name: e.target.value})}
                className="modal-input"
                autoFocus
              />
              <textarea
                placeholder="Description"
                value={newActivity.description}
                onChange={(e) => setNewActivity({...newActivity, description: e.target.value})}
                className="modal-textarea"
                rows={3}
              />
              <div className="date-row">
                <input
                  type="date"
                  placeholder="Start date *"
                  value={newActivity.start_date}
                  onChange={(e) => setNewActivity({...newActivity, start_date: e.target.value})}
                  className="modal-input"
                />
                <input
                  type="date"
                  placeholder="End date"
                  value={newActivity.end_date}
                  onChange={(e) => setNewActivity({...newActivity, end_date: e.target.value})}
                  className="modal-input"
                />
              </div>
              <div className="time-row">
                <div className="time-field">
                  <label>Start Time</label>
                  <TimePickerDropdown
                    value={newActivity.start_time}
                    onChange={(time) => setNewActivity({...newActivity, start_time: time})}
                    placeholder="Start time"
                  />
                </div>
                <div className="time-field">
                  <label>End Time</label>
                  <TimePickerDropdown
                    value={newActivity.end_time}
                    onChange={(time) => setNewActivity({...newActivity, end_time: time})}
                    placeholder="End time"
                  />
                </div>
              </div>
              <input
                type="text"
                placeholder="Location"
                value={newActivity.location}
                onChange={(e) => setNewActivity({...newActivity, location: e.target.value})}
                className="modal-input"
              />
              <input
                type="url"
                placeholder="Website URL"
                value={newActivity.website_url}
                onChange={(e) => setNewActivity({...newActivity, website_url: e.target.value})}
                className="modal-input"
              />
              <div className="number-row">
                <input
                  type="number"
                  placeholder="Cost ($)"
                  value={newActivity.cost}
                  onChange={(e) => setNewActivity({...newActivity, cost: e.target.value})}
                  className="modal-input"
                  min="0"
                  step="0.01"
                />
                <input
                  type="number"
                  placeholder="Max participants"
                  value={newActivity.max_participants}
                  onChange={(e) => setNewActivity({...newActivity, max_participants: e.target.value})}
                  className="modal-input"
                  min="1"
                />
              </div>
            </div>
            <div className="modal-actions">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingActivity(null);
                  setNewActivity({
                    name: '',
                    description: '',
                    start_date: '',
                    end_date: '',
                    start_time: '',
                    end_time: '',
                    location: '',
                    website_url: '',
                    cost: '',
                    max_participants: ''
                  });
                }}
                className="cancel-btn"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateActivity}
                disabled={addingActivity}
                className={`confirm-btn ${addingActivity ? 'disabled' : ''}`}
              >
                {addingActivity ? 'Updating...' : 'Update Activity'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Duplicate Activity Modal */}
      {showDuplicateModal && duplicatingActivity && (
        <div className="modal-overlay" onClick={() => setShowDuplicateModal(false)}>
          <div className="modal activity-duplicate-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Duplicate Activity: {duplicatingActivity.name}</h3>
            <div className="duplicate-content">
              <p>Create a copy of this activity on a new date:</p>
              <div className="input-group">
                <label>New Date</label>
                <input
                  type="date"
                  value={duplicateDate}
                  onChange={(e) => setDuplicateDate(e.target.value)}
                  className="modal-input"
                  autoFocus
                />
              </div>
              <div className="activity-preview">
                <strong>Activity Details:</strong>
                <p>Name: {duplicatingActivity.name}</p>
                {duplicatingActivity.description && <p>Description: {duplicatingActivity.description}</p>}
                {duplicatingActivity.start_time && (
                  <p>Time: {formatTime(duplicatingActivity.start_time)}
                  {duplicatingActivity.end_time && ` - ${formatTime(duplicatingActivity.end_time)}`}</p>
                )}
                {duplicatingActivity.location && <p>Location: {duplicatingActivity.location}</p>}
              </div>
            </div>
            <div className="modal-actions">
              <button
                onClick={() => {
                  setShowDuplicateModal(false);
                  setDuplicatingActivity(null);
                  setDuplicateDate('');
                }}
                className="cancel-btn"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDuplicate}
                disabled={addingActivity || !duplicateDate}
                className={`confirm-btn ${addingActivity || !duplicateDate ? 'disabled' : ''}`}
              >
                {addingActivity ? 'Duplicating...' : 'Duplicate Activity'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite Activity Modal */}
      {showInviteModal && invitingActivity && (
        <div className="modal-overlay" onClick={() => setShowInviteModal(false)}>
          <div className="modal activity-duplicate-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Invite Others to: {invitingActivity.name}</h3>
            <div className="duplicate-content">
              <div className="activity-preview">
                <strong>Activity Details:</strong>
                <p>Date: {formatDate(invitingActivity.start_date)}</p>
                {invitingActivity.start_time && (
                  <p>Time: {formatTime(invitingActivity.start_time)}
                  {invitingActivity.end_time && ` - ${formatTime(invitingActivity.end_time)}`}</p>
                )}
                {invitingActivity.location && <p>Location: {invitingActivity.location}</p>}
                {invitingActivity.cost && <p>Cost: ${invitingActivity.cost}</p>}
              </div>
              
              <div className="input-group">
                <label>Invitation Message</label>
                <textarea
                  value={invitationMessage}
                  onChange={(e) => setInvitationMessage(e.target.value)}
                  className="modal-textarea"
                  rows={3}
                  placeholder="Add a personal message to your invitation..."
                />
              </div>

              <div className="input-group">
                <strong>Connected Families:</strong>
                {connectedFamilies.length > 0 ? (
                  <div className="connected-families-list">
                    {connectedFamilies.map((connection: any) => (
                      <div key={connection.id} className="family-item">
                        <div className="family-info">
                          <strong>{connection.parent_name}</strong>
                          <span className="family-email">{connection.parent_email}</span>
                          {connection.children?.map((child: any) => (
                            <div key={child.id} className="child-item">
                              👶 {child.name}
                            </div>
                          ))}
                        </div>
                        <button
                          onClick={() => handleSendInvitation(connection.parent_id)}
                          className="confirm-btn"
                          style={{ 
                            background: 'linear-gradient(135deg, #667eea, #764ba2)',
                            padding: '8px 16px',
                            fontSize: '14px'
                          }}
                        >
                          Invite
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: '#666', fontStyle: 'italic' }}>
                    No connected families found. Connect with other parents first to send invitations.
                  </p>
                )}
              </div>
            </div>
            <div className="modal-actions">
              <button
                onClick={() => {
                  setShowInviteModal(false);
                  setInvitingActivity(null);
                  setInvitationMessage('');
                  setConnectedFamilies([]);
                }}
                className="cancel-btn"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChildActivityScreen;