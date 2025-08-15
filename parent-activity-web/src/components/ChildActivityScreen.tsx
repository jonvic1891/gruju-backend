import React, { useState, useEffect } from 'react';
import ApiService from '../services/api';
import { Child, Activity } from '../types';
import TimePickerDropdown from './TimePickerDropdown';
import CalendarDatePicker from './CalendarDatePicker';
import './ChildActivityScreen.css';

interface ChildActivityScreenProps {
  child: Child;
  onBack: () => void;
  onDataChanged?: () => void;
  onNavigateToConnections?: () => void;
  shouldRestoreActivityCreation?: boolean;
}

const ChildActivityScreen: React.FC<ChildActivityScreenProps> = ({ child, onBack, onDataChanged, onNavigateToConnections, shouldRestoreActivityCreation }) => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [invitedActivities, setInvitedActivities] = useState<any[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<any[]>([]);
  const [declinedInvitations, setDeclinedInvitations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState<'main' | 'add-activity' | 'activity-detail' | 'edit-activity' | 'invite-activity'>('main');
  const [calendarView, setCalendarView] = useState<'5day' | '7day'>('5day');
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [invitingActivity, setInvitingActivity] = useState<Activity | null>(null);
  const [connectedFamilies, setConnectedFamilies] = useState<any[]>([]);
  const [invitationMessage, setInvitationMessage] = useState('');
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [isSharedActivity, setIsSharedActivity] = useState(false);
  const [autoNotifyNewConnections, setAutoNotifyNewConnections] = useState(false);
  const [selectedConnectedChildren, setSelectedConnectedChildren] = useState<(number | string)[]>([]);
  const [connectedChildren, setConnectedChildren] = useState<any[]>([]);
  const [pendingConnectionRequests, setPendingConnectionRequests] = useState<any[]>([]);
  const [activityDraft, setActivityDraft] = useState<any>(null);
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
    max_participants: '',
    auto_notify_new_connections: false
  });
  const [addingActivity, setAddingActivity] = useState(false);
  const [activityParticipants, setActivityParticipants] = useState<any>(null);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const apiService = ApiService.getInstance();

  // Get user-specific draft key to prevent cross-user data leakage
  const getDraftKey = () => {
    const currentUser = JSON.parse(localStorage.getItem('userData') || '{}');
    return `activityDraft_${currentUser.id || 'unknown'}`;
  };

  // Save activity draft to localStorage
  const saveActivityDraft = () => {
    const draft = {
      newActivity,
      selectedDates,
      isSharedActivity,
      autoNotifyNewConnections,
      selectedConnectedChildren,
      childId: child.id
    };
    localStorage.setItem(getDraftKey(), JSON.stringify(draft));
    return draft;
  };

  // Restore activity draft from localStorage
  const restoreActivityDraft = () => {
    try {
      const draftStr = localStorage.getItem(getDraftKey());
      if (draftStr) {
        const draft = JSON.parse(draftStr);
        // Only restore if it's for the same child
        if (draft.childId === child.id) {
          setNewActivity(draft.newActivity || {
            name: '',
            description: '',
            start_date: '',
            end_date: '',
            start_time: '',
            end_time: '',
            location: '',
            website_url: '',
            cost: '',
            max_participants: '',
            auto_notify_new_connections: false
          });
          setSelectedDates(draft.selectedDates || []);
          setIsSharedActivity(draft.isSharedActivity || false);
          setAutoNotifyNewConnections(draft.autoNotifyNewConnections || false);
          setSelectedConnectedChildren(draft.selectedConnectedChildren || []);
          setActivityDraft(draft);
          
          // Automatically navigate to add-activity screen when draft is restored
          setTimeout(() => {
            navigateToPage('add-activity');
          }, 100);
          
          return true;
        }
      }
    } catch (error) {
      console.error('Failed to restore activity draft:', error);
    }
    return false;
  };

  // Clear activity draft
  const clearActivityDraft = () => {
    localStorage.removeItem(getDraftKey());
    setActivityDraft(null);
  };

  // Navigate to connections to create new connections
  const handleNavigateToConnections = () => {
    if (onNavigateToConnections) {
      saveActivityDraft();
      onNavigateToConnections();
    }
  };

  // Handle cancel with draft consideration
  const handleCancelActivity = () => {
    if (activityDraft) {
      // If there's a draft, ask if they want to keep it
      const keepDraft = window.confirm(
        'You have a saved draft of this activity. Would you like to keep it for later?\n\n' +
        'Click "OK" to keep the draft, or "Cancel" to discard it.'
      );
      if (!keepDraft) {
        clearActivityDraft();
      }
    }
    
    // Reset form state
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
      max_participants: '',
      auto_notify_new_connections: false
    });
    setSelectedDates([]);
    setIsSharedActivity(false);
    setAutoNotifyNewConnections(false);
    setSelectedConnectedChildren([]);
    
    goBack();
  };

  useEffect(() => {
    console.log('🚀 ChildActivityScreen mounted for child:', child.name);
    console.log('🔗 onNavigateToConnections prop:', !!onNavigateToConnections);
    
    // Clean up any old non-user-specific drafts (security fix)
    localStorage.removeItem('activityDraft');
    
    loadActivities();
    loadConnectedChildren();
    loadPendingConnectionRequests();
    
    // Check if there's a saved draft to restore
    restoreActivityDraft();
  }, [child.id]);

  // Load connections when shared activity is enabled
  useEffect(() => {
    if (isSharedActivity && connectedChildren.length === 0) {
      console.log('🔄 Loading connections because shared activity was enabled...');
      loadConnectedChildren();
      loadPendingConnectionRequests();
    }
  }, [isSharedActivity]);

  // Handle browser back button and internal navigation
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state && event.state.page) {
        setCurrentPage(event.state.page);
      } else {
        // If no state and we're at the main page, go back to children screen
        if (currentPage === 'main') {
          onBack();
        } else {
          setCurrentPage('main');
        }
      }
    };

    // Add event listener for browser back button
    window.addEventListener('popstate', handlePopState);

    // Push initial state for main page
    if (window.history.state === null) {
      window.history.replaceState({ page: 'main', childActivity: true }, '', window.location.href);
    }

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [currentPage, onBack]);

  // Watch for page changes to refresh data when returning to main after viewing invitations
  useEffect(() => {
    if (currentPage === 'main' && sessionStorage.getItem('invitationViewed') === 'true') {
      sessionStorage.removeItem('invitationViewed');
      loadActivities(); // Refresh local activity data to update envelope icons
      onDataChanged?.(); // Refresh parent data
    }
  }, [currentPage, onDataChanged]);

  const loadActivities = async () => {
    try {
      setLoading(true);
      
      console.log('🚀 ChildActivityScreen v2.0 - NEW VERSION WITH UNIFIED ACTIVITIES ENDPOINT');
      console.log(`🔍 DEBUG: Child object:`, {
        id: child.id,
        uuid: child.uuid,
        name: child.name
      });
      
      // Load child's own activities using calendar endpoint to get status change notifications
      // Get date range for current month to load all relevant activities
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const startDate = startOfMonth.toISOString().split('T')[0];
      const endDate = endOfMonth.toISOString().split('T')[0];
      
      console.log(`📅 ChildActivityScreen - Loading activities for date range: ${startDate} to ${endDate}`);
      
      // Load all activities (owned + invited) using the unified activities endpoint
      const activitiesResponse = await apiService.getCalendarActivities(startDate, endDate);
      console.log('🔍 ChildActivityScreen - Activities API Response:', activitiesResponse);
      
      if (activitiesResponse.success && activitiesResponse.data) {
        const allActivities = Array.isArray(activitiesResponse.data) ? activitiesResponse.data : [];
        console.log(`📅 ChildActivityScreen - All activities from API: ${allActivities.length}`, allActivities);
        
        // Filter activities for this specific child using UUIDs for security
        // Include activities where:
        // 1. Child owns the activity (child_uuid matches this child's UUID)
        // 2. Child is invited to the activity (invited_child_uuid matches AND invitation_status is pending/accepted)
        const childActivities = allActivities.filter(activity => {
          const ownsActivity = activity.child_uuid === child.uuid;
          const isInvited = activity.invited_child_uuid === child.uuid && 
                           activity.invitation_status && 
                           activity.invitation_status !== 'none';
          const shouldInclude = ownsActivity || isInvited;
          
          console.log(`🔍 Filtering "${activity.name}" for child ${child.name} (UUID: ${child.uuid}):`);
          console.log(`   - Owns: ${ownsActivity} (${activity.child_uuid} === ${child.uuid})`);
          console.log(`   - Invited: ${isInvited} (${activity.invited_child_uuid} === ${child.uuid}, status: ${activity.invitation_status})`);
          console.log(`   - Include: ${shouldInclude}`);
          
          return shouldInclude;
        });
        
        console.log(`✅ ChildActivityScreen - Filtered activities for ${child.name}: ${childActivities.length}`, childActivities);
        setActivities(childActivities);
      } else {
        console.error('Failed to load activities:', activitiesResponse.error);
        setActivities([]);
      }
      
    } catch (error) {
      console.error('Load activities error:', error);
      setActivities([]);
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
        
        // Close the detail modal and refresh parent data
        navigateToPage('main');
        onDataChanged?.();
      } else {
        alert(`Error: ${response.error || 'Failed to respond to invitation'}`);
      }
    } catch (error) {
      console.error('Failed to respond to invitation:', error);
      alert('Failed to respond to invitation');
    }
  };

  const handleStatusChangeClicked = async (activity: Activity) => {
    // Show participants to see status changes, then mark all as viewed
    try {
      const response = await apiService.getActivityParticipants((activity as any).activity_uuid || (activity as any).uuid);
      
      if (response.success && response.data) {
        setActivityParticipants(response.data);
        
        // Mark all unviewed status changes as viewed for this activity
        // Find the invitation ID from the participants data and mark it as viewed
        if (response.data.participants && response.data.participants.length > 0) {
          const invitationWithStatusChange = response.data.participants.find((p: any) => p.invitation_id);
          if (invitationWithStatusChange && invitationWithStatusChange.invitation_id) {
            await apiService.markStatusChangeAsViewed(invitationWithStatusChange.invitation_id);
          }
        }
        
        // Reload activities to hide the notification icon
        setTimeout(async () => {
          await loadActivities();
        }, 500);
      }
    } catch (error) {
      console.error('Failed to load participants:', error);
    }
  };

  const loadConnectedChildren = async () => {
    try {
      console.log(`🔄 Loading connected children for host child: ${child.name} (ID: ${child.id}, UUID: ${child.uuid})...`);
      const response = await apiService.getConnections();
      console.log('📡 Connections API response:', response);
      if (response.success && response.data) {
        // Get current user info to determine which children are ours vs connected
        const currentUser = JSON.parse(localStorage.getItem('userData') || '{}');
        const currentUsername = currentUser.username;
        console.log('👤 Current user:', currentUsername);
        
        // Extract connected children from connections, BUT ONLY for the specific host child
        const children: any[] = [];
        response.data.forEach((connection: any) => {
          // ✅ SECURITY: Use UUIDs for matching instead of sequential IDs
          // Only include connections where the current child (host child) is involved
          console.log(`🔍 Checking connection: child1_uuid=${connection.child1_uuid}, child2_uuid=${connection.child2_uuid}, host_child_uuid=${child.uuid}`);
          const isChild1Host = connection.child1_uuid === child.uuid;
          const isChild2Host = connection.child2_uuid === child.uuid;
          console.log(`🔍 Host matching: isChild1Host=${isChild1Host}, isChild2Host=${isChild2Host}`);
          
          if (isChild1Host && connection.child2_name && connection.child2_parent_name !== currentUsername) {
            // Host child is child1, so add child2 as the connected child
            children.push({
              id: connection.child2_uuid, // Use UUID as primary ID for security
              uuid: connection.child2_uuid, 
              name: connection.child2_name,
              parentId: connection.child2_parent_id,
              parentName: connection.child2_parent_name,
              connectionId: connection.connection_uuid || connection.id
            });
            console.log(`   ✅ Added connected child: ${connection.child2_name} (connected to host child ${child.name})`);
          } else if (isChild2Host && connection.child1_name && connection.child1_parent_name !== currentUsername) {
            // Host child is child2, so add child1 as the connected child
            children.push({
              id: connection.child1_uuid, // Use UUID as primary ID for security
              uuid: connection.child1_uuid,
              name: connection.child1_name,
              parentId: connection.child1_parent_id,
              parentName: connection.child1_parent_name,
              connectionId: connection.connection_uuid || connection.id
            });
            console.log(`   ✅ Added connected child: ${connection.child1_name} (connected to host child ${child.name})`);
          }
        });
        
        console.log(`✅ Connected children loaded for ${child.name}: ${children.length}`, children);
        setConnectedChildren(children);
      } else {
        console.log('❌ No connected children data or API error');
        setConnectedChildren([]);
      }
    } catch (error) {
      console.error('❌ Failed to load connected children:', error);
      setConnectedChildren([]);
    }
  };

  const loadPendingConnectionRequests = async () => {
    try {
      console.log('🔄 Loading pending connection requests...');
      const response = await apiService.getSentConnectionRequests();
      console.log('📡 Pending connections API response:', response);
      if (response.success && response.data) {
        console.log('✅ Pending connection requests loaded:', response.data.length, response.data);
        setPendingConnectionRequests(response.data);
      } else {
        console.log('❌ No pending connection requests data or API error');
        setPendingConnectionRequests([]);
      }
    } catch (error) {
      console.error('❌ Failed to load pending connection requests:', error);
      setPendingConnectionRequests([]);
    }
  };

  const handleAddActivity = () => {
    // Check if there's already a draft - if not, reset form state
    if (!activityDraft) {
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
        max_participants: '',
        auto_notify_new_connections: false
      });
      setSelectedDates([]);
      setIsSharedActivity(false);
      setAutoNotifyNewConnections(false);
      setSelectedConnectedChildren([]);
    }
    navigateToPage('add-activity');
  };

  const loadActivityParticipants = async (activityId: string) => {
    try {
      setLoadingParticipants(true);
      console.log('🔍 Loading participants for activity ID:', activityId);
      const response = await apiService.getActivityParticipants(activityId);
      console.log('📡 Participants API response:', response);
      if (response.success && response.data) {
        console.log('✅ Participants loaded successfully:', response.data);
        console.log('🏠 Host data:', response.data.host);
        setActivityParticipants(response.data);
      } else {
        console.error('❌ Failed to load activity participants:', response.error);
        setActivityParticipants(null);
      }
    } catch (error) {
      console.error('💥 Error loading activity participants:', error);
      setActivityParticipants(null);
    } finally {
      setLoadingParticipants(false);
    }
  };

  const handleActivityClick = async (activity: Activity) => {
    setSelectedActivity(activity);
    navigateToPage('activity-detail');
    
    // Mark invitation as viewed if this is any type of invitation
    if (activity.isPendingInvitation || activity.isAcceptedInvitation || activity.isDeclinedInvitation) {
      const invitationId = (activity as any).invitation_id || activity.id;
      if (invitationId) {
        try {
          // Call the backend API to mark invitation as viewed
          await apiService.markInvitationAsViewed(invitationId);
          // Set a flag to refresh data when returning from detail view
          sessionStorage.setItem('invitationViewed', 'true');
        } catch (error) {
          console.error('Failed to mark invitation as viewed:', error);
        }
      }
    }
    
    // Populate newActivity state with selected activity data for inline editing
    setNewActivity({
      name: activity.name || '',
      description: activity.description || '',
      start_date: activity.start_date ? activity.start_date.split('T')[0] : '',
      end_date: activity.end_date ? activity.end_date.split('T')[0] : '',
      start_time: activity.start_time || '',
      end_time: activity.end_time || '',
      location: activity.location || '',
      website_url: activity.website_url || '',
      cost: activity.cost ? activity.cost.toString() : '',
      max_participants: activity.max_participants ? activity.max_participants.toString() : '',
      auto_notify_new_connections: (activity as any).auto_notify_new_connections || false
    });

    // Set the auto-notification checkbox state
    setAutoNotifyNewConnections((activity as any).auto_notify_new_connections || false);

    // Initialize selectedDates for calendar picker based on activity dates
    const activityDates: string[] = [];
    if (activity.start_date) {
      const startDate = activity.start_date.split('T')[0];
      activityDates.push(startDate);
      
      // If there's an end date and it's different from start date, add all dates in between
      if (activity.end_date && activity.end_date.split('T')[0] !== startDate) {
        const endDate = activity.end_date.split('T')[0];
        const start = new Date(startDate);
        const end = new Date(endDate);
        const current = new Date(start);
        current.setDate(current.getDate() + 1); // Start from day after start date
        
        while (current <= end) {
          activityDates.push(current.toISOString().split('T')[0]);
          current.setDate(current.getDate() + 1);
        }
      }
    }
    setSelectedDates(activityDates);
    
    // Load participants for any activity that has a real backend activity ID
    console.log('🎯 Activity debug for participants:', {
      name: activity.name,
      id: activity.id,
      activity_id: (activity as any).activity_id,
      isPendingInvitation: activity.isPendingInvitation,
      isAcceptedInvitation: activity.isAcceptedInvitation,
      isDeclinedInvitation: activity.isDeclinedInvitation
    });
    
    // For invitations, we need to get the original activity UUID from the backend
    if (activity.isPendingInvitation || activity.isAcceptedInvitation || activity.isDeclinedInvitation) {
      // For invitations, we need to load participants using the original activity UUID
      // The invitation data should contain the original activity_uuid
      const originalActivityUuid = (activity as any).activity_uuid || (activity as any).uuid;
      console.log('📋 Loading participants for invitation with originalActivityUuid:', originalActivityUuid);
      if (originalActivityUuid && typeof originalActivityUuid === 'string') {
        loadActivityParticipants(originalActivityUuid);
      } else {
        console.error('❌ No valid activity UUID found for invitation:', activity);
        setActivityParticipants(null);
      }
    } else if ((activity as any).activity_uuid) {
      // For regular activities, use the activity UUID directly
      console.log('📋 Loading participants for regular activity with UUID:', (activity as any).activity_uuid);
      loadActivityParticipants((activity as any).activity_uuid);
    } else {
      console.error('❌ No activity ID found for activity:', activity);
      setActivityParticipants(null);
    }
    
    // Load connected children for host activities to show uninvited children
    if (activity.is_host) {
      loadConnectedChildren();
    }
  };

  const handleEditActivity = (activity: Activity) => {
    setEditingActivity(activity);
    // Reset all form state first, then populate with activity data
    setSelectedDates([]);
    setIsSharedActivity(false);
    setAutoNotifyNewConnections(false);
    setSelectedConnectedChildren([]);
    
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
      max_participants: activity.max_participants ? activity.max_participants.toString() : '',
      auto_notify_new_connections: (activity as any).auto_notify_new_connections || false
    });
    setAutoNotifyNewConnections((activity as any).auto_notify_new_connections || false);
    navigateToPage('edit-activity');
  };

  const handleUpdateActivity = async () => {
    if (!selectedActivity || !newActivity.name.trim()) {
      alert('Please enter activity name');
      return;
    }

    if (selectedDates.length === 0) {
      alert('Please select at least one date from the calendar');
      return;
    }

    setAddingActivity(true);
    try {
      const originalDate = selectedActivity.start_date.split('T')[0];
      const selectedDatesSorted = [...selectedDates].sort();
      const firstSelectedDate = selectedDatesSorted[0];

      // Base activity data (without dates)
      const baseActivityData = {
        name: newActivity.name,
        description: newActivity.description,
        start_time: newActivity.start_time,
        end_time: newActivity.end_time,
        location: newActivity.location,
        website_url: newActivity.website_url,
        cost: newActivity.cost ? parseFloat(newActivity.cost) : undefined,
        max_participants: newActivity.max_participants ? parseInt(newActivity.max_participants) : undefined,
        auto_notify_new_connections: isSharedActivity ? autoNotifyNewConnections : false
      };

      // Update the original activity with the first selected date
      const mainActivityData = {
        ...baseActivityData,
        start_date: firstSelectedDate,
        end_date: firstSelectedDate
      };

      const response = await apiService.updateActivity(selectedActivity.id, mainActivityData);
      
      if (response.success) {
        let successMessage = 'Activity updated successfully!';
        let additionalActivitiesCreated = 0;

        // If there are additional dates selected, create new activities for them
        if (selectedDatesSorted.length > 1) {
          for (let i = 1; i < selectedDatesSorted.length; i++) {
            const additionalDate = selectedDatesSorted[i];
            const additionalActivityData = {
              ...baseActivityData,
              start_date: additionalDate,
              end_date: additionalDate
            };

            try {
              const createResponse = await apiService.createActivity(child.id, additionalActivityData);
              if (createResponse.success) {
                additionalActivitiesCreated++;
              }
            } catch (error) {
              console.error(`Failed to create activity for ${additionalDate}:`, error);
            }
          }
          
          if (additionalActivitiesCreated > 0) {
            successMessage += ` ${additionalActivitiesCreated} additional activity${additionalActivitiesCreated > 1 ? 'ies' : 'y'} created for other selected dates.`;
          }
        }

        alert(successMessage);
        loadActivities(); // Reload activities to reflect changes
        navigateToPage('main'); // Go back to main page
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
          navigateToPage('main');
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
          max_participants: newActivity.max_participants ? parseInt(newActivity.max_participants) : undefined,
          auto_notify_new_connections: isSharedActivity ? autoNotifyNewConnections : false
        };

        const response = await apiService.createActivity(child.id, activityData);
        
        if (response.success) {
          createdActivities.push(response.data);
        } else {
          console.error(`Failed to create activity for ${date}:`, response.error);
        }
      }

      // Track pending connections for each created activity
      if (isSharedActivity && createdActivities.length > 0) {
        const pendingConnections = selectedConnectedChildren.filter(id => 
          typeof id === 'string' && id.startsWith('pending-')
        ) as string[];
        
        if (pendingConnections.length > 0) {
          for (const activity of createdActivities) {
            try {
              // Store pending invitations for this activity
              await apiService.createPendingInvitations(activity.id, pendingConnections);
              console.log(`📝 Stored ${pendingConnections.length} pending invitations for activity "${activity.name}"`);
            } catch (error) {
              console.error('Failed to store pending invitations:', error);
            }
          }
        }
      }

      // If it's a shared activity, send invitations to selected connected children
      if (isSharedActivity && selectedConnectedChildren.length > 0 && createdActivities.length > 0) {
        for (const activity of createdActivities) {
          for (const childId of selectedConnectedChildren) {
            try {
              // Skip pending connections for now - they'll be invited when connections are accepted
              if (typeof childId === 'string' && childId.startsWith('pending-')) {
                console.log('Skipping pending connection invitation:', childId);
                continue;
              }
              
              // Find the connected child data to get the parent ID
              const connectedChild = connectedChildren.find(cc => cc.id === childId);
              if (connectedChild && typeof childId === 'number') {
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
        max_participants: '',
        auto_notify_new_connections: false
      });
      setSelectedDates([]);
      setIsSharedActivity(false);
      setAutoNotifyNewConnections(false);
      setSelectedConnectedChildren([]);
      clearActivityDraft(); // Clear the saved draft after successful creation
      navigateToPage('main');
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
        navigateToPage('invite-activity');
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
        navigateToPage('main');
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

  const handleInviteSpecificChild = async (activity: Activity, child: any) => {
    try {
      const response = await apiService.sendActivityInvitation(
        activity.id,
        child.parentId,
        child.id,
        `Hi! I'd like to invite ${child.name} to join us for "${activity.name}" on ${formatDate(activity.start_date)}. Let me know if you're interested!`
      );
      
      if (response.success) {
        alert(`Invitation sent to ${child.name}!`);
        // Reload participants to show the new invitation
        if (activityParticipants) {
          loadActivityParticipants((activity as any).activity_uuid);
        }
      } else {
        alert(`Failed to send invitation: ${response.error}`);
      }
    } catch (error) {
      console.error('Send invitation error:', error);
      alert('Failed to send invitation');
    }
  };

  const handleHostCantAttend = async (activity: Activity) => {
    if (!window.confirm('Are you sure you can\'t attend this activity? The activity will remain active for invited children, but will be marked that you can\'t attend.')) {
      return;
    }

    try {
      // Instead of deleting, we'll mark the host as can't attend
      // This would require a backend endpoint to update host attendance status
      // For now, we'll show an alert about the feature
      alert('This feature will be implemented to mark you as unable to attend while keeping the activity active for invited children.');
      
      // TODO: Implement backend endpoint for host can't attend
      // const response = await apiService.markHostCantAttend(activity.id);
      // if (response.success) {
      //   loadActivities();
      //   setCurrentPage('main');
      // }
    } catch (error) {
      console.error('Host can\'t attend error:', error);
      alert('Failed to update attendance status');
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
    // Green for pending shared activities (receiver sees new invitation)
    if (activity.is_shared === true && activity.invitation_status === 'pending') {
      return {
        background: 'linear-gradient(135deg, #48bb78, #68d391)',
        borderColor: '#38a169'
      };
    }
    
    // Light blue for accepted invitations (guest perspective - accepted invitation)
    if (activity.is_host === false && activity.invitation_status === 'accepted') {
      return {
        background: 'linear-gradient(135deg, #4299e1, #63b3ed)',
        borderColor: '#3182ce'
      };
    }
    
    // Grey for declined invitations (guest perspective - declined invitation)
    if (activity.is_host === false && activity.invitation_status === 'declined') {
      return {
        background: 'linear-gradient(135deg, #a0aec0, #cbd5e0)',
        borderColor: '#718096'
      };
    }
    
    // Light blue for host's shared activities (host perspective - shareable activity)
    if (activity.is_host === true && activity.is_shared === true) {
      return {
        background: 'linear-gradient(135deg, #4299e1, #63b3ed)',
        borderColor: '#3182ce'
      };
    }
    
    // Dark blue for host's private activities (default)
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
        showAcceptedIcon: !invitation.viewed_at, // Only show green tick if not viewed
        invitationId: invitation.invitation_id,
        hostParent: invitation.host_parent_username,
        host_child_name: invitation.host_child_name,
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
        isPendingInvitation: true, // Always true for pending invitations (for color)
        showEnvelope: !invitation.viewed_at, // Only show envelope if not viewed
        invitationId: invitation.invitation_id,
        hostParent: invitation.host_parent_username,
        host_child_name: invitation.host_child_name,
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
        showDeclinedIcon: !invitation.viewed_at, // Only show red cross if not viewed
        invitationId: invitation.invitation_id,
        hostParent: invitation.host_parent_username,
        host_child_name: invitation.host_child_name,
        host_parent_name: invitation.host_parent_username
      }));
      
      // Since activities now come with is_shared property from backend, just use them directly
      // and add any invitation-only activities that don't have corresponding activities
      const invitationOnlyActivities = [
        ...dayInvitedActivities.filter(inv => !dayActivities.some(act => act.id === inv.id)).map(invitation => ({
          ...invitation,
          id: `accepted-${invitation.id}`,
          activity_id: invitation.id,
          name: invitation.activity_name,
          description: invitation.activity_description,
          isAcceptedInvitation: true,
          showAcceptedIcon: !invitation.viewed_at,
          invitationId: invitation.invitation_id,
          host_child_name: invitation.host_child_name,
          host_parent_name: invitation.host_parent_username,
          is_shared: true
        })),
        ...dayPendingInvitations.filter(inv => !dayActivities.some(act => act.id === inv.id)).map(invitation => ({
          ...invitation,
          id: `invitation-${invitation.id}`,
          activity_id: invitation.id,
          name: invitation.activity_name,
          description: invitation.activity_description,
          isPendingInvitation: true,
          showEnvelope: !invitation.viewed_at,
          invitationId: invitation.invitation_id,
          host_child_name: invitation.host_child_name,
          host_parent_name: invitation.host_parent_username
        })),
        ...dayDeclinedInvitations.filter(inv => !dayActivities.some(act => act.id === inv.id)).map(invitation => ({
          ...invitation,
          id: `declined-${invitation.id}`,
          activity_id: invitation.id,
          name: invitation.activity_name,
          description: invitation.activity_description,
          isDeclinedInvitation: true,
          showDeclinedIcon: !invitation.viewed_at,
          invitationId: invitation.invitation_id,
          host_child_name: invitation.host_child_name,
          host_parent_name: invitation.host_parent_username
        }))
      ];
      
      // Combine activities (which already have is_shared from backend) with any invitation-only activities
      const allDayItems = [...dayActivities, ...invitationOnlyActivities];
      
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

  // Page navigation function

  const navigateToPage = (page: typeof currentPage) => {
    if (page !== currentPage) {
      // If returning to main and an invitation was viewed, refresh both local and parent data
      if (page === 'main' && sessionStorage.getItem('invitationViewed') === 'true') {
        sessionStorage.removeItem('invitationViewed');
        loadActivities(); // Refresh local activity data to update envelope icons
        onDataChanged?.(); // Refresh parent data
      }
      
      setCurrentPage(page);
      // Push new state to history
      window.history.pushState({ page }, '', window.location.href);
    }
  };

  const goBack = () => {
    // Use browser's back functionality
    window.history.back();
  };

  // Render different pages based on currentPage state
  if (currentPage === 'activity-detail' && selectedActivity) {
    return (
      <div className="child-activity-screen">
        <div className="activity-header">
          <div className="child-info">
            <h2>Activity Details</h2>
          </div>
        </div>
        <div className="page-content">
          <div className="activity-detail-content">
            {((selectedActivity as any).isPendingInvitation || (selectedActivity as any).isAcceptedInvitation || (selectedActivity as any).isDeclinedInvitation) && (
              <div className="invitation-info">
                <div className="detail-item">
                  <strong>Invitation from:</strong>
                  <p>👤 {selectedActivity.host_child_name || selectedActivity.child_name}</p>
                </div>
                <div className="detail-item">
                  <strong>Status:</strong>
                  <p>
                    {(selectedActivity as any).isPendingInvitation && <span style={{ color: '#48bb78' }}>📩 Pending</span>}
                    {(selectedActivity as any).isAcceptedInvitation && <span style={{ color: '#4299e1' }}>✅ Accepted</span>}
                    {(selectedActivity as any).isDeclinedInvitation && <span style={{ color: '#a0aec0' }}>❌ Declined</span>}
                  </p>
                </div>
                {selectedActivity.invitation_message && (
                  <div className="detail-item">
                    <strong>Message:</strong>
                    <p style={{ fontStyle: 'italic' }}>"{selectedActivity.invitation_message}"</p>
                  </div>
                )}
              </div>
            )}
            
            {/* Activity Details Form - Always Editable for Host */}
            <div className="activity-details-form">
              <div className="form-row">
                <label><strong>Activity Name:</strong></label>
                {selectedActivity.is_host && !(selectedActivity as any).isPendingInvitation && !(selectedActivity as any).isAcceptedInvitation && !(selectedActivity as any).isDeclinedInvitation ? (
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
                {selectedActivity.is_host && !(selectedActivity as any).isPendingInvitation && !(selectedActivity as any).isAcceptedInvitation && !(selectedActivity as any).isDeclinedInvitation ? (
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

              {/* Date Selection Section */}
              {selectedActivity.is_host && !(selectedActivity as any).isPendingInvitation && !(selectedActivity as any).isAcceptedInvitation && !(selectedActivity as any).isDeclinedInvitation ? (
                <div className="date-selection-section">
                  <label className="section-label">Select Activity Dates</label>
                  <p className="section-description">Click dates to select/deselect them. You can choose multiple dates for recurring activities.</p>
                  <CalendarDatePicker
                    selectedDates={selectedDates}
                    onChange={setSelectedDates}
                    minDate={new Date().toISOString().split('T')[0]}
                  />
                </div>
              ) : (
                <div className="form-row">
                  <label><strong>Activity Dates:</strong></label>
                  <span className="readonly-value">
                    📅 {formatDate(selectedActivity.start_date)}
                    {selectedActivity.end_date && selectedActivity.end_date.split('T')[0] !== selectedActivity.start_date.split('T')[0] && 
                      ` - ${formatDate(selectedActivity.end_date)}`
                    }
                  </span>
                </div>
              )}

              <div className="form-row-group">
                <div className="form-row">
                  <label><strong>Start Time:</strong></label>
                  {selectedActivity.is_host && !(selectedActivity as any).isPendingInvitation && !(selectedActivity as any).isAcceptedInvitation && !(selectedActivity as any).isDeclinedInvitation ? (
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
                  {selectedActivity.is_host && !(selectedActivity as any).isPendingInvitation && !(selectedActivity as any).isAcceptedInvitation && !(selectedActivity as any).isDeclinedInvitation ? (
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
                {selectedActivity.is_host && !(selectedActivity as any).isPendingInvitation && !(selectedActivity as any).isAcceptedInvitation && !(selectedActivity as any).isDeclinedInvitation ? (
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
                {selectedActivity.is_host && !(selectedActivity as any).isPendingInvitation && !(selectedActivity as any).isAcceptedInvitation && !(selectedActivity as any).isDeclinedInvitation ? (
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
                  {selectedActivity.is_host && !(selectedActivity as any).isPendingInvitation && !(selectedActivity as any).isAcceptedInvitation && !(selectedActivity as any).isDeclinedInvitation ? (
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
                  {selectedActivity.is_host && !(selectedActivity as any).isPendingInvitation && !(selectedActivity as any).isAcceptedInvitation && !(selectedActivity as any).isDeclinedInvitation ? (
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
                      <p>👤 <strong>{activityParticipants.host?.host_child_name || 'Unknown Host'} (Host)</strong></p>
                    </div>
                    {activityParticipants.participants?.length > 0 ? (
                      <div className="invited-participants">
                        <h4>Invited Children:</h4>
                        {(() => {
                          const validParticipants = activityParticipants.participants.filter((participant: any) => participant.child_name && participant.child_id);
                          return validParticipants.length > 0 ? validParticipants.map((participant: any, index: number) => (
                            <div key={index} className="participant-item">
                              <div className="participant-info">
                                <span className="participant-name">👤 {participant.child_name}</span>
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
                          )) : (
                            <p style={{ fontSize: '14px', color: '#666', fontStyle: 'italic' }}>
                              No other children invited yet
                            </p>
                          );
                        })()}
                      </div>
                    ) : (
                      <p style={{ fontSize: '14px', color: '#666', fontStyle: 'italic' }}>
                        No other children invited yet
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
            
            {/* Show uninvited connected children for host activities */}
            {selectedActivity.is_host && !(selectedActivity as any).isPendingInvitation && !(selectedActivity as any).isAcceptedInvitation && !(selectedActivity as any).isDeclinedInvitation && (
              <div className="uninvited-children-section">
                <div className="detail-item">
                  <strong>Invite More Children:</strong>
                  {loadingParticipants ? (
                    <p>Loading connections...</p>
                  ) : connectedChildren.length > 0 ? (
                    <div className="uninvited-children-list">
                      {connectedChildren
                        .filter(child => !activityParticipants?.participants?.some((p: any) => p.child_id === child.id && p.child_name && p.child_id))
                        .map((child: any, index: number) => (
                          <div key={index} className="uninvited-child-item">
                            <div className="participant-info">
                              <span className="child-name">👤 {child.name}</span>
                            </div>
                            <button
                              onClick={() => handleInviteSpecificChild(selectedActivity, child)}
                              className="invite-child-btn"
                            >
                              📩 Invite
                            </button>
                          </div>
                        ))}
                      {connectedChildren.filter(child => !activityParticipants?.participants?.some((p: any) => p.child_id === child.id && p.child_name && p.child_id)).length === 0 && (
                        <p style={{ fontSize: '14px', color: '#666', fontStyle: 'italic' }}>
                          All connected children have already been invited
                        </p>
                      )}
                    </div>
                  ) : (
                    <p style={{ fontSize: '14px', color: '#666', fontStyle: 'italic' }}>
                      No connected children found. Connect with other families first to invite their children.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="page-actions">
            <button
              onClick={goBack}
              className="cancel-btn"
            >
              Close
            </button>
            
            {/* Show accept/decline buttons for pending invitations */}
            {(selectedActivity as any).isPendingInvitation && (selectedActivity as any).invitationId && (
              <>
                <button
                  onClick={() => handleInvitationResponse((selectedActivity as any).invitationId!, 'accept')}
                  className="confirm-btn"
                  style={{ background: 'linear-gradient(135deg, #48bb78, #68d391)', marginRight: '8px' }}
                >
                  ✅ Accept Invitation
                </button>
                <button
                  onClick={() => handleInvitationResponse((selectedActivity as any).invitationId!, 'reject')}
                  className="delete-btn"
                >
                  ❌ Decline Invitation
                </button>
              </>
            )}
            
            {/* Show decline button for accepted invitations */}
            {(selectedActivity as any).isAcceptedInvitation && (selectedActivity as any).invitationId && (
              <button
                onClick={() => handleInvitationResponse((selectedActivity as any).invitationId!, 'reject')}
                className="delete-btn"
                style={{ background: 'linear-gradient(135deg, #e53e3e, #fc8181)', color: 'white' }}
              >
                ❌ Change to Declined
              </button>
            )}
            
            {/* Show enhanced buttons for activity host */}
            {selectedActivity.is_host && !(selectedActivity as any).isPendingInvitation && !(selectedActivity as any).isAcceptedInvitation && !(selectedActivity as any).isDeclinedInvitation && (
              <>
                <button
                  onClick={handleUpdateActivity}
                  className="confirm-btn"
                  style={{ background: 'linear-gradient(135deg, #28a745, #34ce57)' }}
                >
                  💾 Save Changes
                </button>
                <button
                  onClick={() => handleHostCantAttend(selectedActivity)}
                  className="delete-btn"
                  style={{ background: 'linear-gradient(135deg, #ff8c00, #ffa500)' }}
                >
                  😞 Can't Attend
                </button>
              </>
            )}
            
            {/* For non-host activities, show informational text */}
            {!selectedActivity.is_host && !(selectedActivity as any).isPendingInvitation && !(selectedActivity as any).isAcceptedInvitation && !(selectedActivity as any).isDeclinedInvitation && (
              <div className="host-info">
                <p style={{ fontSize: '14px', color: '#666', fontStyle: 'italic' }}>
                  Only the activity host can edit this activity
                </p>
              </div>
            )}
            
            {/* For declined invitations, show informational text */}
            {(selectedActivity as any).isDeclinedInvitation && (
              <div className="declined-info">
                <p style={{ fontSize: '14px', color: '#666', fontStyle: 'italic' }}>
                  This invitation has been declined. Contact the host if you'd like to reconsider.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (currentPage === 'add-activity') {
    return (
      <div className="child-activity-screen">
        <div className="activity-header">
          <div className="child-info">
            <h2>Add New Activity for {child.name}</h2>
          </div>
        </div>
        <div className="page-content">
          {activityDraft && (
            <div className="draft-notification" style={{
              background: 'linear-gradient(135deg, #48bb78, #68d391)',
              color: 'white',
              padding: '12px',
              borderRadius: '8px',
              marginBottom: '16px',
              textAlign: 'center'
            }}>
              📝 <strong>Draft Restored:</strong> Your activity details have been saved and restored from when you went to create connections.
              <button 
                onClick={clearActivityDraft}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  color: 'white',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  marginLeft: '8px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                Clear Draft
              </button>
            </div>
          )}
          <div className="page-form">
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
                  🌐 Shared (Invite connected children)
                  {!isSharedActivity && connectedChildren.length === 0 && pendingConnectionRequests.length === 0 && (
                    <span style={{ 
                      fontSize: '12px', 
                      color: '#667eea', 
                      fontStyle: 'italic',
                      marginLeft: '8px' 
                    }}>
                      - Select to create connections
                    </span>
                  )}
                </label>
              </div>
              
              {isSharedActivity && (
                <div className="connected-children-section">
                  <div className="children-selection-header">
                    <label>Invite Children:</label>
                    {(connectedChildren.length > 0 || pendingConnectionRequests.length > 0) && (
                      <div className="selection-controls">
                        <button
                          type="button"
                          onClick={() => {
                            const allConnectedIds = connectedChildren.map(child => child.id);
                            const allPendingIds = pendingConnectionRequests.map(request => `pending-${request.id}`);
                            const allIds = [...allConnectedIds, ...allPendingIds];
                            
                            const allSelected = allIds.every(id => selectedConnectedChildren.includes(id));
                            if (allSelected) {
                              setSelectedConnectedChildren([]);
                            } else {
                              setSelectedConnectedChildren(allIds);
                            }
                          }}
                          className="select-all-btn"
                        >
                          {(() => {
                            const allConnectedIds = connectedChildren.map(child => child.id);
                            const allPendingIds = pendingConnectionRequests.map(request => `pending-${request.id}`);
                            const allIds = [...allConnectedIds, ...allPendingIds];
                            const allSelected = allIds.every(id => selectedConnectedChildren.includes(id));
                            const totalCount = connectedChildren.length + pendingConnectionRequests.length;
                            return allSelected ? 'Deselect All' : 'Select All';
                          })()} ({connectedChildren.length + pendingConnectionRequests.length})
                        </button>
                      </div>
                    )}
                  </div>
                  {connectedChildren.length === 0 && pendingConnectionRequests.length === 0 ? (
                    <div className="no-connections">
                      <p><strong>No connections found.</strong></p>
                      <p style={{ fontSize: '14px', color: '#666', marginBottom: '12px' }}>
                        To invite other children to this activity, you'll need to connect with their families first.
                      </p>
                      {onNavigateToConnections ? (
                        <button
                          type="button"
                          onClick={handleNavigateToConnections}
                          className="connection-nav-btn"
                          style={{
                            background: 'linear-gradient(135deg, #667eea, #764ba2)',
                            color: 'white',
                            border: 'none',
                            padding: '10px 20px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: 'bold',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                          }}
                        >
                          🔗 Create Connections Now
                        </button>
                      ) : (
                        <div style={{ 
                          background: '#f8f9fa', 
                          padding: '8px 12px', 
                          borderRadius: '6px',
                          fontSize: '12px',
                          color: '#666'
                        }}>
                          Navigation to connections not available. Please go to the Connections tab manually.
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="children-list">
                      {/* Confirmed connections */}
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
                          ✅ {connectedChild.name}
                        </label>
                      ))}
                      
                      {/* Pending connection requests */}
                      {pendingConnectionRequests.map((request) => (
                        <label key={`pending-${request.id}`} className="child-checkbox" style={{ opacity: 0.7 }}>
                          <input
                            type="checkbox"
                            checked={selectedConnectedChildren.includes(`pending-${request.id}`)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedConnectedChildren([...selectedConnectedChildren, `pending-${request.id}`]);
                              } else {
                                setSelectedConnectedChildren(
                                  selectedConnectedChildren.filter(id => id !== `pending-${request.id}`)
                                );
                              }
                            }}
                          />
                          ⏳ {request.target_child_name} - <em style={{ fontSize: '12px' }}>pending connection</em>
                        </label>
                      ))}
                      
                      {connectedChildren.length === 0 && pendingConnectionRequests.length > 0 && (
                        <p style={{ fontSize: '14px', color: '#666', fontStyle: 'italic', marginTop: '12px' }}>
                          You can select pending connections above. They'll be invited automatically when they accept your connection request.
                          <br />
                          {onNavigateToConnections && (
                            <button
                              type="button"
                              onClick={handleNavigateToConnections}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#667eea',
                                textDecoration: 'underline',
                                cursor: 'pointer',
                                fontSize: '14px',
                                marginTop: '4px'
                              }}
                            >
                              Send more connection requests
                            </button>
                          )}
                        </p>
                      )}
                    </div>
                  )}
                  
                  {/* Auto-notification setting for shared activities */}
                  <div className="auto-notify-section">
                    <label className="auto-notify-checkbox">
                      <input
                        type="checkbox"
                        checked={autoNotifyNewConnections}
                        onChange={(e) => setAutoNotifyNewConnections(e.target.checked)}
                      />
                      <span>Auto-notify new connections about this activity</span>
                    </label>
                    <p className="auto-notify-description">
                      When you accept new connection requests in the future, automatically send them invitations for this activity (if it's still upcoming).
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="page-actions">
            <button
              onClick={handleCancelActivity}
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
    );
  }

  if (currentPage === 'edit-activity' && editingActivity) {
    return (
      <div className="child-activity-screen">
        <div className="activity-header">
          <div className="child-info">
            <h2>Edit Activity: {editingActivity.name}</h2>
          </div>
        </div>
        <div className="page-content">
          <div className="page-form">
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
          </div>
          <div className="page-actions">
            <button
              onClick={() => {
                goBack();
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
                  max_participants: '',
                  auto_notify_new_connections: false
                });
                setAutoNotifyNewConnections(false);
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
    );
  }

  if (currentPage === 'invite-activity' && invitingActivity) {
    return (
      <div className="child-activity-screen">
        <div className="activity-header">
          <div className="child-info">
            <h2>Invite Others to: {invitingActivity.name}</h2>
          </div>
        </div>
        <div className="page-content">
          <div className="duplicate-content">
            <div className="activity-preview">
              <strong>Activity Details:</strong>
              <p>📅 {formatDate(invitingActivity.start_date)} {invitingActivity.start_time && `🕐 ${formatTime(invitingActivity.start_time)}${invitingActivity.end_time ? ` - ${formatTime(invitingActivity.end_time)}` : ''}`}</p>
              {invitingActivity.location && <p>📍 {invitingActivity.location}</p>}
              {invitingActivity.cost && <p>💰 ${invitingActivity.cost}</p>}
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
              <strong>Connected Children:</strong>
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
                  No connected children found. Connect with other parents first to send invitations.
                </p>
              )}
            </div>
          </div>
          <div className="page-actions">
            <button
              onClick={() => {
                goBack();
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
    );
  }

  // Main page
  return (
    <div className="child-activity-screen">
      <div className="activity-header">
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
                            background: colors.background
                          }}
                          onClick={() => handleActivityClick(activity)}
                        >
                          <div className="activity-content">
                            <div className="activity-time">
                              {activity.start_time ? formatTime(activity.start_time) : 'All day'}
                            </div>
                            <div className="activity-name">
                              {activity.name}
                            </div>
                          </div>
                          {(activity.isPendingInvitation || activity.isAcceptedInvitation || activity.isDeclinedInvitation) && (
                            <div className="activity-footer">
                              {activity.isPendingInvitation && activity.showEnvelope !== false && <span className="notification-icon">📩</span>}
                              {activity.isAcceptedInvitation && (activity as any).showAcceptedIcon && <span className="notification-icon">✅</span>}
                              {activity.isDeclinedInvitation && (activity as any).showDeclinedIcon && <span className="notification-icon">❌</span>}
                            </div>
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
        {(() => {
          // Get all activities from calendar view (same logic as generateWeekDays)
          const weekDays = generateWeekDays();
          const allWeekActivities = weekDays.flatMap(day => day.activities);
          
          return allWeekActivities.length > 0 ? (
            <div className="activities-grid">
              {allWeekActivities
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
                      borderLeftColor: colors.borderColor,
                      background: colors.background
                    }}
                    onClick={() => {
                      handleActivityClick(activity);
                    }}
                  >
                    <div className="activity-card-header">
                      <h4 className="activity-name">{activity.name}</h4>
                      {(activity.isPendingInvitation || activity.isAcceptedInvitation || activity.isDeclinedInvitation || (activity as any).unviewed_status_changes > 0) && (
                        <div className="activity-status">
                          {activity.isPendingInvitation && activity.showEnvelope !== false && <span className="status-icon">📩</span>}
                          {activity.isAcceptedInvitation && (activity as any).showAcceptedIcon && <span className="status-icon">✅</span>}
                          {activity.isDeclinedInvitation && (activity as any).showDeclinedIcon && <span className="status-icon">❌</span>}
                          {/* Status change notifications for host's own activities */}
                          {(activity as any).unviewed_status_changes > 0 && (activity as any).unviewed_statuses && (
                            <>
                              {(activity as any).unviewed_statuses.includes('accepted') && (
                                <span 
                                  className="status-icon" 
                                  onClick={() => handleStatusChangeClicked(activity)}
                                  style={{ cursor: 'pointer' }}
                                  title="New accepted invitation - click to view"
                                >
                                  ✅
                                </span>
                              )}
                              {(activity as any).unviewed_statuses.includes('declined') && (
                                <span 
                                  className="status-icon" 
                                  onClick={() => handleStatusChangeClicked(activity)}
                                  style={{ cursor: 'pointer' }}
                                  title="New declined invitation - click to view"
                                >
                                  ❌
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                    {activity.description && (
                      <p className="activity-description">{activity.description}</p>
                    )}
                    <div className="activity-details">
                      <div>{formatDate(activity.start_date)}{activity.start_time && ` ${formatTime(activity.start_time)}${activity.end_time ? ` - ${formatTime(activity.end_time)}` : ''}`}</div>
                      {activity.location && <div>{activity.location}</div>}
                      {activity.cost && <div>${activity.cost}</div>}
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
        );
        })()}
      </div>
    </div>
  );
};

export default ChildActivityScreen;