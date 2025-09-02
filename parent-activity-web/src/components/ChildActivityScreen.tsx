import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
// React Router hooks removed for navigation - but need useLocation for URL params
import ApiService from '../services/api';
import { Child, Activity } from '../types';
import TimePickerDropdown from './TimePickerDropdown';
import CalendarDatePicker from './CalendarDatePicker';
import './ChildActivityScreen.css';

interface ChildActivityScreenProps {
  child: Child;
  onBack: () => void;
  onDataChanged?: () => void;
  onNavigateToConnections?: (isInActivityCreation?: boolean) => void;
  onNavigateToActivity?: (child: Child, activity: any) => void;
  initialActivityUuid?: string;
  shouldRestoreActivityCreation?: boolean;
}

const ChildActivityScreen: React.FC<ChildActivityScreenProps> = ({ child, onBack, onDataChanged, onNavigateToConnections, onNavigateToActivity, initialActivityUuid, shouldRestoreActivityCreation }) => {
  const location = useLocation();
  
  // Parse URL parameters for initial calendar view and date
  const urlParams = new URLSearchParams(location.search);
  const initialView = urlParams.get('view') === 'week' ? '7day' : '5day';
  const initialDate = urlParams.get('date');
  
  const [activities, setActivities] = useState<Activity[]>([]);
  const [invitedActivities, setInvitedActivities] = useState<any[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<any[]>([]);
  const [currentDateRange, setCurrentDateRange] = useState<{startDate: string, endDate: string} | null>(null);
  const [declinedInvitations, setDeclinedInvitations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState<'main' | 'add-activity' | 'activity-detail' | 'edit-activity' | 'invite-activity'>('main');
  const [calendarView, setCalendarView] = useState<'5day' | '7day'>(initialView);
  const [currentWeek, setCurrentWeek] = useState(() => {
    if (initialDate) {
      return new Date(initialDate);
    }
    return new Date();
  });
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [invitingActivity, setInvitingActivity] = useState<Activity | null>(null);
  const [connectedFamilies, setConnectedFamilies] = useState<any[]>([]);
  const [invitationMessage, setInvitationMessage] = useState('');
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [isRecurringActivity, setIsRecurringActivity] = useState(false);
  const [recurringDaysOfWeek, setRecurringDaysOfWeek] = useState<number[]>([]);
  const [recurringStartDate, setRecurringStartDate] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteDialogActivity, setDeleteDialogActivity] = useState<Activity | null>(null);
  const [isSharedActivity, setIsSharedActivity] = useState(false);
  const [autoNotifyNewConnections, setAutoNotifyNewConnections] = useState(false);
  const [selectedConnectedChildren, setSelectedConnectedChildren] = useState<(number | string)[]>([]);
  const [jointHostChildren, setJointHostChildren] = useState<string[]>([]); // UUIDs of additional host children
  const [connectedChildren, setConnectedChildren] = useState<any[]>([]);
  const [parentChildren, setParentChildren] = useState<any[]>([]);
  const [jointHostConnections, setJointHostConnections] = useState<{ [childUuid: string]: any[] }>({});
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
  const [invitationData, setInvitationData] = useState<any>(null);
  
  // Activity Templates
  const [activityTemplates, setActivityTemplates] = useState<any[]>([]);
  const [activityTypes, setActivityTypes] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [pendingTemplateData, setPendingTemplateData] = useState<any>(null);
  const [templateConfirmationMessage, setTemplateConfirmationMessage] = useState<string>('');
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [templateDialogMessage, setTemplateDialogMessage] = useState('');
  const [dialogTemplateData, setDialogTemplateData] = useState<any>(null);
  
  const apiService = ApiService.getInstance();

  // Template dialog handlers  
  const handleTemplateYes = async () => {
    if (!dialogTemplateData) return;
    
    console.log('🎯 Attempting to save template:', dialogTemplateData);
    try {
      const templateResponse = await apiService.createActivityTemplate(dialogTemplateData);
      console.log('📡 Template API response:', templateResponse);
      if (templateResponse.success) {
        console.log('✅ Template saved successfully:', templateResponse.data);
        await loadActivityTemplates();
      } else {
        console.error('❌ Failed to save template:', templateResponse.error);
        alert(`Failed to save template: ${templateResponse.error}`);
      }
    } catch (templateError: any) {
      console.error('💥 Error saving template:', templateError);
      alert(`Error saving template: ${templateError?.message || 'Unknown error'}`);
    }
    
    // Close dialog
    setShowTemplateDialog(false);
    setTemplateDialogMessage('');
    setDialogTemplateData(null);
    
    // Navigate back to activities list after template saved
    console.log('🏠 Template dialog completed (Yes), navigating back to main activities list');
    // Force refresh when returning to calendar
    setCurrentDateRange(null);
    if (onBack) {
      console.log('🔙 Using onBack to return to main activities URL');
      onBack();
    } else {
      console.log('📝 Using navigateToPage as fallback');
      navigateToPage('main');
    }
  };

  const handleTemplateNo = () => {
    // Close dialog
    setShowTemplateDialog(false);
    setTemplateDialogMessage('');
    setDialogTemplateData(null);
    
    // Navigate back to activities list after declining template
    console.log('🏠 Template dialog completed (No), navigating back to main activities list');
    // Force refresh when returning to calendar
    setCurrentDateRange(null);
    if (onBack) {
      console.log('🔙 Using onBack to return to main activities URL');
      onBack();
    } else {
      console.log('📝 Using navigateToPage as fallback');
      navigateToPage('main');
    }
  };

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
      jointHostChildren,
      childUuid: child.uuid
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
        if (draft.childUuid === child.uuid) {
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
          setJointHostChildren(draft.jointHostChildren || []);
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
      onNavigateToConnections(true); // Pass true to indicate this is from activity creation
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
    setJointHostChildren([]);
    setSelectedTemplate(null);
    setPendingTemplateData(null);
    
    goBack();
  };

  useEffect(() => {
    console.log('🚀 ChildActivityScreen mounted for child:', child.name);
    console.log('🔗 onNavigateToConnections prop:', !!onNavigateToConnections);
    
    // Clean up any old non-user-specific drafts (security fix)
    localStorage.removeItem('activityDraft');
    
    loadActivities(true); // Force refresh on component mount
    loadConnectionsData();
    loadActivityTemplates();
    loadActivityTypes();
    loadParentChildren();
    
    // Check if there's a saved draft to restore
    restoreActivityDraft();
  }, [child.uuid]);

  // Check for month changes when user navigates or toggles calendar
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && activities.length > 0) {
        console.log('📅 ChildActivityScreen - Visibility change detected, checking for month change');
        loadActivities(); // This will check for month change internally
      }
    };

    const handleFocusChange = () => {
      if (activities.length > 0) {
        console.log('📅 ChildActivityScreen - Window focus change detected, checking for month change');
        loadActivities(); // This will check for month change internally
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocusChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocusChange);
    };
  }, [activities.length, currentDateRange]);

  // Load connections when shared activity is enabled
  useEffect(() => {
    if (isSharedActivity && connectedChildren.length === 0) {
      console.log('🔄 Loading connections because shared activity was enabled...');
      loadConnectionsData();
    }
  }, [isSharedActivity]);

  // Load connections for joint host children when they change
  useEffect(() => {
    if (jointHostChildren.length > 0) {
      console.log('🔄 Loading connections for joint host children:', jointHostChildren);
      jointHostChildren.forEach(childUuid => {
        // Only load if we don't already have connections for this child
        if (!jointHostConnections[childUuid]) {
          loadJointHostConnections(childUuid);
        }
      });
    }
  }, [jointHostChildren]);

  // Debug parentChildren state changes
  useEffect(() => {
    console.log('🖥️ parentChildren state changed:', parentChildren.length, 'children:', parentChildren.map((c: any) => ({ name: c.name, uuid: c.uuid })));
  }, [parentChildren]);

  // Page navigation function
  const navigateToPage = (page: typeof currentPage) => {
    console.log('🧭 navigateToPage called:', { from: currentPage, to: page });
    if (page !== currentPage) {
      // If returning to main and an invitation was viewed, refresh both local and parent data
      if (page === 'main' && sessionStorage.getItem('invitationViewed') === 'true') {
        sessionStorage.removeItem('invitationViewed');
        loadActivities(); // Refresh local activity data to update envelope icons
        onDataChanged?.(); // Refresh parent data
      }
      
      setCurrentPage(page);
      console.log('📄 Page set to:', page);
      // Push new state to history
      window.history.pushState({ page }, '', window.location.href);
      
      // Scroll to top when navigating between pages
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      console.log('⚠️ Page navigation skipped - already on:', page);
    }
  };

  // Handle initial activity UUID for direct navigation to specific activities
  useEffect(() => {
    console.log('🔄 URL Activity UUID effect triggered:', { initialActivityUuid, activitiesLength: activities.length, currentPage });
    
    // Handle special "new" UUID for activity creation
    if (initialActivityUuid === 'new') {
      console.log('🆕 Detected new activity creation UUID, navigating to add-activity page');
      navigateToPage('add-activity');
      return;
    }
    
    if (initialActivityUuid && activities.length > 0) {
      console.log('🔍 Looking for activity with UUID:', initialActivityUuid);
      console.log('📋 Available activities:', activities.map(a => ({ 
        id: a.id, 
        name: a.name, 
        uuid: (a as any).uuid, 
        activity_uuid: (a as any).activity_uuid 
      })));
      
      const activity = activities.find(a => {
        const activityUuid = (a as any).uuid || (a as any).activity_uuid;
        return activityUuid === initialActivityUuid;
      });
      
      console.log('🎯 Found activity:', activity);
      
      if (activity) {
        // For initial activity navigation from URL, go to detail page (same as clicking activity)
        console.log('✅ Setting selected activity and navigating to detail page');
        setSelectedActivity(activity);
        
        // Populate newActivity state with selected activity data (same as in handleActivityClick)
        setNewActivity({
          name: activity.name || '',
          description: activity.description || '',
          start_date: activity.start_date ? activity.start_date.split('T')[0] : '',
          end_date: activity.end_date ? activity.end_date.split('T')[0] : '',
          start_time: activity.start_time || '',
          end_time: activity.end_time || '',
          location: activity.location || '',
          website_url: (activity as any).website_url || '',
          cost: (activity as any).cost ? String((activity as any).cost) : '',
          max_participants: (activity as any).max_participants ? String((activity as any).max_participants) : '',
          auto_notify_new_connections: (activity as any).auto_notify_new_connections || false
        });
        
        // Load participants for the activity (same as in handleActivityClick)
        const activityUuid = (activity as any).activity_uuid || (activity as any).uuid;
        if (activityUuid) {
          console.log('🔄 Loading participants for activity UUID:', activityUuid);
          loadActivityParticipants(activityUuid);
        }
        
        setCurrentPage('activity-detail');
        console.log('📄 Force set currentPage to activity-detail');
        
        // Load connections data for activity detail page if the activity is hosted by this child
        if (selectedActivity?.is_host) {
          console.log('🔄 Loading connections data for hosted activity detail page');
          loadConnectionsData();
        }
      } else {
        console.log('❌ Activity not found with UUID:', initialActivityUuid);
        // If activity not found, go to main page
        setSelectedActivity(null);
        setCurrentPage('main');
      }
    } else if (!initialActivityUuid) {
      // When no activity UUID in URL, ensure we're on main page
      console.log('🏠 No activity UUID, ensuring we are on main page');
      setSelectedActivity(null);
      setCurrentPage('main');
    }
  }, [initialActivityUuid, activities]);

  // Remove popstate handling - let React Router handle URL changes and Dashboard handle navigation
  // The component should respond to URL changes through props, not manage browser history directly

  // Watch for page changes to refresh data when returning to main after viewing invitations
  useEffect(() => {
    if (currentPage === 'main' && sessionStorage.getItem('invitationViewed') === 'true') {
      sessionStorage.removeItem('invitationViewed');
      loadActivities(); // Refresh local activity data to update envelope icons
      onDataChanged?.(); // Refresh parent data
    }
  }, [currentPage, onDataChanged]);

  // Load connections data when viewing activity detail for host activities
  useEffect(() => {
    if (currentPage === 'activity-detail' && selectedActivity?.is_host) {
      console.log('🔄 Activity detail page loaded for hosted activity, loading connections data');
      loadConnectionsData();
    }
  }, [currentPage, selectedActivity]);

  // Generate current date range
  const getCurrentDateRange = () => {
    const now = new Date();
    const oneYearLater = new Date();
    oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
    const startDate = now.toISOString().split('T')[0];
    const endDate = oneYearLater.toISOString().split('T')[0];
    return { startDate, endDate };
  };

  // Check if we need to refresh activities due to month change
  const shouldRefreshForDateChange = () => {
    if (!currentDateRange) return true; // First load
    
    const newRange = getCurrentDateRange();
    const currentMonth = currentDateRange.startDate.substring(0, 7); // YYYY-MM
    const newMonth = newRange.startDate.substring(0, 7); // YYYY-MM
    
    const monthChanged = currentMonth !== newMonth;
    if (monthChanged) {
      console.log(`📅 ChildActivityScreen - Month changed detected! ${currentMonth} -> ${newMonth}, refreshing activities`);
    }
    
    return monthChanged;
  };

  const loadActivities = async (forceRefresh = false) => {
    try {
      // Check if we need to refresh due to month change
      if (!forceRefresh && !shouldRefreshForDateChange()) {
        console.log('📅 ChildActivityScreen - No month change detected, using cached activities');
        return;
      }
      
      setLoading(true);
      
      console.log('🚀 ChildActivityScreen v2.0 - NEW VERSION WITH UNIFIED ACTIVITIES ENDPOINT');
      
      // Load child's own activities using calendar endpoint to get status change notifications
      // Get wider date range to include future activities (current date to 1 year ahead)
      const dateRange = getCurrentDateRange();
      const { startDate, endDate } = dateRange;
      
      // Update the current date range state
      setCurrentDateRange(dateRange);
      
      console.log(`📅 ChildActivityScreen - Loading activities for EXTENDED date range: ${startDate} to ${endDate} (to include future activities like 'not test 1' on Sept 1st)`);
      
      // Load all activities (owned + invited) using the unified activities endpoint
      const activitiesResponse = await apiService.getCalendarActivities(startDate, endDate);
      console.log('🔍 ChildActivityScreen - Activities API Response:', activitiesResponse);
      
      if (activitiesResponse.success && activitiesResponse.data) {
        const allActivities = Array.isArray(activitiesResponse.data) ? activitiesResponse.data : [];
        console.log(`📅 ChildActivityScreen - All activities from API: ${allActivities.length}`, allActivities);
        console.log(`🔍 DETAILED API ANALYSIS:`);
        console.log(`   - Total activities in API: ${allActivities.length}`);
        console.log(`   - Current child UUID: ${child.uuid}`);
        console.log(`   - Activities breakdown:`);
        allActivities.forEach((activity, index) => {
          console.log(`     ${index + 1}. "${activity.name}"`);
          console.log(`        - child_uuid: ${activity.child_uuid}`);
          console.log(`        - invited_child_uuid: ${activity.invited_child_uuid}`);
          console.log(`        - is_host: ${activity.is_host}`);
          console.log(`        - invitation_status: ${activity.invitation_status}`);
          console.log(`        - Owned by this child: ${activity.child_uuid === child.uuid}`);
          console.log(`        - Invited: ${activity.invited_child_uuid === child.uuid && activity.invitation_status !== 'none'}`);
        });
        
        // Filter activities for this specific child using UUIDs only (secure)
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
        console.log(`📊 FILTERING SUMMARY:`);
        console.log(`   - API returned: ${allActivities.length} activities`);
        console.log(`   - Filtered to: ${childActivities.length} activities`);
        console.log(`   - Filtered out: ${allActivities.length - childActivities.length} activities`);
        
        // Also load rejected invitations to include them as grey activities
        console.log('🔍 Loading rejected invitations...');
        const invitationsResponse = await apiService.getAllInvitations(startDate, endDate);
        
        if (invitationsResponse.success && invitationsResponse.data) {
          const rejectedInvitations = invitationsResponse.data.filter(
            invitation => invitation.status === 'rejected' && 
                         invitation.invited_child_name === child.name
          );
          
          console.log(`🔍 Found ${rejectedInvitations.length} rejected invitations for ${child.name}:`, rejectedInvitations);
          
          // Convert rejected invitations to activity format and add them
          const rejectedActivities = rejectedInvitations.map(invitation => ({
            activity_uuid: invitation.activity_uuid,
            name: invitation.activity_name,
            description: invitation.activity_description,
            start_date: invitation.start_date,
            end_date: invitation.end_date,
            start_time: invitation.start_time,
            end_time: invitation.end_time,
            location: invitation.location,
            website_url: invitation.website_url,
            cost: invitation.cost,
            child_name: invitation.child_name,
            child_uuid: invitation.child_uuid,
            is_host: false,
            is_shared: true,
            invitation_status: 'rejected',
            invited_child_uuid: child.uuid,
            invitationUuid: invitation.invitation_uuid,
            isRejectedInvitation: true,
            host_parent_name: invitation.host_parent_username
          }));
          
          // Merge rejected invitations with existing activities
          const allActivitiesWithRejected = [...childActivities, ...rejectedActivities];
          console.log(`✅ Total activities including rejected: ${allActivitiesWithRejected.length}`);
          
          setActivities(allActivitiesWithRejected);
          
          // Debug: Log the final activities state with recurring activity details
          console.log('🎯 FINAL ACTIVITIES STATE SET:', allActivitiesWithRejected.length);
          const recurringActivities = allActivitiesWithRejected.filter(a => a.name && (a.name.includes('rec') || a.is_recurring));
          console.log('🔄 RECURRING ACTIVITIES IN FINAL STATE:', recurringActivities.length, recurringActivities.map(a => ({
            name: a.name,
            start_date: a.start_date,
            uuid: a.uuid || a.activity_uuid,
            series_id: a.series_id,
            is_recurring: a.is_recurring
          })));
        } else {
          console.log('No invitations data or failed to load invitations');
          setActivities(childActivities);
          
          // Debug: Log the final activities state with recurring activity details
          console.log('🎯 FINAL ACTIVITIES STATE SET (childActivities only):', childActivities.length);
          const recurringActivities = childActivities.filter(a => a.name && (a.name.includes('rec') || a.is_recurring));
          console.log('🔄 RECURRING ACTIVITIES IN FINAL STATE:', recurringActivities.length, recurringActivities.map(a => ({
            name: a.name,
            start_date: a.start_date,
            uuid: a.uuid || a.activity_uuid,
            series_id: a.series_id,
            is_recurring: a.is_recurring
          })));
        }
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

  const handleInvitationResponse = async (invitationUuid: string, action: 'accept' | 'reject') => {
    try {
      console.log(`🔍 INVITATION RESPONSE DEBUG for UUID: ${invitationUuid}`);
      console.log(`🔍 All activities:`, activities.map(a => ({
        name: a.name,
        activity_uuid: (a as any).activity_uuid,
        invitationUuid: (a as any).invitationUuid,
        invitation_uuid: (a as any).invitation_uuid,
        invitationId: (a as any).invitationId,
        invitation_status: (a as any).invitation_status,
        series_id: (a as any).series_id
      })));
      
      // First, let's make the API call to get the invitation details
      // Since the activities structure may not have complete invitation data,
      // we'll use the activities to identify series based on activity names
      
      // For now, let's focus on finding activities with the same name and pending status
      // and use the series_id approach once we have the invitation details
      
      // Load fresh invitations data to get series information
      const today = new Date();
      const oneYearLater = new Date();
      oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
      const startDate = today.toISOString().split('T')[0];
      const endDate = oneYearLater.toISOString().split('T')[0];
      
      const invitationsResponse = await apiService.getAllInvitations(startDate, endDate);
      console.log(`🔍 Fresh invitations data:`, invitationsResponse);
      
      if (invitationsResponse.success && invitationsResponse.data) {
        // Find the current invitation by UUID
        const currentInvitation = invitationsResponse.data.find((inv: any) => 
          inv.invitation_uuid === invitationUuid
        );
        
        console.log(`🔍 Current invitation found in fresh data:`, currentInvitation);
        
        if (currentInvitation) {
          const seriesId = currentInvitation.series_id;
          const activityName = currentInvitation.activity_name;
          
          console.log(`🔍 Current invitation details:`);
          console.log(`🔍 - Name: ${activityName}`);
          console.log(`🔍 - Series ID: ${seriesId}`);
          console.log(`🔍 - Status: ${currentInvitation.status}`);
          
          // Find all related invitations for this child
          let seriesInvitations = [];
          
          if (seriesId && seriesId !== 'undefined' && seriesId !== null) {
            // Use series_id for precise grouping
            seriesInvitations = invitationsResponse.data.filter((inv: any) => 
              inv.series_id === seriesId &&
              inv.invited_child_id === currentInvitation.invited_child_id &&
              inv.status === 'pending' // Only pending invitations can be accepted/declined
            );
            console.log(`🔍 Found ${seriesInvitations.length} pending invitations in series using series_id`);
          } else {
            // Fallback to name-based grouping
            seriesInvitations = invitationsResponse.data.filter((inv: any) => 
              inv.activity_name === activityName &&
              inv.invited_child_id === currentInvitation.invited_child_id &&
              inv.host_parent_username === currentInvitation.host_parent_username &&
              inv.status === 'pending' // Only pending invitations
            );
            console.log(`🔍 Found ${seriesInvitations.length} pending invitations in series using name matching`);
          }
          
          console.log(`🔍 Series invitations:`, seriesInvitations.map(inv => ({
            name: inv.activity_name,
            invitation_uuid: inv.invitation_uuid,
            start_date: inv.start_date,
            status: inv.status,
            series_id: inv.series_id
          })));
          
          if (seriesInvitations.length > 1) {
            // This is a recurring series - ask user if they want to accept/decline the whole series
            const actionText = action === 'accept' ? 'accept' : 'decline';
            const seriesMessage = `This is a recurring activity "${activityName}" with ${seriesInvitations.length} pending sessions. Do you want to ${actionText} the entire series?`;
            
            const acceptSeries = window.confirm(seriesMessage + '\n\nClick OK for entire series, Cancel for just this activity.');
            
            if (acceptSeries) {
              // Accept/decline the entire series
              console.log(`📧 ${action === 'accept' ? 'Accepting' : 'Declining'} entire series of ${seriesInvitations.length} invitations`);
              
              const seriesPromises = seriesInvitations.map(inv => 
                apiService.respondToActivityInvitation(inv.invitation_uuid, action)
              );
              
              const results = await Promise.all(seriesPromises);
              const successCount = results.filter(r => r?.success).length;
              
              if (successCount > 0) {
                const message = action === 'accept' 
                  ? `Series accepted! ${successCount} recurring activities will appear in your calendar.`
                  : `Series declined. ${successCount} invitations removed.`;
                alert(message);
                
                // Reload activities to update the display
                loadActivities();
                
                // Close the detail modal and refresh parent data
                goBack();
                onDataChanged?.();
              } else {
                alert(`Error: Failed to ${action} series invitations`);
              }
              
              return;
            }
          }
        }
      }
      
      // Handle single invitation (either non-recurring or user chose single)
      const response = await apiService.respondToActivityInvitation(invitationUuid, action);
      
      if (response.success) {
        const message = action === 'accept' 
          ? 'Invitation accepted! Activity will appear in your calendar.' 
          : 'Invitation declined.';
        alert(message);
        
        // Reload activities to update the display
        loadActivities();
        
        // Close the detail modal and refresh parent data
        goBack();
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
          const invitationWithStatusChange = response.data.participants.find((p: any) => p.invitation_uuid);
          if (invitationWithStatusChange && invitationWithStatusChange.invitation_uuid) {
            await apiService.markStatusChangeAsViewed(invitationWithStatusChange.invitation_uuid);
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

  const loadConnectionsData = async () => {
    try {
      console.log(`🔄 Loading connections data for host child: ${child.name} (UUID: ${child.uuid})...`);
      const response = await apiService.getChildConnections(child.uuid);
      console.log('📡 Connections API response:', response);
      console.log('🔍 RAW API RESPONSE DATA:', JSON.stringify(response.data, null, 2));
      
      if (response.success && response.data) {
        const connectedChildren: any[] = [];
        const pendingRequests: any[] = [];
        
        response.data.forEach((item: any, index: number) => {
          console.log(`🔍 Processing item ${index}:`, item);
          
          // Check for status field to determine if connected or pending
          const status = item.status || item.connection_status || 'accepted'; // Default to accepted if no status
          console.log(`Status for item ${index}: ${status}`);
          
          if (status === 'accepted' || status === 'connected' || status === 'active') {
            connectedChildren.push({
              id: item.connected_child_uuid || item.child_uuid || item.uuid,
              uuid: item.connected_child_uuid || item.child_uuid || item.uuid, 
              name: item.connected_child_name || item.child_name || item.name,
              parentName: item.connected_parent_name || item.parent_name || item.parentname,
              parentUuid: item.connected_parent_uuid || item.parent_uuid || item.parentuuid,
              parent_id: item.connected_parent_id || item.parent_id,
              family_name: item.connected_family_name || item.family_name
            });
          } else if (status === 'pending') {
            pendingRequests.push({
              id: item.id,
              target_child_name: item.connected_child_name || item.child_name || item.name,
              target_parent_name: item.connected_parent_name || item.parent_name,
              target_child_uuid: item.connected_child_uuid || item.child_uuid || item.uuid,
              target_parent_uuid: item.connected_parent_uuid || item.parent_uuid,
              target_parent_id: item.connected_parent_id || item.parent_id,
              target_family_name: item.connected_family_name || item.family_name,
              status: 'pending'
            });
          }
        });
        
        console.log('✅ Connected children:', connectedChildren.length, connectedChildren);
        console.log('✅ Pending requests:', pendingRequests.length, pendingRequests);
        
        setConnectedChildren(connectedChildren);
        setPendingConnectionRequests(pendingRequests);
      } else {
        console.log('❌ No connections data or API error');
        setConnectedChildren([]);
        setPendingConnectionRequests([]);
      }
    } catch (error) {
      console.error('❌ Failed to load connections data:', error);
      setConnectedChildren([]);
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
      setJointHostChildren([]);
    }
    
    // Ensure parent children data is loaded for joint hosting
    console.log('🔄 handleAddActivity - Ensuring parent children data is loaded');
    if (parentChildren.length === 0) {
      console.log('⚠️ Parent children not loaded, loading now...');
      loadParentChildren();
    } else {
      console.log(`✅ Parent children already loaded: ${parentChildren.length} children`);
    }
    
    // Create a UUID-based URL for activity creation using special "new" identifier
    if (onNavigateToActivity) {
      const newActivityPlaceholder = {
        uuid: 'new',
        activity_uuid: 'new', 
        name: 'New Activity',
        id: null
      };
      console.log('🔄 Navigating to new activity creation with UUID-based routing');
      onNavigateToActivity(child, newActivityPlaceholder);
    } else {
      // Fallback to old behavior
      navigateToPage('add-activity');
    }
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
        console.log('🎟️ Raw user_invitation data:', response.data.user_invitation);
        console.log('🎯 Current selectedActivity:', selectedActivity);
        
        
        setActivityParticipants(response.data);
        
        // Store invitation data separately if present
        if (response.data.user_invitation) {
          console.log('🎟️ Found user invitation - storing separately:', response.data.user_invitation);
          const invitation = response.data.user_invitation;
          
          const invitationInfo = {
            isPendingInvitation: invitation.status === 'pending',
            isAcceptedInvitation: invitation.status === 'accepted',
            isDeclinedInvitation: invitation.status === 'declined',
            invitationUuid: invitation.invitation_uuid,
            invitation_message: invitation.invitation_message
          };
          
          setInvitationData(invitationInfo);
          
          console.log('💾 Stored invitation data separately:', invitationInfo);
        } else {
          setInvitationData(null);
        }
        
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

  // Template Loading Functions
  const loadActivityTemplates = async () => {
    try {
      setLoadingTemplates(true);
      const response = await apiService.getActivityTemplates();
      if (response.success) {
        setActivityTemplates(response.data || []);
        console.log('✅ Activity templates loaded:', (response.data || []).length);
      } else {
        console.error('❌ Failed to load activity templates:', response.error);
        setActivityTemplates([]);
      }
    } catch (error) {
      console.error('💥 Error loading activity templates:', error);
      setActivityTemplates([]);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const loadActivityTypes = async () => {
    try {
      const response = await apiService.getActivityTypes();
      if (response.success) {
        setActivityTypes(response.data || []);
        console.log('✅ Activity types loaded:', (response.data || []).length);
      } else {
        console.error('❌ Failed to load activity types:', response.error);
        setActivityTypes([]);
      }
    } catch (error) {
      console.error('💥 Error loading activity types:', error);
      setActivityTypes([]);
    }
  };

  const loadParentChildren = async () => {
    try {
      console.log('🔄 Loading parent\'s children for joint hosting...');
      console.log('📝 Current child UUID:', child.uuid, 'Current child name:', child.name);
      const response = await apiService.getChildren();
      console.log('📋 Raw getChildren response:', response);
      
      if (response.success && response.data) {
        const allChildren = Array.isArray(response.data) ? response.data : [];
        console.log('👥 All children from API:', allChildren.map((c: any) => ({ 
          name: c.name || c.display_name || `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Unnamed', 
          uuid: c.uuid, 
          id: c.id 
        })));
        
        // Include all children for joint hosting selection
        console.log('🎯 All children available for joint hosting:', allChildren.map((c: any) => ({ 
          name: c.name || c.display_name || `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Unnamed', 
          uuid: c.uuid, 
          id: c.id 
        })));
        
        setParentChildren(allChildren);
        console.log('✅ Set parentChildren state with', allChildren.length, 'children');
      } else {
        console.error('❌ Failed to load parent children:', response.error || 'API returned unsuccessful response');
        setParentChildren([]);
      }
    } catch (error) {
      console.error('💥 Error loading parent children:', error);
      console.error('Full error details:', error);
      setParentChildren([]);
    }
  };

  const loadJointHostConnections = async (childUuid: string) => {
    try {
      console.log(`🔄 Loading connections for joint host child: ${childUuid}...`);
      const response = await apiService.getChildConnections(childUuid);
      console.log(`📡 Joint host connections API response for ${childUuid}:`, response);
      console.log(`🔍 RAW Joint host API RESPONSE DATA for ${childUuid}:`, JSON.stringify(response.data, null, 2));
      
      if (response.success && response.data) {
        const connectedChildren: any[] = [];
        const pendingRequests: any[] = [];
        
        response.data.forEach((item: any, index: number) => {
          console.log(`🔍 Processing joint host item ${index} for child ${childUuid}:`, item);
          
          // Check for status field to determine if connected or pending
          const status = item.status || item.connection_status || 'accepted'; // Default to accepted if no status
          console.log(`Status for joint host item ${index}: ${status}`);
          
          if (status === 'accepted' || status === 'connected' || status === 'active') {
            connectedChildren.push({
              id: item.connected_child_uuid || item.child_uuid || item.uuid,
              uuid: item.connected_child_uuid || item.child_uuid || item.uuid, 
              name: item.connected_child_name || item.child_name || item.name,
              parentName: item.connected_parent_name || item.parent_name || item.parentname,
              parentUuid: item.connected_parent_uuid || item.parent_uuid || item.parentuuid,
              parent_id: item.connected_parent_id || item.parent_id,
              family_name: item.connected_family_name || item.family_name,
              status: status
            });
          } else if (status === 'pending') {
            connectedChildren.push({
              id: item.connected_child_uuid || item.child_uuid || item.uuid,
              uuid: item.connected_child_uuid || item.child_uuid || item.uuid, 
              name: item.connected_child_name || item.child_name || item.name,
              parentName: item.connected_parent_name || item.parent_name || item.parentname,
              parentUuid: item.connected_parent_uuid || item.parent_uuid || item.parentuuid,
              parent_id: item.connected_parent_id || item.parent_id,
              family_name: item.connected_family_name || item.family_name,
              status: 'pending'
            });
          }
        });
        
        console.log(`✅ Joint host connected children for ${childUuid}:`, connectedChildren.length, connectedChildren);
        
        setJointHostConnections(prev => ({
          ...prev,
          [childUuid]: connectedChildren
        }));
      } else {
        console.error(`❌ Failed to load connections for child ${childUuid}:`, response.error);
        setJointHostConnections(prev => ({
          ...prev,
          [childUuid]: []
        }));
      }
    } catch (error) {
      console.error(`💥 Error loading connections for child ${childUuid}:`, error);
      setJointHostConnections(prev => ({
        ...prev,
        [childUuid]: []
      }));
    }
  };

  const handleTemplateSelect = (template: any) => {
    if (template === null) {
      // "Create from scratch" selected
      setSelectedTemplate(null);
      setTemplateConfirmationMessage('');
      // Reset form to empty state
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
      setJointHostChildren([]);
      clearActivityDraft();
      return;
    }

    setSelectedTemplate(template);
    setTemplateConfirmationMessage(`Template "${template.name}" loaded successfully!`);
    
    // Pre-fill the activity form with template data
    setNewActivity({
      name: template.name || '',
      description: template.description || '',
      start_date: '',
      end_date: '',
      start_time: template.typical_start_time || '',
      end_time: template.typical_start_time ? 
        // Add typical duration to start time if available
        (template.typical_duration_hours ? 
          addHoursToTime(template.typical_start_time, template.typical_duration_hours) : 
          template.typical_start_time) : '',
      location: template.location || '',
      website_url: template.website_url || '',
      cost: template.cost ? template.cost.toString() : '',
      max_participants: template.max_participants ? template.max_participants.toString() : '',
      auto_notify_new_connections: false
    });
    
    setSelectedDates([]);
    setIsSharedActivity(false);
    setAutoNotifyNewConnections(false);
    setJointHostChildren([]);
    clearActivityDraft(); // Clear any saved draft since we're using a template
    
    // Track template usage
    apiService.useActivityTemplate(template.uuid).catch(error => {
      console.error('Failed to track template usage:', error);
    });
    
    // Clear the confirmation message after 3 seconds
    setTimeout(() => {
      setTemplateConfirmationMessage('');
    }, 3000);
  };

  const addHoursToTime = (timeString: string, hours: number): string => {
    if (!timeString) return '';
    const [hourStr, minuteStr] = timeString.split(':');
    const totalMinutes = (parseInt(hourStr) + hours) * 60 + parseInt(minuteStr || '0');
    const newHour = Math.floor(totalMinutes / 60) % 24;
    const newMinute = totalMinutes % 60;
    return `${newHour.toString().padStart(2, '0')}:${newMinute.toString().padStart(2, '0')}`;
  };

  const handleStartFromScratch = () => {
    handleTemplateSelect(null);
  };


  const handleActivityClick = async (activity: Activity) => {
    // Use proper navigation if available to navigate to activity-specific URL
    if (onNavigateToActivity) {
      onNavigateToActivity(child, activity);
      return;
    }

    // Fallback to old behavior for backwards compatibility
    // Check if this activity has a pending invitation for the current user
    let enhancedActivity = { ...activity };
    
    // If this is a regular activity (not already marked as invitation), check if user has pending invitation
    if (!activity.isPendingInvitation && !activity.isAcceptedInvitation && !activity.isDeclinedInvitation) {
      try {
        // Check pending invitations to see if current user has an invitation for this activity
        const today = new Date();
        const oneYearLater = new Date();
        oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
        const startDate = today.toISOString().split('T')[0];
        const endDate = oneYearLater.toISOString().split('T')[0];
        
        const pendingResponse = await apiService.getPendingInvitationsForCalendar(startDate, endDate);
        console.log('🔍 Checking for pending invitations for activity:', activity.name, activity.uuid || activity.activity_uuid);
        console.log('📋 Pending invitations response:', pendingResponse);
        if (pendingResponse.success && pendingResponse.data) {
          // Look for a pending invitation that matches this activity
          const matchingInvitation = pendingResponse.data.find((inv: any) => {
            // First try to match by activity UUID if available
            if (activity.uuid && inv.activity_uuid) {
              return inv.activity_uuid === activity.uuid;
            }
            if (activity.activity_uuid && inv.activity_uuid) {
              return inv.activity_uuid === activity.activity_uuid;
            }
            // Fallback to matching by name, date, and time
            return inv.activity_name === activity.name && 
                   inv.start_date === activity.start_date &&
                   inv.start_time === activity.start_time;
          });
          
          console.log('🎯 Matching invitation found:', matchingInvitation);
          
          if (matchingInvitation) {
            // Convert this activity to a pending invitation format
            enhancedActivity = {
              ...activity,
              isPendingInvitation: true,
              invitationUuid: matchingInvitation.invitation_uuid,
              invitation_message: matchingInvitation.invitation_message,
              host_child_name: matchingInvitation.host_child_name,
              host_parent_name: matchingInvitation.host_parent_username,
              activity_uuid: matchingInvitation.activity_uuid
            } as any;
            console.log('🎯 Enhanced activity with pending invitation data:', enhancedActivity);
          }
        }
      } catch (error) {
        console.error('Failed to check for pending invitations:', error);
      }
    }
    
    setSelectedActivity(enhancedActivity);
    navigateToPage('activity-detail');
    
    // Mark invitation as viewed if this is any type of invitation
    if (enhancedActivity.isPendingInvitation || enhancedActivity.isAcceptedInvitation || enhancedActivity.isDeclinedInvitation) {
      const invitationUuid = (enhancedActivity as any).invitationUuid || (enhancedActivity as any).invitation_uuid;
      if (invitationUuid) {
        try {
          // Call the backend API to mark invitation as viewed using UUID
          await apiService.markInvitationAsViewed(invitationUuid);
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
      loadConnectionsData();
    }
  };

  const handleEditActivity = (activity: Activity) => {
    setEditingActivity(activity);
    // Reset all form state first, then populate with activity data
    setSelectedDates([]);
    setIsSharedActivity(false);
    setAutoNotifyNewConnections(false);
    setSelectedConnectedChildren([]);
    setJointHostChildren([]);
    
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

  const sendInvitations = async () => {
    console.log('🔍 sendInvitations called:', {
      selectedConnectedChildren,
      selectedConnectedChildrenLength: selectedConnectedChildren.length,
      selectedActivity: selectedActivity?.name,
      activityUuid: selectedActivity?.uuid || selectedActivity?.activity_uuid
    });
    
    if (selectedConnectedChildren.length === 0 || !selectedActivity) {
      console.log('⚠️ sendInvitations early return:', {
        reason: selectedConnectedChildren.length === 0 ? 'No children selected' : 'No activity selected'
      });
      return { success: true, count: 0 };
    }

    // ✅ RECURRING ACTIVITIES: Check if this is a recurring activity and get all instances
    console.log('🔍 INVITATION DEBUG: Checking for recurring activity:', {
      activityName: selectedActivity.name,
      selectedActivityUuid: selectedActivity.uuid || selectedActivity.activity_uuid,
      selectedActivityChildId: selectedActivity.child_id,
      selectedActivityChildUuid: selectedActivity.child_uuid,
      currentChildId: child.id,
      currentChildUuid: child.uuid,
      totalActivitiesLoaded: activities.length,
      seriesId: (selectedActivity as any).series_id,
      isRecurring: (selectedActivity as any).is_recurring
    });
    
    // Debug all activities with the same name
    const sameNameActivities = activities.filter(a => a.name === selectedActivity.name);
    console.log(`🔍 FOUND ${sameNameActivities.length} ACTIVITIES WITH NAME "${selectedActivity.name}":`, 
      sameNameActivities.map(a => ({
        uuid: a.uuid || a.activity_uuid,
        child_id: a.child_id,
        child_uuid: a.child_uuid,
        start_date: a.start_date
      }))
    );
    
    // Find all activities with the same name for this child (more robust matching)
    const currentChildId = selectedActivity.child_id || child.id;
    const currentChildUuid = selectedActivity.child_uuid || child.uuid;
    
    const potentialSeriesActivities = activities.filter(a => {
      // Match by name first
      if (a.name !== selectedActivity.name) return false;
      
      // Match by child - try multiple field combinations for robustness
      const matchByChildId = (a.child_id && currentChildId && a.child_id === currentChildId);
      const matchByChildUuid = (a.child_uuid && currentChildUuid && a.child_uuid === currentChildUuid);
      const matchByDirectChildUuid = (a.child_uuid && child.uuid && a.child_uuid === child.uuid);
      
      return matchByChildId || matchByChildUuid || matchByDirectChildUuid;
    });
    
    console.log('🔍 POTENTIAL SERIES ACTIVITIES:', potentialSeriesActivities.length, potentialSeriesActivities.map(a => ({
      uuid: a.uuid || a.activity_uuid,
      name: a.name,
      start_date: a.start_date,
      child_id: a.child_id,
      child_uuid: a.child_uuid
    })));
    
    const isRecurringActivity = selectedActivity.name && (
      (selectedActivity as any).series_id || 
      (selectedActivity as any).is_recurring ||
      potentialSeriesActivities.length > 1
    );
    
    console.log('🔍 IS RECURRING ACTIVITY:', isRecurringActivity);

    let activitiesToInvite = [selectedActivity];
    
    if (isRecurringActivity) {
      activitiesToInvite = potentialSeriesActivities;
      console.log(`🔄 RECURRING INVITATION: Found ${activitiesToInvite.length} activities in series for "${selectedActivity.name}"`);
      console.log('🔄 ACTIVITIES TO INVITE:', activitiesToInvite.map(a => ({
        uuid: a.uuid || a.activity_uuid,
        name: a.name,
        start_date: a.start_date
      })));
    }

    // Send invitations to selected children for all activities in the series
    const invitationPromises = selectedConnectedChildren.map(async (childId) => {
      const childIdStr = String(childId);
      console.log('🔍 Processing invitation for childId:', childIdStr);
      
      if (childIdStr.startsWith('pending-child-')) {
        console.log('📝 Pending child invitation:', childIdStr);
        const pendingId = childIdStr.replace('pending-child-', '');
        
        if (isRecurringActivity) {
          // Send invitations to all activities in the series for pending children
          const pendingInvitePromises = activitiesToInvite.map(activity =>
            apiService.createPendingInvitations(activity.uuid || activity.activity_uuid || String(activity.id), [pendingId])
          );
          const results = await Promise.all(pendingInvitePromises);
          return { success: results.some(r => r?.success), series: true, count: results.filter(r => r?.success).length };
        } else {
          return apiService.createPendingInvitations(selectedActivity.uuid || selectedActivity.activity_uuid || String(selectedActivity.id), [pendingId]);
        }
      } else {
        console.log('👥 Looking for connected child with UUID:', childIdStr);
        console.log('👥 Available connectedChildren:', connectedChildren);
        const connectedChild = connectedChildren.find(c => c.uuid === childIdStr || c.connected_child_uuid === childIdStr);
        console.log('🔍 Found connectedChild:', connectedChild);
        
        if (connectedChild) {
          const parentId = connectedChild.parent_id || connectedChild.parentUuid;
          
          if (parentId) {
            if (isRecurringActivity) {
              // Send invitations to all activities in the series
              console.log(`📧 Sending ${activitiesToInvite.length} recurring invitations to parent ${parentId} for child ${childIdStr}`);
              
              const recurringInvitePromises = activitiesToInvite.map((activity, index) => {
                const activityUuid = activity.uuid || activity.activity_uuid || String(activity.id);
                console.log(`📧 Sending invitation ${index + 1}/${activitiesToInvite.length}:`, {
                  activityUuid,
                  activityName: activity.name,
                  startDate: activity.start_date,
                  parentId,
                  childIdStr
                });
                return apiService.sendActivityInvitation(activityUuid, parentId, childIdStr);
              });
              
              console.log(`📧 About to send ${recurringInvitePromises.length} invitation requests...`);
              const results = await Promise.all(recurringInvitePromises);
              const successCount = results.filter(r => r?.success).length;
              const failedCount = results.length - successCount;
              
              console.log(`✅ Recurring invitations result: ${successCount}/${activitiesToInvite.length} sent successfully, ${failedCount} failed`);
              if (failedCount > 0) {
                console.log('❌ Failed invitation responses:', results.filter(r => !r?.success));
              }
              
              return { success: successCount > 0, series: true, count: successCount };
            } else {
              console.log('📧 Attempting to send single invitation:', {
                activityId: selectedActivity.uuid || selectedActivity.activity_uuid || String(selectedActivity.id),
                parentId,
                childId: childIdStr
              });
              
              return apiService.sendActivityInvitation(selectedActivity.uuid || selectedActivity.activity_uuid || String(selectedActivity.id), parentId, childIdStr);
            }
          } else {
            console.error('❌ No parent ID found for connectedChild:', connectedChild);
          }
        } else {
          console.error('❌ Connected child not found for UUID:', childIdStr);
        }
      }
    });

    try {
      const results = await Promise.all(invitationPromises);
      
      // Count successes, including series invitations
      const successful = results.filter(r => r?.success).length;
      const totalInvitations = results.reduce((total, r) => {
        if ((r as any)?.series && (r as any)?.count) {
          return total + (r as any).count;
        }
        return total + (r?.success ? 1 : 0);
      }, 0);
      
      const hasSeriesInvitations = results.some(r => (r as any)?.series);
      
      console.log(`📧 Invitation results: ${successful} children invited${hasSeriesInvitations ? ` to series (${totalInvitations} total invitations)` : ''}`);
      
      return { 
        success: true, 
        count: successful, 
        totalInvitations,
        isRecurring: isRecurringActivity,
        seriesCount: isRecurringActivity ? activitiesToInvite.length : 1
      };
    } catch (error) {
      console.error('Failed to send invitations:', error);
      return { success: false, count: 0 };
    }
  };

  const handleUpdateActivity = async () => {
    console.log('🚀 handleUpdateActivity called:', {
      selectedActivity: selectedActivity?.name,
      newActivityName: newActivity.name,
      selectedConnectedChildren,
      currentPage
    });
    
    if (!selectedActivity || !newActivity.name.trim()) {
      alert('Please enter activity name');
      return;
    }

    // Only validate dates when in edit-activity mode, not when just updating activity details from activity-detail page
    if (currentPage === 'edit-activity' && selectedDates.length === 0) {
      alert('Please select at least one date from the calendar');
      return;
    }

    setAddingActivity(true);
    try {
      // Get activity UUID - prioritize UUID over numeric ID for consistency
      const activityUuid = (selectedActivity as any).activity_uuid || 
                           (selectedActivity as any).uuid;
      
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
        auto_notify_new_connections: isSharedActivity ? autoNotifyNewConnections : false,
        joint_host_children: jointHostChildren.length > 0 ? jointHostChildren : undefined // Add joint host children
      };

      // Update the original activity with the first selected date
      const mainActivityData = {
        ...baseActivityData,
        start_date: firstSelectedDate || originalDate,
        end_date: firstSelectedDate || originalDate
      };
      
      console.log('🔍 Activity update data being sent:', {
        activityUuid,
        mainActivityData,
        originalDate,
        selectedDates,
        firstSelectedDate
      });
      
      if (!activityUuid) {
        alert('Unable to update activity - activity UUID not found');
        console.error('❌ No activity UUID found in selectedActivity:', selectedActivity);
        setAddingActivity(false);
        return;
      }
      
      console.log('🚀 Calling apiService.updateActivity...');
      const response = await apiService.updateActivity(activityUuid, mainActivityData);
      console.log('🚀 Activity update response:', response);
      
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
              const createResponse = await apiService.createActivity(child.uuid, additionalActivityData);
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

        // Automatically send invitations if there are selected children
        console.log('📧 About to send invitations after activity update...');
        const invitationResult = await sendInvitations();
        console.log('📧 Invitation result:', invitationResult);
        if (invitationResult.count > 0) {
          if (invitationResult.isRecurring) {
            successMessage += ` ${invitationResult.count} invitation${invitationResult.count > 1 ? 's' : ''} sent for recurring series (${invitationResult.seriesCount} activities each)!`;
          } else {
            successMessage += ` ${invitationResult.count} invitation${invitationResult.count > 1 ? 's' : ''} sent!`;
          }
          setSelectedConnectedChildren([]);
          loadActivityParticipants(selectedActivity.uuid || selectedActivity.activity_uuid || String(selectedActivity.id));
        }

        alert(successMessage);
        loadActivities(); // Reload activities to reflect changes
        goBack(); // Go back to main page
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
    // Since backend doesn't return series_id/is_recurring, detect recurring activities by finding
    // other activities with the same name
    const activityName = (activity as any).name;
    const currentStartDate = (activity as any).start_date;
    
    // Find all activities with the same name (potential series)
    const sameNameActivities = activities.filter(act => (act as any).name === activityName);
    const isPartOfSeries = sameNameActivities.length > 1;
    
    console.log(`🔍 Delete check for activity "${activityName}":`, {
      currentStartDate,
      sameNameActivities: sameNameActivities.length,
      isPartOfSeries,
      allSameNameDates: sameNameActivities.map(act => (act as any).start_date).sort(),
      allFields: Object.keys(activity),
      sampleFieldValues: {
        name: (activity as any).name,
        start_date: (activity as any).start_date,
        series_id: (activity as any).series_id,
        is_recurring: (activity as any).is_recurring,
        recurring_days: (activity as any).recurring_days
      }
    });
    
    if (isPartOfSeries) {
      // Show custom dialog for recurring activity deletion
      console.log(`🗑️ Showing delete dialog for recurring activity (${sameNameActivities.length} total activities with name "${activityName}")`);
      setDeleteDialogActivity(activity);
      setShowDeleteDialog(true);
      console.log('🔧 Dialog state after setting:', { 
        showDeleteDialog: true, 
        deleteDialogActivity: activity?.name,
        timestamp: new Date().toISOString()
      });
    } else {
      // Regular single activity deletion
      console.log('🗑️ Showing single activity delete confirmation');
      if (window.confirm(`Are you sure you want to delete "${activity.name}"?`)) {
        await deleteActivity(activity, false);
      }
    }
  };

  const deleteActivity = async (activity: Activity, deleteWholeSeries: boolean = false) => {
    try {
      let response;
      const activityName = (activity as any).name;
      
      if (deleteWholeSeries) {
        // Try to delete entire series using the optimized API endpoint first
        console.log(`🗑️ Attempting to delete entire series with name: "${activityName}" using series API`);
        
        try {
          // Use the new series deletion API endpoint
          response = await apiService.deleteActivitySeries(activityName, child.uuid);
          
          if (response.success) {
            console.log(`✅ Series deletion successful via API endpoint`);
          } else {
            console.log(`⚠️ Series deletion API failed, falling back to individual deletion`);
            throw new Error('Series API failed, using fallback');
          }
        } catch (seriesApiError) {
          // Fallback to individual deletion if series API doesn't exist or fails
          console.log(`🔄 Falling back to individual activity deletion for series "${activityName}"`);
          
          // Find all activities in the current state that are part of the same series
          const currentSeriesId = (deleteDialogActivity as any).series_id;
          const seriesActivities = currentSeriesId
            ? activities.filter(act => (act as any).series_id === currentSeriesId)
            : activities.filter(act => (act as any).name === activityName);
          console.log(`🗑️ Found ${seriesActivities.length} activities in series to delete individually:`, 
            seriesActivities.map(act => ({ name: (act as any).name, date: (act as any).start_date }))
          );
          
          // Delete each activity in the series
          const deletePromises = seriesActivities.map(act => 
            apiService.deleteActivity(act.uuid || act.activity_uuid || String((act as any).id))
          );
          
          const results = await Promise.allSettled(deletePromises);
          const successCount = results.filter(result => result.status === 'fulfilled').length;
          const failedCount = results.length - successCount;
          
          if (failedCount === 0) {
            response = { success: true, message: `All ${successCount} activities in the series deleted successfully` };
          } else {
            response = { success: false, error: `${successCount} activities deleted, ${failedCount} failed` };
          }
        }
      } else {
        // Delete single activity
        console.log(`🗑️ Deleting single activity: ${activityName}`);
        response = await apiService.deleteActivity(activity.uuid || activity.activity_uuid || String(activity.id));
      }
      
      if (response.success) {
        goBack();
        loadActivities();
        const message = deleteWholeSeries 
          ? `Recurring activity series "${activityName}" deleted successfully`
          : `Activity "${activityName}" deleted successfully`;
        alert(message);
      } else {
        alert(`Error: ${response.error || 'Failed to delete activity'}`);
      }
    } catch (error) {
      alert('Failed to delete activity');
      console.error('Delete activity error:', error);
    }
  };

  const handleDeleteDialogClose = () => {
    setShowDeleteDialog(false);
    setDeleteDialogActivity(null);
  };

  // Function to generate recurring dates for the next 2 months
  const generateRecurringDates = (startDate: string, daysOfWeek: number[]): string[] => {
    console.log(`🗓️ Generating recurring dates for days: ${daysOfWeek} (${daysOfWeek.map(d => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]).join(', ')})`);
    
    const dates: string[] = [];
    const start = new Date(startDate);
    const endDate = new Date(start);
    endDate.setMonth(endDate.getMonth() + 2); // 2 months from start date
    
    const current = new Date(start);
    
    while (current <= endDate) {
      // Check if current day of week is in the selected days
      const dayOfWeek = current.getDay(); // 0 = Sunday, 1 = Monday, etc.
      
      if (daysOfWeek.includes(dayOfWeek)) {
        // Only add dates that are today or in the future
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        current.setHours(0, 0, 0, 0);
        
        if (current >= today) {
          // ✅ FIX: Use local date formatting to avoid timezone offset issues
          const year = current.getFullYear();
          const month = String(current.getMonth() + 1).padStart(2, '0');
          const day = String(current.getDate()).padStart(2, '0');
          const localDateString = `${year}-${month}-${day}`;
          
          console.log(`📅 Adding ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayOfWeek]} ${localDateString} (dayOfWeek: ${dayOfWeek})`);
          dates.push(localDateString);
        }
      }
      
      // Move to next day
      current.setDate(current.getDate() + 1);
    }
    
    console.log(`✅ Generated ${dates.length} recurring dates:`, dates);
    return dates.sort();
  };

  const handleCreateActivity = async () => {
    if (!newActivity.name.trim()) {
      alert('Please enter activity name');
      return;
    }

    let datesToCreate: string[] = [];
    
    if (isRecurringActivity) {
      // Validate recurring activity inputs
      if (!recurringStartDate) {
        alert('Please select a start date for the recurring activity');
        return;
      }
      if (recurringDaysOfWeek.length === 0) {
        alert('Please select at least one day of the week for the recurring activity');
        return;
      }
      
      // Generate dates for the next 2 months based on selected days of week
      datesToCreate = generateRecurringDates(recurringStartDate, recurringDaysOfWeek);
      
      if (datesToCreate.length === 0) {
        alert('No valid dates generated for the recurring activity');
        return;
      }
      
      console.log(`🔄 Generated ${datesToCreate.length} recurring activity dates:`, datesToCreate);
      console.log('🔄 Recurring configuration:', {
        startDate: recurringStartDate,
        daysOfWeek: recurringDaysOfWeek,
        daysNames: recurringDaysOfWeek.map(day => ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][day])
      });
    } else {
      // Regular single date activity validation
      if (selectedDates.length === 0) {
        alert('Please select at least one date from the calendar');
        return;
      }
      datesToCreate = selectedDates;
      console.log(`📅 Creating single activity for ${datesToCreate.length} date(s):`, datesToCreate);
    }

    setAddingActivity(true);
    try {
      const createdActivities: any[] = [];
      
      // Generate a unique series ID for recurring activities
      const seriesId = isRecurringActivity ? `series_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` : null;
      
      // Create activity for each selected date
      for (const date of datesToCreate) {
        const activityData = {
          ...newActivity,
          start_date: date,
          end_date: date, // Single day activities for each date
          cost: newActivity.cost ? parseFloat(newActivity.cost) : undefined,
          max_participants: newActivity.max_participants ? parseInt(newActivity.max_participants) : undefined,
          auto_notify_new_connections: isSharedActivity ? autoNotifyNewConnections : false,
          is_shared: isSharedActivity, // Explicitly set is_shared when user creates shared activity
          joint_host_children: jointHostChildren.length > 0 ? jointHostChildren : undefined, // Add joint host children
          series_id: seriesId, // Add series ID for recurring activities
          is_recurring: isRecurringActivity, // Flag to indicate this is part of a recurring series
          recurring_days: isRecurringActivity ? recurringDaysOfWeek : undefined, // Store the days of week for reference
          series_start_date: isRecurringActivity ? recurringStartDate : undefined // Store the series start date
        };

        console.log(`🔄 Creating ${isRecurringActivity ? 'recurring' : 'single'} activity for date ${date}:`, activityData);

        const response = await apiService.createActivity(child.uuid, activityData);
        
        console.log(`📡 API response for activity on ${date}:`, response);
        console.log(`📊 Response data structure:`, {
          success: response.success,
          hasData: !!response.data,
          dataKeys: response.data ? Object.keys(response.data) : 'no data',
          activityId: response.data?.id,
          activityUuid: response.data?.uuid || response.data?.activity_uuid,
          seriesIdReturned: response.data?.series_id,
          isRecurringReturned: response.data?.is_recurring,
          recurringDaysReturned: response.data?.recurring_days
        });
        
        console.log(`🔍 FULL RESPONSE DATA for ${date}:`, response.data);
        
        if (response.success) {
          createdActivities.push(response.data);
          console.log(`✅ Successfully created activity ${response.data?.name} for ${date} with UUID: ${response.data?.uuid || response.data?.activity_uuid}`);
        } else {
          console.error(`❌ Failed to create activity for ${date}:`, response.error);
        }
      }

      console.log(`✅ Activity creation summary:`, {
        totalRequested: datesToCreate.length,
        totalCreated: createdActivities.length,
        isRecurring: isRecurringActivity,
        seriesId: seriesId,
        createdActivityUuids: createdActivities.map(a => a.uuid || a.activity_uuid),
        createdActivityNames: createdActivities.map(a => a.name)
      });

      // Track pending connections for each created activity
      if (isSharedActivity && createdActivities.length > 0) {
        const pendingConnections = selectedConnectedChildren.filter(id => 
          typeof id === 'string' && (id.startsWith('pending-child-') || id.startsWith('main-pending-child-'))
        ) as string[];
        
        if (pendingConnections.length > 0) {
          for (const activity of createdActivities) {
            try {
              // Store pending invitations for this activity
              const activityUuid = activity.uuid || activity.activity_uuid;
              await apiService.createPendingInvitations(activityUuid, pendingConnections);
              console.log(`📝 Stored ${pendingConnections.length} pending invitations for activity "${activity.name}"`);
            } catch (error) {
              console.error('Failed to store pending invitations:', error);
            }
          }
        }
      }

      // If it's a shared activity, send invitations to selected connected children
      if (isSharedActivity && selectedConnectedChildren.length > 0 && createdActivities.length > 0) {
        console.log(`🎯 Sending invitations for ${createdActivities.length} activities to ${selectedConnectedChildren.length} children`);
        
        // First, ensure all joint host connections are loaded and build a local connections map
        const jointHostsNeeded = new Set<string>();
        selectedConnectedChildren.forEach(childId => {
          if (typeof childId === 'string' && childId.startsWith('joint-')) {
            // Format: joint-{hostChildUuid}-{connectedChildUuid}
            // Extract the hostChildUuid (first UUID after 'joint-')
            const withoutPrefix = childId.substring('joint-'.length);
            const uuidParts = withoutPrefix.split('-');
            if (uuidParts.length >= 5) {
              // Reconstruct the first UUID (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
              const hostChildUuid = `${uuidParts[0]}-${uuidParts[1]}-${uuidParts[2]}-${uuidParts[3]}-${uuidParts[4]}`;
              jointHostsNeeded.add(hostChildUuid);
            }
          }
        });
        
        // Load joint host connections and store them locally for immediate use
        const localJointHostConnections = { ...jointHostConnections };
        if (jointHostsNeeded.size > 0) {
          console.log(`🔄 Loading connections for ${jointHostsNeeded.size} joint host children before sending invitations...`);
          for (const hostChildUuid of Array.from(jointHostsNeeded)) {
            if (!localJointHostConnections[hostChildUuid]) {
              console.log(`🔄 Loading missing joint host connections for ${hostChildUuid}...`);
              try {
                const response = await apiService.getChildConnections(hostChildUuid);
                if (response.success && response.data) {
                  const connectedChildren: any[] = [];
                  response.data.forEach((item: any) => {
                    const status = item.status || item.connection_status || 'accepted';
                    if (status === 'accepted' || status === 'connected' || status === 'active') {
                      connectedChildren.push({
                        id: item.connected_child_uuid || item.child_uuid || item.uuid,
                        uuid: item.connected_child_uuid || item.child_uuid || item.uuid, 
                        name: item.connected_child_name || item.child_name || item.name,
                        parentName: item.connected_parent_name || item.parent_name || item.parentname,
                        parentUuid: item.connected_parent_uuid || item.parent_uuid || item.parentuuid,
                        parent_id: item.connected_parent_id || item.parent_id,
                        family_name: item.connected_family_name || item.family_name,
                        status: status
                      });
                    }
                  });
                  localJointHostConnections[hostChildUuid] = connectedChildren;
                  console.log(`✅ Loaded ${connectedChildren.length} connections for joint host ${hostChildUuid}`);
                }
              } catch (error) {
                console.error(`❌ Failed to load connections for joint host ${hostChildUuid}:`, error);
              }
            }
          }
        }
        
        // Group invitations by host child for joint hosting
        const invitationsByHost = new Map();
        
        for (const childId of selectedConnectedChildren) {
          if (typeof childId === 'string' && (childId.includes('pending-child-') || childId.startsWith('pending-child-') || childId.includes('main-pending-child-'))) {
            console.log('Skipping pending connection invitation:', childId);
            continue;
          }
          
          let hostChildUuid = child.uuid; // Default to main host
          let actualChildId = childId;
          
          // Parse prefixed IDs for joint hosting
          if (typeof childId === 'string') {
            if (childId.startsWith('main-')) {
              hostChildUuid = child.uuid;
              actualChildId = childId.replace('main-', '');
            } else if (childId.startsWith('joint-')) {
              // Format: joint-{hostChildUuid}-{connectedChildId}
              const withoutPrefix = childId.substring(6); // Remove 'joint-'
              const uuidParts = withoutPrefix.split('-');
              if (uuidParts.length >= 5) {
                // Reconstruct the full host child UUID (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
                hostChildUuid = `${uuidParts[0]}-${uuidParts[1]}-${uuidParts[2]}-${uuidParts[3]}-${uuidParts[4]}`;
                // The rest is the connected child UUID
                actualChildId = uuidParts.slice(5).join('-');
              }
            }
          }
          
          if (!invitationsByHost.has(hostChildUuid)) {
            invitationsByHost.set(hostChildUuid, []);
          }
          invitationsByHost.get(hostChildUuid).push(actualChildId);
        }
        
        console.log('🎯 Invitations grouped by host:', Array.from(invitationsByHost.entries()));
        
        // Send invitations from each host child - handle both single and recurring activities
        for (const [hostChildUuid, childIds] of Array.from(invitationsByHost.entries())) {
          const hostChild = hostChildUuid === child.uuid ? child : parentChildren.find(pc => pc.uuid === hostChildUuid);
          if (!hostChild) continue;
          
          // Since createdActivities doesn't include child_uuid info, we need to split activities
          // between hosts. For joint hosting with N total hosts, activities are created as pairs:
          // [primary_activity1, joint_activity1, primary_activity2, joint_activity2, ...]
          let hostActivities = [];
          
          if (jointHostChildren.length === 0) {
            // No joint hosting - all activities belong to primary host
            hostActivities = createdActivities;
          } else if (hostChildUuid === child.uuid) {
            // Primary host gets activities at even indices (0, 2, 4, ...)
            hostActivities = createdActivities.filter((_, index) => index % 2 === 0);
          } else {
            // Joint host gets activities at odd indices (1, 3, 5, ...)
            // For now, assuming only 1 joint host (Zoe Wong)
            hostActivities = createdActivities.filter((_, index) => index % 2 === 1);
          }
          
          console.log(`🎯 Found ${hostActivities.length} activities for host ${hostChild.name}`);
          
          for (const actualChildId of childIds) {
            try {
              // Find the connected child from the appropriate connections array
              let connectedChild: any;
              if (hostChildUuid === child.uuid) {
                // Main host - search in main connectedChildren array
                connectedChild = connectedChildren.find(cc => cc.uuid === actualChildId);
                console.log(`🔍 Looking for connected child with ID: ${actualChildId} in main host connections`, connectedChild);
              } else {
                // Joint host - search in localJointHostConnections
                const jointConnections = localJointHostConnections[hostChildUuid] || [];
                connectedChild = jointConnections.find(cc => cc.uuid === actualChildId);
                console.log(`🔍 Looking for connected child with ID: ${actualChildId} in joint host connections for ${hostChild?.name}`, connectedChild);
                console.log(`🔍 Available joint connections for ${hostChild?.name}:`, jointConnections.map(jc => ({ name: jc.name, uuid: jc.uuid })));
              }
              
              if (connectedChild) {
                console.log(`📧 Sending ${hostActivities.length} recurring invitations from ${hostChild.name} to ${connectedChild.name}`);
                
                if (!connectedChild.parentUuid) {
                  console.error(`❌ Parent UUID is missing for connected child:`, connectedChild);
                  console.error(`❌ Available parent fields:`, {
                    parentUuid: connectedChild.parentUuid,
                    parent_id: connectedChild.parent_id,
                    parentName: connectedChild.parentName
                  });
                }
                
                // Send invitations for ALL activities of this host
                const hostInvitePromises = hostActivities.map(async (hostActivity, index) => {
                  console.log(`📧 Sending invitation ${index + 1}/${hostActivities.length} from ${hostChild.name} to ${connectedChild.name}`);
                  console.log(`🎯 Using activity: ${hostActivity.uuid} - ${hostActivity.name} on ${hostActivity.start_date}`);
                  
                  try {
                    await apiService.sendActivityInvitation(
                      hostActivity.uuid || String(hostActivity.id),
                      connectedChild.parentUuid || connectedChild.parent_id,
                      actualChildId,
                      `${hostChild.name} would like to invite your child to join: ${hostActivity.name}`
                    );
                    console.log(`✅ Invitation ${index + 1}/${hostActivities.length} sent successfully`);
                    return { success: true };
                  } catch (error) {
                    console.error(`❌ Failed to send invitation ${index + 1}/${hostActivities.length}:`, error);
                    return { success: false, error };
                  }
                });
                
                // Wait for all invitations to be sent
                const results = await Promise.all(hostInvitePromises);
                const successCount = results.filter(r => r.success).length;
                const failedCount = results.length - successCount;
                
                console.log(`✅ Joint host invitations result for ${connectedChild.name}: ${successCount}/${hostActivities.length} sent successfully, ${failedCount} failed`);
              } else {
                console.error(`❌ Could not find connected child with ID: ${actualChildId}`);
              }
            } catch (inviteError) {
              console.error(`💥 Error sending invitations from ${hostChild.name} to child ${actualChildId}:`, inviteError);
            }
          }
        }
      }

      // Show template save prompt after successful activity creation
      const shouldShowTemplatePrompt = createdActivities.length > 0;
      console.log('🎯 Template prompt check:', { 
        shouldShowTemplatePrompt, 
        createdActivitiesLength: createdActivities.length,
        activityName: newActivity.name 
      });

      // Capture template data BEFORE resetting the form
      let templateData: any = null;
      if (shouldShowTemplatePrompt) {
        // Calculate duration if both start and end times are provided
        let durationHours = null;
        if (newActivity.start_time && newActivity.end_time) {
          const [startHour, startMin] = newActivity.start_time.split(':').map(Number);
          const [endHour, endMin] = newActivity.end_time.split(':').map(Number);
          
          const startMinutes = startHour * 60 + startMin;
          const endMinutes = endHour * 60 + endMin;
          durationHours = (endMinutes - startMinutes) / 60;
          if (durationHours < 0) durationHours += 24; // Handle overnight activities
        }

        templateData = {
          name: newActivity.name,
          description: newActivity.description || null,
          location: newActivity.location || null,
          website_url: newActivity.website_url || null,
          activity_type: null, // Could be enhanced to detect or allow user to specify
          cost: newActivity.cost ? parseFloat(newActivity.cost) : null,
          max_participants: newActivity.max_participants ? parseInt(newActivity.max_participants) : null,
          typical_start_time: newActivity.start_time || null,
          typical_duration_hours: durationHours,
          auto_notify_new_connections: newActivity.auto_notify_new_connections || false
        };
        console.log('🎯 Template data created:', templateData);
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
      setJointHostChildren([]);
      setSelectedTemplate(null);
      setTemplateConfirmationMessage('');
      clearActivityDraft(); // Clear the saved draft after successful creation
      
      // Reload activities to include the newly created activity
      console.log('🎯 About to reload activities - FORCE RELOAD after activity creation');
      console.log('🎯 Just created these activity UUIDs:', createdActivities.map(a => a.uuid || a.activity_uuid));
      // Force reload by clearing the cache date range first AND using forceRefresh=true
      setCurrentDateRange(null);
      await loadActivities(true); // FORCE refresh regardless of month change
      console.log('🎯 After reloading activities - forced cache clear');
      
      // Show template dialog AFTER everything else is done, using setTimeout to ensure it renders
      console.log('🎯 Template dialog decision:', { 
        shouldShowTemplatePrompt, 
        templateData, 
        hasTemplateData: !!templateData,
        willShowDialog: shouldShowTemplatePrompt && !!templateData
      });
      
      if (shouldShowTemplatePrompt && templateData) {
        console.log('🎯 Setting up template dialog with timeout...');
        const successMessage = isRecurringActivity && createdActivities.length > 1
          ? `🔄 Recurring activity series created! ${createdActivities.length} activities scheduled over the next 2 months.`
          : createdActivities.length === 1 
            ? 'Activity created successfully!' 
            : `${createdActivities.length} activities created successfully!`;
        
        // Use setTimeout to ensure dialog shows after re-render
        setTimeout(() => {
          console.log('🎯 Timeout executed, setting template dialog state');
          setTemplateDialogMessage(
            `🎉 ${successMessage}\n\n` +
            `💾 SAVE AS TEMPLATE?\n\n` +
            `Would you like to save "${templateData.name}" as a reusable template?\n` +
            `This will help you create similar activities faster in the future.`
          );
          setDialogTemplateData(templateData);
          setShowTemplateDialog(true);
          console.log('🎯 Template dialog should now be visible via timeout');
        }, 100);
      } else {
        // Just show success message if no template prompt needed, then navigate
        const message = isRecurringActivity && createdActivities.length > 1
          ? `🔄 Recurring activity series created! ${createdActivities.length} activities scheduled over the next 2 months.`
          : createdActivities.length === 1 
            ? 'Activity created successfully!' 
            : `${createdActivities.length} activities created successfully!`;
        alert(message);
        
        // Navigate back to activities list (only when no template dialog)
        console.log('🏠 Activity created successfully, navigating back to main activities list');
        // Force refresh when returning to calendar
        setCurrentDateRange(null);
        if (onBack) {
          console.log('🔙 Using onBack to return to main activities URL');
          onBack();
        } else {
          console.log('📝 Using navigateToPage as fallback');
          navigateToPage('main');
        }
      }
      
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

  const handleSendInvitation = async (invitedParentUuid: string, childUuid?: string) => {
    if (!invitingActivity) return;

    try {
      const response = await apiService.sendActivityInvitation(
        invitingActivity.uuid || invitingActivity.activity_uuid || String(invitingActivity.id), 
        invitedParentUuid, 
        childUuid, 
        invitationMessage
      );
      
      if (response.success) {
        alert('Invitation sent successfully!');
        goBack();
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
        activity.uuid || String(activity.id),
        child.parentUuid,
        typeof child.uuid === 'string' ? child.uuid : undefined,
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
      const activityUuid = activity.activity_uuid || activity.uuid;
      if (!activityUuid) {
        alert('Activity UUID not found. Cannot update attendance status.');
        return;
      }
      
      const response = await apiService.markActivityCantAttend(activityUuid);
      if (response.success) {
        alert('Activity marked as "Can\'t Attend". The activity will show as grey in your calendar and guests will be notified.');
        loadActivities();
        goBack();
      } else {
        alert(`Failed to update attendance status: ${response.error}`);
      }
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
    if (activity.is_host === false && activity.invitation_status === 'rejected') {
      return {
        background: 'linear-gradient(135deg, #a0aec0, #cbd5e0)',
        borderColor: '#718096'
      };
    }
    
    // Grey for activities where host can't attend
    if (activity.host_cant_attend === true) {
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
        invitationId: invitation.invitation_uuid,
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
        invitationId: invitation.invitation_uuid,
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
        invitationId: invitation.invitation_uuid,
        hostParent: invitation.host_parent_username,
        host_child_name: invitation.host_child_name,
        host_parent_name: invitation.host_parent_username
      }));
      
      // Since activities now come with is_shared property from backend, just use them directly
      // and add any invitation-only activities that don't have corresponding activities
      const invitationOnlyActivities = [
        ...dayInvitedActivities.filter(inv => !dayActivities.some(act => act.uuid === inv.uuid || act.id === inv.id)).map(invitation => ({
          ...invitation,
          id: `accepted-${invitation.id}`,
          activity_id: invitation.id,
          name: invitation.activity_name,
          description: invitation.activity_description,
          isAcceptedInvitation: true,
          showAcceptedIcon: !invitation.viewed_at,
          invitationId: invitation.invitation_uuid,
          host_child_name: invitation.host_child_name,
          host_parent_name: invitation.host_parent_username,
          is_shared: true
        })),
        ...dayPendingInvitations.filter(inv => !dayActivities.some(act => act.uuid === inv.uuid || act.id === inv.id)).map(invitation => ({
          ...invitation,
          id: `invitation-${invitation.id}`,
          activity_id: invitation.id,
          name: invitation.activity_name,
          description: invitation.activity_description,
          isPendingInvitation: true,
          showEnvelope: !invitation.viewed_at,
          invitationId: invitation.invitation_uuid,
          host_child_name: invitation.host_child_name,
          host_parent_name: invitation.host_parent_username
        })),
        ...dayDeclinedInvitations.filter(inv => !dayActivities.some(act => act.uuid === inv.uuid || act.id === inv.id)).map(invitation => ({
          ...invitation,
          id: `declined-${invitation.id}`,
          activity_id: invitation.id,
          name: invitation.activity_name,
          description: invitation.activity_description,
          isDeclinedInvitation: true,
          showDeclinedIcon: !invitation.viewed_at,
          invitationId: invitation.invitation_uuid,
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
    
    // Check for month change when navigating weeks
    console.log(`📅 ChildActivityScreen - Week navigated ${direction}, checking for month change`);
    setTimeout(() => loadActivities(), 100); // Small delay to ensure state is updated
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

  const goBack = () => {
    // Always use logical navigation back to the page they came from
    // This goes back to the main child activities page, not browser history
    
    // Scroll to top before navigating back
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    if (onBack) {
      onBack();
    } else {
      // Fallback: go to main page instead of browser back
      navigateToPage('main');
    }
  };

  // Render different pages based on currentPage state
  console.log('🎬 Render - currentPage:', currentPage, 'selectedActivity:', selectedActivity?.name);
  
  if (currentPage === 'activity-detail' && selectedActivity) {
    console.log('🎯 Rendering activity detail page for:', selectedActivity.name);
    console.log('📊 Activity details:', {
      name: selectedActivity.name,
      is_host: selectedActivity.is_host,
      isPendingInvitation: (selectedActivity as any).isPendingInvitation,
      isAcceptedInvitation: (selectedActivity as any).isAcceptedInvitation,
      description: selectedActivity.description
    });
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
                {selectedActivity.is_host && !(selectedActivity as any).isPendingInvitation && !(selectedActivity as any).isAcceptedInvitation && !(selectedActivity as any).isRejectedInvitation ? (
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
                {selectedActivity.is_host && !(selectedActivity as any).isPendingInvitation && !(selectedActivity as any).isAcceptedInvitation && !(selectedActivity as any).isRejectedInvitation ? (
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
              
              {/* Activity Calendar Display - Always show the activity date */}
              {selectedActivity.start_date && (
                <div className="date-selection-section">
                  <label className="section-label">Activity Date</label>
                  <p className="section-description">This activity is scheduled for the highlighted date.</p>
                  <CalendarDatePicker
                    selectedDates={[selectedActivity.start_date.split('T')[0]]}
                    onChange={() => {}} // Read-only for viewing
                  />
                </div>
              )}

              <div className="form-row-group">
                <div className="form-row">
                  <label><strong>Start Time:</strong></label>
                  {selectedActivity.is_host && !(selectedActivity as any).isPendingInvitation && !(selectedActivity as any).isAcceptedInvitation && !(selectedActivity as any).isRejectedInvitation ? (
                    <TimePickerDropdown
                      value={newActivity.start_time}
                      onChange={(time) => setNewActivity({...newActivity, start_time: time})}
                      placeholder="Start time"
                      defaultScrollPosition="start"
                    />
                  ) : (
                    <span className="readonly-value">🕐 {selectedActivity.start_time ? formatTime(selectedActivity.start_time) : 'All day'}</span>
                  )}
                </div>

                <div className="form-row">
                  <label><strong>End Time:</strong></label>
                  {selectedActivity.is_host && !(selectedActivity as any).isPendingInvitation && !(selectedActivity as any).isAcceptedInvitation && !(selectedActivity as any).isRejectedInvitation ? (
                    <TimePickerDropdown
                      value={newActivity.end_time}
                      onChange={(time) => setNewActivity({...newActivity, end_time: time})}
                      placeholder="End time"
                      defaultScrollPosition="end"
                    />
                  ) : (
                    <span className="readonly-value">{selectedActivity.end_time ? formatTime(selectedActivity.end_time) : 'Not set'}</span>
                  )}
                </div>
              </div>

              <div className="form-row">
                <label><strong>Location:</strong></label>
                {selectedActivity.is_host && !(selectedActivity as any).isPendingInvitation && !(selectedActivity as any).isAcceptedInvitation && !(selectedActivity as any).isRejectedInvitation ? (
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
                {selectedActivity.is_host && !(selectedActivity as any).isPendingInvitation && !(selectedActivity as any).isAcceptedInvitation && !(selectedActivity as any).isRejectedInvitation ? (
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
                  {selectedActivity.is_host && !(selectedActivity as any).isPendingInvitation && !(selectedActivity as any).isAcceptedInvitation && !(selectedActivity as any).isRejectedInvitation ? (
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
                  {selectedActivity.is_host && !(selectedActivity as any).isPendingInvitation && !(selectedActivity as any).isAcceptedInvitation && !(selectedActivity as any).isRejectedInvitation ? (
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
                          const validParticipants = activityParticipants.participants.filter((participant: any) => participant.child_name && participant.child_uuid);
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
                                {participant.status === 'rejected' && (
                                  <span style={{ color: '#a0aec0', fontSize: '12px' }}>❌ Rejected</span>
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
            
            {/* Invite More Children - Inline Checkboxes */}
            {selectedActivity.is_host && !(selectedActivity as any).isPendingInvitation && !(selectedActivity as any).isAcceptedInvitation && !(selectedActivity as any).isRejectedInvitation && (
              <div className="invite-children-section">
                <div className="children-selection-header">
                  <label>Invite More Children:</label>
                  {(connectedChildren.length > 0 || pendingConnectionRequests.length > 0) && (
                    <div className="selection-controls">
                      <button
                        type="button"
                        onClick={() => {
                          const availableConnectedChildren = connectedChildren.filter(child => {
                            const isAlreadyInvited = activityParticipants?.participants?.some((p: any) => p.child_uuid === child.uuid);
                            return !isAlreadyInvited;
                          });
                          const allConnectedUuids = availableConnectedChildren.map(child => child.uuid);
                          
                          const availablePendingRequests = pendingConnectionRequests.filter(request => {
                            const targetChildUuid = request.target_child_uuid;
                            const targetParentUuid = request.target_parent_uuid;
                            const isAlreadyConnected = connectedChildren.some(child => 
                              child.uuid === targetChildUuid || 
                              child.parent_uuid === targetParentUuid ||
                              child.parent_id === request.target_parent_id
                            );
                            const isAlreadyInvited = activityParticipants?.participants?.some((p: any) => 
                              p.child_uuid === targetChildUuid
                            );
                            return !isAlreadyConnected && !isAlreadyInvited;
                          });
                          const allPendingIds = availablePendingRequests.map(request => `pending-child-${request.target_child_uuid || request.target_parent_uuid}`);
                          const allIds = [...allConnectedUuids, ...allPendingIds];
                          
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
                          const availableConnectedChildren = connectedChildren.filter(child => {
                            const isAlreadyInvited = activityParticipants?.participants?.some((p: any) => p.child_uuid === child.uuid);
                            return !isAlreadyInvited;
                          });
                          const availablePendingRequests = pendingConnectionRequests.filter(request => {
                            const targetChildUuid = request.target_child_uuid;
                            const targetParentUuid = request.target_parent_uuid;
                            const isAlreadyConnected = connectedChildren.some(child => 
                              child.uuid === targetChildUuid || 
                              child.parent_uuid === targetParentUuid ||
                              child.parent_id === request.target_parent_id
                            );
                            const isAlreadyInvited = activityParticipants?.participants?.some((p: any) => 
                              p.child_uuid === targetChildUuid
                            );
                            return !isAlreadyConnected && !isAlreadyInvited;
                          });
                          const allConnectedUuids = availableConnectedChildren.map(child => child.uuid);
                          const allPendingIds = availablePendingRequests.map(request => `pending-child-${request.target_child_uuid || request.target_parent_uuid}`);
                          const allIds = [...allConnectedUuids, ...allPendingIds];
                          const allSelected = allIds.every(id => selectedConnectedChildren.includes(id));
                          const totalCount = availableConnectedChildren.length + availablePendingRequests.length;
                          return `${allSelected ? 'Deselect All' : 'Select All'} (${totalCount})`;
                        })()}
                      </button>
                    </div>
                  )}
                </div>

                {connectedChildren.length === 0 && pendingConnectionRequests.length === 0 ? (
                  <p style={{ fontSize: '14px', color: '#666', fontStyle: 'italic' }}>
                    No connected children found. Connect with other families first to invite their children.
                  </p>
                ) : (
                  <>
                    <div className="children-list">
                      {/* Confirmed connections */}
                      {connectedChildren
                        .filter(child => {
                          const isAlreadyInvited = activityParticipants?.participants?.some((p: any) => p.child_uuid === child.uuid);
                          return !isAlreadyInvited;
                        })
                        .map((connectedChild) => (
                          <label key={connectedChild.uuid} className="child-checkbox">
                            <input
                              type="checkbox"
                              checked={selectedConnectedChildren.includes(connectedChild.uuid)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedConnectedChildren([...selectedConnectedChildren, connectedChild.uuid]);
                                } else {
                                  setSelectedConnectedChildren(
                                    selectedConnectedChildren.filter(id => id !== connectedChild.uuid)
                                  );
                                }
                              }}
                            />
                            ✅ {connectedChild.name}
                          </label>
                        ))}
                      
                      {/* Pending connection requests */}
                      {pendingConnectionRequests
                        .filter((request) => {
                          // Don't show pending connections if they're already invited to this activity
                          const isAlreadyInvited = activityParticipants?.participants?.some((p: any) => 
                            p.child_uuid === request.target_child_uuid
                          );
                          return !isAlreadyInvited;
                        })
                        .map((request) => (
                          <label key={`pending-${request.id}`} className="child-checkbox" style={{ opacity: 0.7 }}>
                            <input
                              type="checkbox"
                              checked={selectedConnectedChildren.includes(`pending-child-${request.target_child_uuid || request.target_parent_uuid}`)}
                              onChange={(e) => {
                                const pendingId = `pending-child-${request.target_child_uuid || request.target_parent_uuid}`;
                                if (e.target.checked) {
                                  setSelectedConnectedChildren([...selectedConnectedChildren, pendingId]);
                                } else {
                                  setSelectedConnectedChildren(
                                    selectedConnectedChildren.filter(id => id !== pendingId)
                                  );
                                }
                              }}
                            />
                            ⏳ {request.target_child_name || `${request.target_parent_name || request.target_family_name || 'Unknown Parent'} (Any Child)`} - <em style={{ fontSize: '12px' }}>pending connection</em>
                          </label>
                        ))}
                      
                      {connectedChildren.filter(child => {
                        const isAlreadyInvited = activityParticipants?.participants?.some((p: any) => p.child_uuid === child.uuid);
                        return !isAlreadyInvited;
                      }).length === 0 && pendingConnectionRequests.filter(request => {
                        const isAlreadyInvited = activityParticipants?.participants?.some((p: any) => 
                          p.child_uuid === request.target_child_uuid
                        );
                        return !isAlreadyInvited;
                      }).length === 0 && (
                        <p style={{ fontSize: '14px', color: '#666', fontStyle: 'italic' }}>
                          All connected children have already been invited to this activity.
                        </p>
                      )}
                    </div>

                  </>
                )}
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
            {(((selectedActivity as any).isPendingInvitation && (selectedActivity as any).invitationUuid) || 
              (invitationData?.isPendingInvitation && invitationData?.invitationUuid)) && (
              <>
                <button
                  onClick={() => {
                    const invitationUuid = (selectedActivity as any).invitationUuid || invitationData?.invitationUuid;
                    console.log('🎯 Accepting invitation with UUID:', invitationUuid);
                    handleInvitationResponse(invitationUuid, 'accept');
                  }}
                  className="confirm-btn"
                  style={{ background: 'linear-gradient(135deg, #48bb78, #68d391)', marginRight: '8px' }}
                >
                  ✅ Accept Invitation
                </button>
                <button
                  onClick={() => {
                    const invitationUuid = (selectedActivity as any).invitationUuid || invitationData?.invitationUuid;
                    console.log('🎯 Declining invitation with UUID:', invitationUuid);
                    handleInvitationResponse(invitationUuid, 'reject');
                  }}
                  className="cancel-btn"
                  style={{ background: 'linear-gradient(135deg, #e53e3e, #fc8181)', color: 'white' }}
                >
                  ❌ Decline Invitation
                </button>
              </>
            )}
            
            {/* Show decline button for accepted invitations */}
            {(selectedActivity as any).isAcceptedInvitation && (selectedActivity as any).invitationUuid && (
              <button
                onClick={() => handleInvitationResponse((selectedActivity as any).invitationUuid!, 'reject')}
                className="cancel-btn"
                style={{ background: 'linear-gradient(135deg, #e53e3e, #fc8181)', color: 'white' }}
              >
                ❌ Change to Declined
              </button>
            )}
            
            {/* Show accept button for rejected invitations */}
            {(selectedActivity as any).isRejectedInvitation && (selectedActivity as any).invitationUuid && (
              <button
                onClick={() => handleInvitationResponse((selectedActivity as any).invitationUuid!, 'accept')}
                className="confirm-btn"
                style={{ background: 'linear-gradient(135deg, #48bb78, #68d391)', color: 'white' }}
              >
                ✅ Accept Invitation
              </button>
            )}
            
            {/* Show enhanced buttons for activity host */}
            {selectedActivity.is_host && !(selectedActivity as any).isPendingInvitation && !(selectedActivity as any).isAcceptedInvitation && !(selectedActivity as any).isRejectedInvitation && (
              <>
                <button
                  onClick={handleUpdateActivity}
                  className="confirm-btn"
                  style={{ background: 'linear-gradient(135deg, #28a745, #34ce57)' }}
                >
                  💾 Save Changes{selectedConnectedChildren.length > 0 ? ` & Send Invitations (${selectedConnectedChildren.length})` : ''}
                </button>
                <button
                  onClick={() => handleHostCantAttend(selectedActivity)}
                  className="cancel-btn"
                  style={{ background: 'linear-gradient(135deg, #ff8c00, #ffa500)', color: 'white' }}
                >
                  😞 Can't Attend
                </button>
                <button
                  onClick={() => handleDeleteActivity(selectedActivity)}
                  className="cancel-btn"
                  style={{ background: 'linear-gradient(135deg, #e53e3e, #fc8181)', color: 'white' }}
                >
                  🗑️ Delete Activity
                </button>
              </>
            )}
            
            {/* For non-host activities, show informational text (only when no invitation buttons are shown) */}
            {!selectedActivity.is_host && 
             !(selectedActivity as any).isPendingInvitation && !(selectedActivity as any).isAcceptedInvitation && !(selectedActivity as any).isRejectedInvitation &&
             !invitationData?.isPendingInvitation && !invitationData?.isAcceptedInvitation && (
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
        
        {/* Delete Activity Dialog for Recurring Activities */}
        {(() => {
          console.log('🎭 Dialog render check (ACTIVITY-DETAIL):', { showDeleteDialog, deleteDialogActivity: deleteDialogActivity?.name, shouldRender: showDeleteDialog && deleteDialogActivity });
          return null;
        })()}
        {showDeleteDialog && deleteDialogActivity && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000
          }}>
            <div style={{
              background: 'white',
              padding: '24px',
              borderRadius: '12px',
              maxWidth: '400px',
              margin: '20px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
            }}>
              <h3 style={{ 
                marginTop: 0, 
                marginBottom: '16px', 
                color: '#e53e3e', 
                fontWeight: '600',
                fontSize: '18px' 
              }}>
                🗑️ Delete Recurring Activity
              </h3>
              <p style={{ 
                marginBottom: '20px', 
                lineHeight: '1.6',
                color: '#4a5568'
              }}>
                This activity "<strong>{deleteDialogActivity.name}</strong>" is part of a recurring series.
              </p>
              <p style={{ 
                marginBottom: '24px', 
                lineHeight: '1.6',
                color: '#4a5568' 
              }}>
                What would you like to delete?
              </p>
              <div style={{ 
                display: 'flex', 
                gap: '12px',
                flexDirection: 'column'
              }}>
                <button
                  onClick={() => {
                    handleDeleteDialogClose();
                    deleteActivity(deleteDialogActivity, false);
                  }}
                  style={{
                    padding: '12px 16px',
                    background: 'linear-gradient(135deg, #fd7e14, #fd7e14)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Delete just this occurrence
                </button>
                <button
                  onClick={() => {
                    handleDeleteDialogClose();
                    deleteActivity(deleteDialogActivity, true);
                  }}
                  style={{
                    padding: '12px 16px',
                    background: 'linear-gradient(135deg, #e53e3e, #fc8181)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Delete entire series
                </button>
                <button
                  onClick={handleDeleteDialogClose}
                  style={{
                    padding: '12px 16px',
                    background: 'linear-gradient(135deg, #6c757d, #6c757d)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
        
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
            {/* Activity Name and Template Selection Row */}
            <div style={{ 
              display: 'flex', 
              gap: '12px', 
              alignItems: 'flex-start',
              marginBottom: '16px'
            }}>
              <div style={{ flex: '1' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: '600', 
                  color: '#2d3748',
                  fontSize: '16px'
                }}>
                  Activity Name *
                </label>
                <input
                  type="text"
                  placeholder="Enter activity name"
                  value={newActivity.name}
                  onChange={(e) => setNewActivity({...newActivity, name: e.target.value})}
                  className="modal-input"
                  autoFocus
                  style={{
                    width: '100%',
                    marginBottom: '0'
                  }}
                />
              </div>
              
              <div style={{ width: '200px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: '600', 
                  color: '#2d3748',
                  fontSize: '16px'
                }}>
                  OR Use Template
                </label>
                {loadingTemplates ? (
                  <div style={{ 
                    padding: '12px', 
                    background: '#f8f9fa', 
                    borderRadius: '8px',
                    color: '#666',
                    textAlign: 'center',
                    fontSize: '14px'
                  }}>
                    Loading...
                  </div>
                ) : (
                  <select
                    value={selectedTemplate ? selectedTemplate.uuid : ''}
                    onChange={(e) => {
                      const selectedUuid = e.target.value;
                      if (selectedUuid === '') {
                        handleTemplateSelect(null);
                      } else {
                        const template = activityTemplates.find(t => t.uuid === selectedUuid);
                        if (template) {
                          handleTemplateSelect(template);
                        }
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      fontSize: '14px',
                      backgroundColor: 'white',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="">None</option>
                    {activityTemplates.length === 0 ? (
                      <option value="" disabled style={{ fontStyle: 'italic', color: '#999' }}>
                        No templates yet
                      </option>
                    ) : (
                      activityTemplates.map((template) => (
                        <option key={template.uuid} value={template.uuid}>
                          {template.name}
                          {template.usage_count > 0 && ` (${template.usage_count}x)`}
                        </option>
                      ))
                    )}
                  </select>
                )}
              </div>
            </div>
            
            {/* Template Confirmation Message */}
            {templateConfirmationMessage && (
              <div style={{
                marginBottom: '16px',
                padding: '12px',
                background: '#d4edda',
                color: '#155724',
                borderRadius: '8px',
                border: '1px solid #c3e6cb',
                fontSize: '14px'
              }}>
                ✅ {templateConfirmationMessage}
              </div>
            )}
            <textarea
              placeholder="Description"
              value={newActivity.description}
              onChange={(e) => setNewActivity({...newActivity, description: e.target.value})}
              className="modal-textarea"
              rows={3}
            />
            
            {/* Joint Host Selection */}
            {parentChildren.length > 0 ? (
              <div className="joint-host-section" style={{ marginBottom: '20px' }}>
                <label className="section-label">Joint Host Children (Optional)</label>
                <p className="section-description">
                  Select additional children to co-host this activity. The activity will appear in all selected children's calendars.
                </p>
                <div className="children-list" style={{ marginTop: '12px' }}>
                  {parentChildren.filter((sibling: any) => sibling.uuid !== child.uuid).map((sibling: any) => (
                    <label key={sibling.uuid} className="child-checkbox" style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      padding: '8px 12px', 
                      marginBottom: '8px',
                      background: '#f8f9fa',
                      borderRadius: '8px',
                      border: '1px solid #e9ecef'
                    }}>
                      <input
                        type="checkbox"
                        checked={jointHostChildren.includes(sibling.uuid)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setJointHostChildren([...jointHostChildren, sibling.uuid]);
                          } else {
                            setJointHostChildren(jointHostChildren.filter(uuid => uuid !== sibling.uuid));
                          }
                        }}
                        style={{ marginRight: '8px' }}
                      />
                      <span style={{ fontWeight: '500' }}>{sibling.name}</span>
                      {sibling.birth_date && (
                        <span style={{ 
                          marginLeft: '8px', 
                          fontSize: '14px', 
                          color: '#666',
                          fontStyle: 'italic'
                        }}>
                          (Age: {Math.floor((new Date().getTime() - new Date(sibling.birth_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000))})
                        </span>
                      )}
                    </label>
                  ))}
                </div>
              </div>
            ) : (
              /* Debug info for when joint host section is not shown */
              <div style={{
                padding: '12px',
                background: '#fff3cd',
                border: '1px solid #ffeaa7',
                borderRadius: '8px',
                marginBottom: '20px',
                fontSize: '14px'
              }}>
                <strong>🔍 Debug: Joint Host Section Hidden</strong>
                <br />
                Parent children found: {parentChildren.length}
                <br />
                Current child: {child.name} (UUID: {child.uuid})
                <br />
                <em>Check browser console for detailed debugging info</em>
              </div>
            )}
            
            <div className="date-selection-section">
              <label className="section-label">Activity Schedule</label>
              <div className="recurring-toggle" style={{ marginBottom: '16px' }}>
                <div className="toggle-options">
                  <label className="radio-option" style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    padding: '12px 16px', 
                    margin: '8px 0',
                    background: !isRecurringActivity ? '#e6f3ff' : '#f8f9fa',
                    borderRadius: '8px',
                    border: !isRecurringActivity ? '2px solid #0066cc' : '1px solid #e2e8f0',
                    cursor: 'pointer'
                  }}>
                    <input
                      type="radio"
                      name="activityType"
                      checked={!isRecurringActivity}
                      onChange={() => {
                        setIsRecurringActivity(false);
                        // Clear recurring-specific state when switching to single activity
                        setRecurringDaysOfWeek([]);
                        setRecurringStartDate('');
                      }}
                      style={{ marginRight: '8px' }}
                    />
                    <span>📅 Single Date Activity</span>
                  </label>
                  <label className="radio-option" style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    padding: '12px 16px', 
                    margin: '8px 0',
                    background: isRecurringActivity ? '#e6f3ff' : '#f8f9fa',
                    borderRadius: '8px',
                    border: isRecurringActivity ? '2px solid #0066cc' : '1px solid #e2e8f0',
                    cursor: 'pointer'
                  }}>
                    <input
                      type="radio"
                      name="activityType"
                      checked={isRecurringActivity}
                      onChange={() => {
                        setIsRecurringActivity(true);
                        // Clear single activity state when switching to recurring
                        setSelectedDates([]);
                        // Set default start date to today if not already set
                        if (!recurringStartDate) {
                          setRecurringStartDate(new Date().toISOString().split('T')[0]);
                        }
                      }}
                      style={{ marginRight: '8px' }}
                    />
                    <span>🔄 Recurring Activity (2 months)</span>
                  </label>
                </div>
              </div>

              {!isRecurringActivity ? (
                <div>
                  <p className="section-description">Click dates to select/deselect them. You can choose multiple dates.</p>
                  <CalendarDatePicker
                    selectedDates={selectedDates}
                    onChange={setSelectedDates}
                    minDate={new Date().toISOString().split('T')[0]}
                  />
                </div>
              ) : (
                <div className="recurring-options">
                  <p className="section-description">Select which days of the week this activity will repeat. It will run for 2 months starting from your chosen date.</p>
                  
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Start Date:</label>
                    <input
                      type="date"
                      value={recurringStartDate}
                      onChange={(e) => setRecurringStartDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      style={{
                        padding: '12px',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0',
                        fontSize: '16px',
                        width: '100%',
                        maxWidth: '200px'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '12px', fontWeight: '600' }}>Days of the Week:</label>
                    <div className="days-of-week-selector" style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(7, 1fr)', 
                      gap: '8px',
                      marginBottom: '16px'
                    }}>
                      {[
                        { day: 'Sun', value: 0 },
                        { day: 'Mon', value: 1 },
                        { day: 'Tue', value: 2 },
                        { day: 'Wed', value: 3 },
                        { day: 'Thu', value: 4 },
                        { day: 'Fri', value: 5 },
                        { day: 'Sat', value: 6 }
                      ].map((dayOption) => (
                        <label key={dayOption.value} style={{ 
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '16px 8px',
                          background: recurringDaysOfWeek.includes(dayOption.value) ? '#e6f3ff' : '#f8f9fa',
                          borderRadius: '8px',
                          border: recurringDaysOfWeek.includes(dayOption.value) ? '2px solid #0066cc' : '1px solid #e2e8f0',
                          cursor: 'pointer',
                          textAlign: 'center',
                          fontSize: '14px'
                        }}>
                          <input
                            type="checkbox"
                            checked={recurringDaysOfWeek.includes(dayOption.value)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setRecurringDaysOfWeek([...recurringDaysOfWeek, dayOption.value]);
                              } else {
                                setRecurringDaysOfWeek(recurringDaysOfWeek.filter(d => d !== dayOption.value));
                              }
                            }}
                            style={{ display: 'none' }}
                          />
                          <span style={{ fontWeight: '600', fontSize: '16px' }}>{dayOption.day}</span>
                        </label>
                      ))}
                    </div>
                    {recurringDaysOfWeek.length > 0 && (
                      <div style={{
                        padding: '12px',
                        background: '#d4edda',
                        color: '#155724',
                        borderRadius: '8px',
                        fontSize: '14px',
                        marginTop: '12px'
                      }}>
                        📋 This will create activities every{' '}
                        {recurringDaysOfWeek.map(day => 
                          ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][day]
                        ).join(', ')}{' '}
                        for 2 months starting from {recurringStartDate || 'selected date'}.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="time-row">
              <div className="time-field">
                <label>Start Time</label>
                <TimePickerDropdown
                  value={newActivity.start_time}
                  onChange={(time) => setNewActivity({...newActivity, start_time: time})}
                  placeholder="Start time"
                  defaultScrollPosition="start"
                />
              </div>
              <div className="time-field">
                <label>End Time</label>
                <TimePickerDropdown
                  value={newActivity.end_time}
                  onChange={(time) => setNewActivity({...newActivity, end_time: time})}
                  placeholder="End time"
                  defaultScrollPosition="end"
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
                  {jointHostChildren.length === 0 ? (
                    // Single host - show original UI
                    <>
                      <div className="children-selection-header">
                        <label>Invite Children:</label>
                        {(connectedChildren.length > 0 || pendingConnectionRequests.length > 0) && (
                          <div className="selection-controls">
                            <button
                              type="button"
                              onClick={() => {
                                const allConnectedUuids = connectedChildren.map(child => child.uuid);
                                const allPendingIds = pendingConnectionRequests.map(request => `pending-child-${request.target_child_uuid || request.target_parent_uuid}`);
                                const allIds = [...allConnectedUuids, ...allPendingIds];
                                
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
                                const allConnectedUuids = connectedChildren.map(child => child.uuid);
                                const allPendingIds = pendingConnectionRequests.map(request => `pending-child-${request.target_child_uuid || request.target_parent_uuid}`);
                                const allIds = [...allConnectedUuids, ...allPendingIds];
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
                        {jointHostChildren.length > 0 
                          ? `To invite other children, you'll need to connect with their families first. Note: Joint host children (${parentChildren.filter(pc => jointHostChildren.includes(pc.uuid)).map(pc => pc.name).join(', ')}) will automatically have access to this activity.`
                          : 'To invite other children to this activity, you\'ll need to connect with their families first.'
                        }
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
                      {/* Joint hosting explanation */}
                      {jointHostChildren.length > 0 && (
                        <div style={{
                          background: '#e3f2fd',
                          border: '1px solid #2196f3',
                          borderRadius: '8px',
                          padding: '12px',
                          marginBottom: '12px',
                          fontSize: '14px'
                        }}>
                          <strong>📝 Joint Hosting Active:</strong> Invitations will be sent from both {child.name} and {parentChildren.filter(pc => jointHostChildren.includes(pc.uuid)).map(pc => pc.name).join(', ')} to the selected children below. Each invited child will see separate invitations from each host child.
                        </div>
                      )}
                      
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
                            checked={selectedConnectedChildren.includes(`pending-child-${request.target_child_uuid || request.target_parent_uuid}`)}
                            onChange={(e) => {
                              const pendingId = `pending-child-${request.target_child_uuid || request.target_parent_uuid}`;
                              if (e.target.checked) {
                                setSelectedConnectedChildren([...selectedConnectedChildren, pendingId]);
                              } else {
                                setSelectedConnectedChildren(
                                  selectedConnectedChildren.filter(id => id !== pendingId)
                                );
                              }
                            }}
                          />
                          ⏳ {request.target_child_name || `${request.target_parent_name || request.target_family_name || 'Unknown Parent'} (Any Child)`} - <em style={{ fontSize: '12px' }}>pending connection</em>
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
                  
                    </>
                  ) : (
                    // Joint hosting - show separate sections for each host child
                    <div className="joint-host-invitations">
                      <div className="joint-host-header">
                        <h4>Invite Children by Host:</h4>
                        <p style={{ fontSize: '14px', color: '#666', marginBottom: '16px' }}>
                          Select which children to invite from each host's contacts. Invitations will be sent from the respective host child.
                        </p>
                      </div>
                      
                      {/* Main host child section */}
                      <div className="host-section" style={{ marginBottom: '20px' }}>
                        <div className="host-section-header" style={{ 
                          background: '#e3f2fd', 
                          padding: '12px', 
                          borderRadius: '8px', 
                          marginBottom: '12px',
                          border: '2px solid #2196f3'
                        }}>
                          <h5 style={{ margin: '0 0 4px 0', color: '#1976d2' }}>
                            👑 {child.name}'s Contacts (Primary Host)
                          </h5>
                          <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>
                            Invitations from this section will be sent by {child.name}
                          </p>
                        </div>
                        
                        {connectedChildren.length === 0 && pendingConnectionRequests.length === 0 ? (
                          <p style={{ fontSize: '14px', color: '#666', fontStyle: 'italic' }}>
                            No connections found for {child.name}
                          </p>
                        ) : (
                          <div className="children-list">
                            {connectedChildren.map((connectedChild) => (
                              <label key={`main-${connectedChild.id}`} className="child-checkbox">
                                <input
                                  type="checkbox"
                                  checked={selectedConnectedChildren.includes(`main-${connectedChild.id}`)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedConnectedChildren([...selectedConnectedChildren, `main-${connectedChild.id}`]);
                                    } else {
                                      setSelectedConnectedChildren(
                                        selectedConnectedChildren.filter(id => id !== `main-${connectedChild.id}`)
                                      );
                                    }
                                  }}
                                />
                                {connectedChild.status === 'pending' ? '⏳' : '✅'} {connectedChild.name}{connectedChild.status === 'pending' ? ' (pending)' : ''}
                              </label>
                            ))}
                            
                            {/* Pending connection requests for main host */}
                            {pendingConnectionRequests.map((request) => (
                              <label key={`main-pending-${request.id}`} className="child-checkbox" style={{ opacity: 0.7 }}>
                                <input
                                  type="checkbox"
                                  checked={selectedConnectedChildren.includes(`main-pending-child-${request.target_child_uuid || request.target_parent_uuid}`)}
                                  onChange={(e) => {
                                    const pendingId = `main-pending-child-${request.target_child_uuid || request.target_parent_uuid}`;
                                    if (e.target.checked) {
                                      setSelectedConnectedChildren([...selectedConnectedChildren, pendingId]);
                                    } else {
                                      setSelectedConnectedChildren(
                                        selectedConnectedChildren.filter(id => id !== pendingId)
                                      );
                                    }
                                  }}
                                />
                                ⏳ {request.target_child_name || `${request.target_parent_name || request.target_family_name || 'Unknown Parent'} (Any Child)`} - <em style={{ fontSize: '12px' }}>pending connection</em>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Joint host children sections */}
                      {jointHostChildren.map((jointChildUuid) => {
                        const jointChild = parentChildren.find(pc => pc.uuid === jointChildUuid);
                        if (!jointChild) return null;
                        
                        return (
                          <div key={jointChildUuid} className="host-section" style={{ marginBottom: '20px' }}>
                            <div className="host-section-header" style={{ 
                              background: '#f3e5f5', 
                              padding: '12px', 
                              borderRadius: '8px', 
                              marginBottom: '12px',
                              border: '2px solid #9c27b0'
                            }}>
                              <h5 style={{ margin: '0 0 4px 0', color: '#7b1fa2' }}>
                                🤝 {jointChild.name}'s Contacts (Joint Host)
                              </h5>
                              <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>
                                Invitations from this section will be sent by {jointChild.name}
                              </p>
                            </div>
                            
                            {(() => {
                              const jointChildConnections = jointHostConnections[jointChildUuid] || [];
                              
                              if (jointChildConnections.length === 0) {
                                return (
                                  <p style={{ fontSize: '14px', color: '#666', fontStyle: 'italic' }}>
                                    {jointHostConnections[jointChildUuid] === undefined 
                                      ? `Loading connections for ${jointChild.name}...`
                                      : `No connections found for ${jointChild.name}`
                                    }
                                  </p>
                                );
                              }
                              
                              return (
                                <div className="children-list">
                                  {jointChildConnections.map((connectedChild) => (
                                    <label key={`joint-${jointChildUuid}-${connectedChild.uuid}`} className="child-checkbox">
                                      <input
                                        type="checkbox"
                                        checked={selectedConnectedChildren.includes(`joint-${jointChildUuid}-${connectedChild.uuid}`)}
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            setSelectedConnectedChildren([...selectedConnectedChildren, `joint-${jointChildUuid}-${connectedChild.uuid}`]);
                                          } else {
                                            setSelectedConnectedChildren(
                                              selectedConnectedChildren.filter(id => id !== `joint-${jointChildUuid}-${connectedChild.uuid}`)
                                            );
                                          }
                                        }}
                                      />
                                      {connectedChild.status === 'pending' ? '⏳' : '✅'} {connectedChild.name}{connectedChild.status === 'pending' ? ' (pending)' : ''}
                                    </label>
                                  ))}
                                </div>
                              );
                            })()}
                          </div>
                        );
                      })}
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
            
            
            {/* Actions */}
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

        {/* Custom Template Dialog with Yes/No buttons */}
        {(() => {
          const shouldShow = showTemplateDialog;
          console.log('🎯 Dialog render check (ADD-ACTIVITY):', { 
            showTemplateDialog, 
            shouldShow,
            templateDialogMessage,
            currentPage,
            timestamp: new Date().toISOString()
          });
          return shouldShow;
        })() && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div style={{
              backgroundColor: 'white',
              padding: '30px',
              borderRadius: '12px',
              maxWidth: '500px',
              width: '90%',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)'
            }}>
              <div style={{
                fontSize: '16px',
                lineHeight: '1.5',
                color: '#333',
                marginBottom: '25px',
                whiteSpace: 'pre-line'
              }}>
                {templateDialogMessage}
              </div>
              <div style={{
                display: 'flex',
                gap: '15px',
                justifyContent: 'center'
              }}>
                <button
                  onClick={handleTemplateYes}
                  style={{
                    backgroundColor: '#28a745',
                    color: 'white',
                    border: 'none',
                    padding: '12px 30px',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Yes
                </button>
                <button
                  onClick={handleTemplateNo}
                  style={{
                    backgroundColor: '#6c757d',
                    color: 'white',
                    border: 'none',
                    padding: '12px 30px',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  No
                </button>
              </div>
            </div>
          </div>
        )}
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
                  defaultScrollPosition="start"
                />
              </div>
              <div className="time-field">
                <label>End Time</label>
                <TimePickerDropdown
                  value={newActivity.end_time}
                  onChange={(time) => setNewActivity({...newActivity, end_time: time})}
                  placeholder="End time"
                  defaultScrollPosition="end"
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
            <h2>Invite Children to: {invitingActivity.name}</h2>
          </div>
        </div>
        
        <div className="page-content">
          <div className="page-form">
            {/* Children Selection - Same as Create Activity */}
            <div className="connected-children-section">
              <div className="children-selection-header">
                <label>Invite Children:</label>
                {(connectedChildren.length > 0 || pendingConnectionRequests.length > 0) && (
                  <div className="selection-controls">
                    <button
                      type="button"
                      onClick={() => {
                        const allConnectedUuids = connectedChildren.map(child => child.uuid);
                        const allPendingIds = pendingConnectionRequests.map(request => `pending-child-${request.target_child_uuid || request.target_parent_uuid}`);
                        const allIds = [...allConnectedUuids, ...allPendingIds];
                        
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
                        const allConnectedUuids = connectedChildren.map(child => child.uuid);
                        const allPendingIds = pendingConnectionRequests.map(request => `pending-child-${request.target_child_uuid || request.target_parent_uuid}`);
                        const allIds = [...allConnectedUuids, ...allPendingIds];
                        const allSelected = allIds.every(id => selectedConnectedChildren.includes(id));
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
                      onClick={() => onNavigateToConnections?.(true)}
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
                  ) : null}
                </div>
              ) : (
                <div className="children-list">
                  {/* Confirmed connections */}
                  {connectedChildren.map((connectedChild) => (
                    <label key={connectedChild.uuid} className="child-checkbox">
                      <input
                        type="checkbox"
                        checked={selectedConnectedChildren.includes(connectedChild.uuid)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedConnectedChildren([...selectedConnectedChildren, connectedChild.uuid]);
                          } else {
                            setSelectedConnectedChildren(
                              selectedConnectedChildren.filter(id => id !== connectedChild.uuid)
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
                        checked={selectedConnectedChildren.includes(`pending-child-${request.target_child_uuid || request.target_parent_uuid}`)}
                        onChange={(e) => {
                          const pendingId = `pending-child-${request.target_child_uuid || request.target_parent_uuid}`;
                          if (e.target.checked) {
                            setSelectedConnectedChildren([...selectedConnectedChildren, pendingId]);
                          } else {
                            setSelectedConnectedChildren(
                              selectedConnectedChildren.filter(id => id !== pendingId)
                            );
                          }
                        }}
                      />
                      ⏳ {request.target_child_name || `${request.target_parent_name || request.target_family_name || 'Unknown Parent'} (Any Child)`} - <em style={{ fontSize: '12px' }}>pending connection</em>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="page-actions">
            <button
              onClick={() => {
                goBack();
                setInvitingActivity(null);
                setSelectedConnectedChildren([]);
              }}
              className="cancel-btn"
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                if (selectedConnectedChildren.length === 0) {
                  alert('Please select at least one child to invite.');
                  return;
                }
                
                // Send invitations to selected children
                const invitationPromises = selectedConnectedChildren.map(async (childId) => {
                  const childIdStr = String(childId);
                  if (childIdStr.startsWith('pending-child-')) {
                    const pendingId = childIdStr.replace('pending-child-', '');
                    return apiService.createPendingInvitations(invitingActivity.uuid || invitingActivity.activity_uuid || String(invitingActivity.id), [pendingId]);
                  } else {
                    const connectedChild = connectedChildren.find(c => c.uuid === childIdStr);
                    if (connectedChild && connectedChild.parent_id) {
                      return apiService.sendActivityInvitation(invitingActivity.uuid || invitingActivity.activity_uuid || String(invitingActivity.id), connectedChild.parent_id, childIdStr);
                    }
                  }
                });

                try {
                  const results = await Promise.all(invitationPromises);
                  const successful = results.filter(r => r?.success).length;
                  
                  if (successful > 0) {
                    alert(`Successfully sent ${successful} invitation${successful > 1 ? 's' : ''}!`);
                    goBack();
                    setInvitingActivity(null);
                    setSelectedConnectedChildren([]);
                  } else {
                    alert('Failed to send invitations. Please try again.');
                  }
                } catch (error) {
                  console.error('Failed to send invitations:', error);
                  alert('Failed to send invitations. Please try again.');
                }
              }}
              className="confirm-btn"
            >
              Save
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
              onClick={() => {
                setCalendarView('5day');
                console.log('📅 ChildActivityScreen - Calendar view changed to 5-day, checking for month change');
                setTimeout(() => loadActivities(), 100); // Small delay to ensure state is updated
              }}
              className={`toggle-btn ${calendarView === '5day' ? 'active' : ''}`}
            >
              5 Day
            </button>
            <button
              onClick={() => {
                setCalendarView('7day');
                console.log('📅 ChildActivityScreen - Calendar view changed to 7-day, checking for month change');
                setTimeout(() => loadActivities(), 100); // Small delay to ensure state is updated
              }}
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
                      <h4 className="activity-name">
                        {activity.name}
                        {/* Show recurring series indicator */}
                        {((activity as any).series_id || (activity as any).is_recurring) && (
                          <span 
                            className="series-indicator"
                            style={{
                              marginLeft: '8px',
                              fontSize: '12px',
                              background: 'linear-gradient(135deg, #667eea, #764ba2)',
                              color: 'white',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontWeight: '500'
                            }}
                            title="This is part of a recurring activity series"
                          >
                            🔄 Series
                          </span>
                        )}
                      </h4>
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
                              {(activity as any).unviewed_statuses.includes('rejected') && (
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


      {/* Custom Template Dialog with Yes/No buttons - Available on all pages */}
      {(() => {
        const shouldShow = showTemplateDialog;
        console.log('🎯 Dialog render check (GLOBAL):', { 
          showTemplateDialog, 
          shouldShow,
          templateDialogMessage,
          currentPage,
          timestamp: new Date().toISOString()
        });
        return shouldShow;
      })() && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '12px',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{
              fontSize: '16px',
              lineHeight: '1.5',
              color: '#333',
              marginBottom: '25px',
              whiteSpace: 'pre-line'
            }}>
              {templateDialogMessage}
            </div>
            <div style={{
              display: 'flex',
              gap: '15px',
              justifyContent: 'center'
            }}>
              <button
                onClick={handleTemplateYes}
                style={{
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  padding: '12px 30px',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Yes
              </button>
              <button
                onClick={handleTemplateNo}
                style={{
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  padding: '12px 30px',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                No
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Activity Dialog for Recurring Activities */}
      {(() => {
        console.log('🎭 Dialog render check:', { showDeleteDialog, deleteDialogActivity: deleteDialogActivity?.name, shouldRender: showDeleteDialog && deleteDialogActivity });
        return null;
      })()}
      {showDeleteDialog && deleteDialogActivity && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000
        }}>
          <div style={{
            background: 'white',
            padding: '24px',
            borderRadius: '12px',
            maxWidth: '400px',
            margin: '20px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
          }}>
            <h3 style={{ 
              marginTop: 0, 
              marginBottom: '16px', 
              color: '#e53e3e', 
              fontWeight: '600',
              fontSize: '18px' 
            }}>
              🗑️ Delete Recurring Activity
            </h3>
            <p style={{ 
              marginBottom: '20px', 
              lineHeight: '1.6',
              color: '#4a5568'
            }}>
              This activity "<strong>{deleteDialogActivity.name}</strong>" is part of a recurring series.
            </p>
            <p style={{ 
              marginBottom: '24px', 
              lineHeight: '1.6',
              color: '#4a5568' 
            }}>
              What would you like to delete?
            </p>
            <div style={{ 
              display: 'flex', 
              gap: '12px',
              flexDirection: 'column'
            }}>
              <button
                onClick={() => {
                  handleDeleteDialogClose();
                  deleteActivity(deleteDialogActivity, false);
                }}
                style={{
                  padding: '12px 16px',
                  background: 'linear-gradient(135deg, #fd7e14, #fd7e14)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                📅 Just This Activity
              </button>
              <button
                onClick={() => {
                  handleDeleteDialogClose();
                  deleteActivity(deleteDialogActivity, true);
                }}
                style={{
                  padding: '12px 16px',
                  background: 'linear-gradient(135deg, #e53e3e, #fc8181)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                🔄 Entire Series (All Activities)
              </button>
              <button
                onClick={handleDeleteDialogClose}
                style={{
                  padding: '12px 16px',
                  background: 'linear-gradient(135deg, #6c757d, #6c757d)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                ❌ Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChildActivityScreen;