import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ApiService from '../services/api';
import { Child } from '../types';
import ChildActivityScreen from './ChildActivityScreen';
import './ChildrenScreen.css';

interface ActivityInvitation {
  id: number;
  invitation_uuid?: string;
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
  invited_child_uuid?: string;
  invited_child_name?: string;
  message?: string;
  created_at: string;
}

interface ConnectionRequest {
  id: number;
  request_uuid: string;
  requester_name: string;
  requester_email: string;
  requester_family_name?: string;
  child_name?: string;
  target_child_name?: string;
  message?: string;
  created_at: string;
}

interface ChildrenScreenProps {
  onNavigateToCalendar?: () => void;
  onNavigateToChildCalendar?: (child: Child, activityDate?: string) => void;
  onNavigateToChildActivities?: (child: Child) => void;
  onNavigateToActivity?: (child: Child, activity: any) => void;
  onNavigateBack?: () => void;
  initialSelectedChildId?: string | null;
  initialActivityUuid?: string;
  onChildSelectionChange?: (childId: string | null) => void;
  onNavigateToConnections?: (isInActivityCreation?: boolean) => void;
  shouldRestoreActivityCreation?: boolean;
  refreshTrigger?: number; // Add trigger to force refresh when prop changes
}

const ChildrenScreen: React.FC<ChildrenScreenProps> = ({ onNavigateToCalendar, onNavigateToChildCalendar, onNavigateToChildActivities, onNavigateToActivity, onNavigateBack, initialSelectedChildId, initialActivityUuid, onChildSelectionChange, onNavigateToConnections, shouldRestoreActivityCreation, refreshTrigger }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newChildFirstName, setNewChildFirstName] = useState('');
  const [newChildLastName, setNewChildLastName] = useState('');
  const [newChildBirthDate, setNewChildBirthDate] = useState('');
  const [addingChild, setAddingChild] = useState(false);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingChild, setEditingChild] = useState<Child | null>(null);
  const [editChildFirstName, setEditChildFirstName] = useState('');
  const [editChildLastName, setEditChildLastName] = useState('');
  const [editChildBirthDate, setEditChildBirthDate] = useState('');
  const [editChildInterests, setEditChildInterests] = useState('');
  const [updatingChild, setUpdatingChild] = useState(false);
  const [childActivityCounts, setChildActivityCounts] = useState<Record<string, number>>({});
  const [childInvitations, setChildInvitations] = useState<Record<string, ActivityInvitation[]>>({});
  const [childConnections, setChildConnections] = useState<Record<string, ConnectionRequest[]>>({});
  const [hostedActivityNotifications, setHostedActivityNotifications] = useState<any[]>([]);
  const [processingInvitation, setProcessingInvitation] = useState<number | null>(null);
  const [processingConnection, setProcessingConnection] = useState<string | null>(null);
  const [activityDraft, setActivityDraft] = useState<any>(null);
  const apiService = ApiService.getInstance();


  useEffect(() => {
    // Clean up any old non-user-specific drafts (security fix)
    localStorage.removeItem('activityDraft');
    
    loadChildren();
    checkForActivityDraft();
  }, []);

  // Refresh children data when refreshTrigger prop changes
  useEffect(() => {
    if (refreshTrigger !== undefined) {
      console.log('🔄 ChildrenScreen refresh triggered by prop change:', refreshTrigger);
      loadChildren();
    }
  }, [refreshTrigger]);

  // Check for activity draft when component becomes visible (user returns from connections tab)
  useEffect(() => {
    const handleFocus = () => {
      checkForActivityDraft();
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, []);

  const checkForActivityDraft = () => {
    try {
      // Get user-specific draft key
      const currentUser = JSON.parse(localStorage.getItem('userData') || '{}');
      const draftKey = `activityDraft_${currentUser.id || 'unknown'}`;
      
      const draftStr = localStorage.getItem(draftKey);
      if (draftStr) {
        const draft = JSON.parse(draftStr);
        setActivityDraft(draft);
      }
    } catch (error) {
      console.error('Failed to load activity draft:', error);
    }
  };

  const resumeActivityCreation = () => {
    if (activityDraft && activityDraft.childUuid) {
      const child = children.find(c => c.uuid === activityDraft.childUuid);
      if (child) {
        // Clear the draft from ChildrenScreen since it will be handled by ChildActivityScreen
        setActivityDraft(null);
        setSelectedChild(child);
      }
    }
  };

  const dismissActivityDraft = () => {
    // Get user-specific draft key
    const currentUser = JSON.parse(localStorage.getItem('userData') || '{}');
    const draftKey = `activityDraft_${currentUser.id || 'unknown'}`;
    
    localStorage.removeItem(draftKey);
    setActivityDraft(null);
  };

  const loadChildren = async () => {
    try {
      console.log('🔄 loadChildren called');
      setLoading(true);
      const response = await apiService.getChildren();
      
      console.log('🔍 loadChildren response:', response);
      
      if (response.success && response.data) {
        // Handle different response formats - API might return { data: [...] }
        const childrenData = Array.isArray(response.data) 
          ? response.data 
          : (response.data as any)?.data || [];
        
        console.log('🔍 Setting children data:', childrenData);
        console.log('🔍 Children count:', childrenData.length);
        setChildren(childrenData);
        
        // Load activity counts and invitations together (consolidated to avoid duplicate API calls)
        await loadActivityCountsAndInvitations(childrenData);
        await loadConnectionRequestsForChildren(childrenData);
        await loadHostedActivityNotifications(childrenData);
      } else {
        console.error('Failed to load children:', response.error);
        alert(`Error: ${response.error || 'Failed to load children'}`);
        setChildren([]); // Ensure children is always an array
      }
    } catch (error) {
      console.error('Load children error:', error);
      alert('Failed to load children');
      setChildren([]); // Ensure children is always an array
    } finally {
      setLoading(false);
    }
  };

  const loadActivityCountsAndInvitations = async (childrenData: Child[]) => {
    try {
      const counts: Record<string, number> = {};
      
      // Use same date range as ChildActivityScreen (current date to 1 year ahead)
      const now = new Date();
      const oneYearLater = new Date();
      oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
      const startDate = now.toISOString().split('T')[0];
      const endDate = oneYearLater.toISOString().split('T')[0];
      
      console.log(`📅 ChildrenScreen - Using SAME date range as ChildActivityScreen: ${startDate} to ${endDate} (current date to 1 year ahead)`);
      
      // Load activity count for each child using the SAME logic as ChildActivityScreen
      console.log(`📡 ChildrenScreen - Loading owned activities...`);
      const calendarActivitiesResponse = await apiService.getCalendarActivities(startDate, endDate);
      console.log(`🔍 ChildrenScreen - Calendar activities API response:`, calendarActivitiesResponse);
      
      console.log(`📡 ChildrenScreen - Loading all invitations (single call for both invited and pending)...`);
      const invitationsResponse = await apiService.getAllInvitations(startDate, endDate);
      console.log(`🔍 ChildrenScreen - Invitations API response:`, invitationsResponse);
      
      // Extract pending invitations from the same data (no additional API call needed)
      const pendingResponse = {
        success: invitationsResponse.success,
        data: invitationsResponse.success && invitationsResponse.data 
          ? invitationsResponse.data.filter((inv: any) => inv.status === 'pending')
          : [],
        error: invitationsResponse.error
      };
      console.log(`🔍 ChildrenScreen - Pending invitations API response:`, pendingResponse);
      
      // Debug series_id data
      if (pendingResponse.success && pendingResponse.data && pendingResponse.data.length > 0) {
        console.log(`🔍 ChildrenScreen - Found ${pendingResponse.data.length} pending invitations`);
        pendingResponse.data.forEach((inv: any, index: number) => {
          console.log(`🔍 Pending inv ${index + 1}: activity_name="${inv.activity_name}", series_id="${inv.series_id}"`);
        });
      }
      
      if (calendarActivitiesResponse.success && calendarActivitiesResponse.data) {
        const ownedActivities = Array.isArray(calendarActivitiesResponse.data) ? calendarActivitiesResponse.data : [];
        console.log(`📅 ChildrenScreen - Owned activities from API: ${ownedActivities.length}`);
        
        // Process invited activities (same as ChildActivityScreen)
        const invitedActivities: any[] = [];
        if (invitationsResponse.success && invitationsResponse.data) {
          const invitations = Array.isArray(invitationsResponse.data) ? invitationsResponse.data : [];
          console.log(`📅 ChildrenScreen - Invitations from API: ${invitations.length}`);
          
          invitations.forEach(invitation => {
            invitedActivities.push({
              ...invitation,
              name: invitation.activity_name,
              start_time: invitation.start_time,
              end_time: invitation.end_time,
              date: invitation.start_date.split('T')[0],
              child_uuid: invitation.invited_child_uuid,
              is_host: false,
              is_shared: true,
              invitation_status: invitation.status,
              invited_child_uuid: invitation.invited_child_uuid,
              invitationUuid: invitation.invitation_uuid,
              host_parent_name: invitation.host_parent_username
            });
          });
        }
        
        // Process pending invitations (same as ChildActivityScreen)
        const pendingInvitations: any[] = [];
        if (pendingResponse.success && pendingResponse.data) {
          const pending = Array.isArray(pendingResponse.data) ? pendingResponse.data : [];
          console.log(`📅 ChildrenScreen - Pending invitations from API: ${pending.length}`);
          
          pending.forEach((invitation, index) => {
            const transformedInvitation = {
              ...invitation,
              name: invitation.activity_name,
              start_time: invitation.start_time,
              end_time: invitation.end_time,
              date: invitation.start_date.split('T')[0],
              child_uuid: invitation.invited_child_uuid,
              is_host: false,
              is_shared: true,
              invitation_status: 'pending',
              invited_child_uuid: invitation.invited_child_uuid,
              invitationUuid: invitation.invitation_uuid,
              host_parent_name: invitation.host_parent_username
            };
            // console.log(`🔍 Transformed invitation ${index + 1}: activity_name="${transformedInvitation.name}", series_id="${(transformedInvitation as any).series_id}"`);
            pendingInvitations.push(transformedInvitation);
          });
        }
        
        // Combine all activities (owned + invited + pending)
        const allActivities = [...ownedActivities, ...invitedActivities, ...pendingInvitations];
        console.log(`📅 ChildrenScreen - Total combined activities: ${allActivities.length} (${ownedActivities.length} owned + ${invitedActivities.length} invited + ${pendingInvitations.length} pending)`);
        
        for (const child of childrenData) {
          console.log(`\n🔍 Processing activities for ${child.name} (UUID: ${child.uuid})...`);
          try {
            // Filter activities the child is going to: hosted by them (private OR shared) OR accepted invitations
            const childActivities = allActivities.filter(activity => {
              const isHosting = activity.child_uuid === child.uuid; // Child is hosting (private or shared)
              const isAcceptedInvitation = activity.invited_child_uuid === child.uuid && 
                                          activity.invitation_status === 'accepted'; // Child accepted someone else's invite
              const shouldInclude = isHosting || isAcceptedInvitation;
              
              // Enhanced debug logging
              if (shouldInclude) {
                console.log(`🔍 ChildrenScreen - INCLUDING "${activity.name}" for ${child.name}:`);
                console.log(`   - Type: ${isHosting ? 'HOSTING (private or shared)' : 'ACCEPTED INVITATION'}`);
                console.log(`   - Hosting: ${isHosting} (${activity.child_uuid} === ${child.uuid})`);
                console.log(`   - Accepted: ${isAcceptedInvitation} (${activity.invited_child_uuid} === ${child.uuid}, status: ${activity.invitation_status})`);
                console.log(`   - Date: ${activity.start_date}, Host: ${activity.child_name || 'N/A'}`);
              }
              
              return shouldInclude;
            });
            
            // Now filter to only count activities in the CURRENT WEEK (same as ChildActivityScreen week view)
            const currentWeek = new Date();
            const dayOfWeek = currentWeek.getDay(); // 0 = Sunday, 1 = Monday, etc.
            const startOfWeek = new Date(currentWeek);
            startOfWeek.setDate(currentWeek.getDate() - dayOfWeek); // Go back to Sunday
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 6); // Add 6 days to get to Saturday
            
            console.log(`📅 Week filtering: ${startOfWeek.toDateString()} to ${endOfWeek.toDateString()}`);
            
            let weekActivitiesRaw = childActivities.filter(activity => {
              const activityStartDate = activity.start_date.split('T')[0];
              const activityEndDate = activity.end_date ? activity.end_date.split('T')[0] : activityStartDate;
              const startDate = startOfWeek.toISOString().split('T')[0];
              const endDate = endOfWeek.toISOString().split('T')[0];
              
              const isInCurrentWeek = (activityStartDate >= startDate && activityStartDate <= endDate) ||
                                    (activityEndDate >= startDate && activityEndDate <= endDate) ||
                                    (activityStartDate <= startDate && activityEndDate >= endDate);
              
              if (isInCurrentWeek) {
                console.log(`📅 Week activity: "${activity.name}" (${activityStartDate}), series_id: ${activity.series_id}`);
              }
              
              return isInCurrentWeek;
            });

            // EXPERIMENTAL: Group recurring activities to match ChildActivityScreen display logic
            // This might explain why 9 individual activities show as 2 grouped activities
            const recurringGroups = new Map();
            const singleActivities = [];
            
            weekActivitiesRaw.forEach(activity => {
              if (activity.series_id && activity.series_id !== 'undefined' && activity.series_id !== null) {
                // This is part of a recurring series
                if (!recurringGroups.has(activity.series_id)) {
                  recurringGroups.set(activity.series_id, []);
                }
                recurringGroups.get(activity.series_id).push(activity);
              } else {
                // Single activity
                singleActivities.push(activity);
              }
            });
            
            // Count: 1 for each recurring series + individual single activities
            const recurringSeriesCount = recurringGroups.size;
            const singleActivitiesCount = singleActivities.length;
            const groupedCount = recurringSeriesCount + singleActivitiesCount;
            
            console.log(`🔍 Activity grouping for ${child.name}:`);
            console.log(`  - Raw activities in week: ${weekActivitiesRaw.length}`);
            console.log(`  - Recurring series: ${recurringSeriesCount}`);
            console.log(`  - Single activities: ${singleActivitiesCount}`);
            console.log(`  - Grouped total: ${groupedCount}`);
            
            // Use grouped count to match ChildActivityScreen behavior
            const weekActivities = { length: groupedCount }; // Fake array-like object for count
            
            // Count hosted vs accepted activities for detailed breakdown (use raw activities)
            const hostedCount = weekActivitiesRaw.filter(a => a.child_uuid === child.uuid).length;
            const acceptedCount = weekActivitiesRaw.filter(a => a.invited_child_uuid === child.uuid && a.invitation_status === 'accepted').length;
            
            counts[child.uuid] = weekActivities.length;
            console.log(`📊 Child ${child.name} (UUID: ${child.uuid}): ${childActivities.length} total activities -> ${weekActivities.length} in current week`);
            console.log(`   📈 Week breakdown: ${hostedCount} hosted + ${acceptedCount} accepted = ${hostedCount + acceptedCount} total`);
          } catch (error) {
            console.error(`Failed to load activity count for child ${child.uuid}:`, error);
            counts[child.uuid] = 0;
          }
        }
      } else {
        console.error('Failed to load calendar activities for counts:', calendarActivitiesResponse.error);
        // Set all counts to 0 if API fails
        for (const child of childrenData) {
          counts[child.uuid] = 0;
        }
      }
      
      setChildActivityCounts(counts);

      // Now load invitations for children using the SAME master date range
      // (Reuse invitationsResponse from above to avoid additional API call)
      if (invitationsResponse.success && invitationsResponse.data) {
        
        // Group invitations by child
        const invitationsByChild: Record<string, ActivityInvitation[]> = {};
        
        // Initialize empty arrays for each child
        childrenData.forEach(child => {
          invitationsByChild[child.uuid] = [];
        });
        
        // Filter for pending invitations only and group by child
        invitationsResponse.data.forEach((invitation: any) => {
          if (invitation.status === 'pending' && invitation.invited_child_name) {
            // Find child by name (API returns invited_child_name, not invited_child_uuid)
            const matchingChild = childrenData.find(child => 
              child.name === invitation.invited_child_name
            );
            
            console.log(`🔍 ChildrenScreen invitation matching for "${invitation.activity_name}":`, {
              invited_child_name: invitation.invited_child_name,
              matchingChild: matchingChild ? `${matchingChild.name} (${matchingChild.uuid})` : 'NOT FOUND',
              status: invitation.status
            });
            
            if (matchingChild) {
              // Convert to ActivityInvitation format (matching the interface)
              const activityInvitation: ActivityInvitation = {
                id: invitation.invitation_uuid || invitation.id,
                invitation_uuid: invitation.invitation_uuid,
                activity_id: invitation.activity_uuid,
                activity_uuid: invitation.activity_uuid,
                activity_name: invitation.activity_name,
                activity_description: invitation.activity_description,
                start_date: invitation.start_date,
                end_date: invitation.end_date,
                start_time: invitation.start_time,
                end_time: invitation.end_time,
                location: invitation.location,
                status: invitation.status,
                host_child_name: invitation.child_name,
                host_family_name: invitation.host_family_name,
                host_parent_name: invitation.host_parent_username,
                host_parent_email: invitation.host_parent_email,
                invited_child_uuid: matchingChild.uuid, // Use the matched child's UUID
                invited_child_name: matchingChild.name, // Use the matched child's name
                message: invitation.invitation_message,
                created_at: invitation.created_at || new Date().toISOString(),
                viewed_at: invitation.viewed_at,
                series_id: invitation.series_id,
                is_recurring: invitation.is_recurring || false,
                recurring_days: invitation.recurring_days,
                series_start_date: invitation.series_start_date
              } as any;
              
              invitationsByChild[matchingChild.uuid].push(activityInvitation);
            }
          }
        });
        
        setChildInvitations(invitationsByChild);
        console.log(`📧 Loaded invitations for ${Object.keys(invitationsByChild).length} children`);
        console.log(`📧 ChildrenScreen invitationsByChild final state:`, invitationsByChild);
      } else {
        console.error('Failed to load invitations:', invitationsResponse.error);
        setChildInvitations({});
      }
      
    } catch (error) {
      console.error('Failed to load activity counts and invitations:', error);
    }
  };


  const loadConnectionRequestsForChildren = async (childrenData: Child[]) => {
    try {
      // Get all connection requests for this parent
      const response = await apiService.getConnectionRequests();
      if (response.success && response.data) {
        // Group connection requests by child
        const connectionsByChild: Record<string, ConnectionRequest[]> = {};
        
        // Initialize empty arrays for each child
        childrenData.forEach(child => {
          connectionsByChild[child.uuid] = [];
        });
        
        // Group connection requests by the target child
        response.data.forEach((request: any) => {
          // Find the child this connection request is for
          const targetChild = childrenData.find(child => 
            (child.display_name || child.name) === request.target_child_name
          );
          
          if (targetChild) {
            connectionsByChild[targetChild.uuid].push({
              id: request.id,
              request_uuid: request.request_uuid,
              requester_name: request.requester_name,
              requester_email: request.requester_email,
              requester_family_name: request.requester_family_name,
              child_name: request.child_name,
              target_child_name: request.target_child_name,
              message: request.message,
              created_at: request.created_at
            });
          }
        });
        
        setChildConnections(connectionsByChild);
      }
    } catch (error) {
      console.error('Failed to load connection requests:', error);
    }
  };

  const loadHostedActivityNotifications = async (childrenData: Child[]) => {
    try {
      // Get date range for checking hosted activities
      const today = new Date();
      const oneYearLater = new Date();
      oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
      const startDate = today.toISOString().split('T')[0];
      const endDate = oneYearLater.toISOString().split('T')[0];
      
      // Get all calendar activities where we are the host
      const calendarActivitiesResponse = await apiService.getCalendarActivities(startDate, endDate);
      if (calendarActivitiesResponse.success && calendarActivitiesResponse.data) {
        const allActivities = Array.isArray(calendarActivitiesResponse.data) ? calendarActivitiesResponse.data : [];
        
        const rawNotifications: any[] = [];
        
        // First, collect all activities with unviewed responses
        const activitiesWithUnviewedResponses = allActivities.filter(activity => {
          const hostChild = childrenData.find(child => child.uuid === activity.child_uuid);
          const hasUnviewedResponses = parseInt(activity.unviewed_status_changes || '0') > 0;
          return hostChild && hasUnviewedResponses;
        });
        
        console.log(`🔄 ChildrenScreen: Batch loading participants for ${activitiesWithUnviewedResponses.length} activities with unviewed responses...`);
        
        // Batch load participants for all activities with unviewed responses
        if (activitiesWithUnviewedResponses.length > 0) {
          // Get unique, valid UUIDs only
          const allUuids = activitiesWithUnviewedResponses.map(a => a.activity_uuid || a.uuid).filter(Boolean);
          const uniqueUuids = Array.from(new Set(allUuids)); // Remove duplicates
          console.log(`📊 ChildrenScreen: Unique UUIDs: ${uniqueUuids.length} (from ${allUuids.length} total)`);
          
          // Split into batches of 50 to respect backend limit
          const batchSize = 50;
          const allParticipantsData: any = {};
          
          for (let i = 0; i < uniqueUuids.length; i += batchSize) {
            const batchUuids = uniqueUuids.slice(i, i + batchSize);
            console.log(`🔄 ChildrenScreen: Loading batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(uniqueUuids.length/batchSize)} (${batchUuids.length} activities)`);
            
            try {
              const participantsResponse = await apiService.getBatchActivityParticipants(batchUuids);
              if (participantsResponse.success && participantsResponse.data) {
                Object.assign(allParticipantsData, participantsResponse.data);
              } else {
                console.error(`❌ ChildrenScreen: Batch ${Math.floor(i/batchSize) + 1} failed:`, participantsResponse.error);
              }
            } catch (error) {
              console.error(`❌ ChildrenScreen: Batch ${Math.floor(i/batchSize) + 1} error:`, error);
            }
          }
          
          console.log(`✅ ChildrenScreen: Batch participants loaded for ${Object.keys(allParticipantsData).length} activities`);
          
          // Process activities using batch data
          for (const activity of activitiesWithUnviewedResponses) {
            const hostChild = childrenData.find(child => child.uuid === activity.child_uuid);
            const activityUuid = activity.activity_uuid || activity.uuid;
            const participantsData = allParticipantsData[activityUuid];
            
            if (hostChild && participantsData && participantsData.success && participantsData.data) {
              const participants = participantsData.data.participants || [];
              
              // Since calendar activities says there are unviewed responses, find non-pending participants
              const responseParticipants = participants.filter((p: any) => 
                p.status !== 'pending'
              );
              
              if (responseParticipants.length > 0) {
                rawNotifications.push({
                  activity_id: activity.id,
                  activity_uuid: activityUuid,
                  activity_name: activity.name,
                  start_date: activity.start_date,
                  start_time: activity.start_time,
                  end_time: activity.end_time,
                  host_child_uuid: hostChild.uuid,
                  host_child_name: hostChild.name,
                  unviewed_responses: responseParticipants,
                  total_unviewed: parseInt(activity.unviewed_status_changes),
                  unviewed_statuses: activity.unviewed_statuses,
                  series_id: activity.series_id // Include series_id for grouping
                });
              }
            } else {
              console.warn(`⚠️ ChildrenScreen: No batch participants data for activity ${activityUuid}`);
              // Fallback: create notification without detailed participant info (only if hostChild exists)
              if (hostChild) {
                rawNotifications.push({
                  activity_id: activity.id,
                  activity_uuid: activityUuid,
                  activity_name: activity.name,
                  start_date: activity.start_date,
                  start_time: activity.start_time,
                  end_time: activity.end_time,
                  host_child_uuid: hostChild.uuid,
                  host_child_name: hostChild.name,
                  unviewed_responses: [],
                  total_unviewed: parseInt(activity.unviewed_status_changes),
                  unviewed_statuses: activity.unviewed_statuses,
                  series_id: activity.series_id // Include series_id for grouping
                });
              }
            }
          }
        }
        
        // Now group the notifications by series_id (same logic as NotificationBell)
        const groupedNotifications = new Map<string, any[]>();
        const singleNotifications: any[] = [];
        
        rawNotifications.forEach(notification => {
          const seriesId = notification.series_id;
          const activityName = notification.activity_name;
          
          if (seriesId && seriesId !== 'undefined') {
            // Use series_id for proper grouping
            const existingGroup = groupedNotifications.get(seriesId);
            
            if (existingGroup) {
              existingGroup.push(notification);
            } else {
              // Check if there are other notifications with the same series_id
              const seriesNotifications = rawNotifications.filter(n => n.series_id === seriesId);
              
              if (seriesNotifications.length > 1) {
                // This is a recurring series
                groupedNotifications.set(seriesId, seriesNotifications);
              } else {
                // Single activity in series
                singleNotifications.push(notification);
              }
            }
          } else {
            // Fallback to name-based grouping if no series_id
            const existingGroup = groupedNotifications.get(activityName);
            
            if (existingGroup) {
              existingGroup.push(notification);
            } else {
              const sameNameNotifications = rawNotifications.filter(n => n.activity_name === activityName);
              
              if (sameNameNotifications.length > 1) {
                groupedNotifications.set(activityName, sameNameNotifications);
              } else {
                if (!groupedNotifications.has(activityName)) {
                  singleNotifications.push(notification);
                }
              }
            }
          }
        });
        
        // Create final grouped notifications
        const finalNotifications: any[] = [];
        
        // Add grouped recurring series notifications
        groupedNotifications.forEach((notifications, seriesKey) => {
          // Combine all responses from the series
          const allResponses = notifications.flatMap(n => n.unviewed_responses);
          const totalUnviewed = notifications.reduce((sum, n) => sum + n.total_unviewed, 0);
          const allStatuses = notifications.map(n => n.unviewed_statuses).filter(Boolean).join(',');
          
          // Use the first notification as the template
          const firstNotification = notifications[0];
          
          finalNotifications.push({
            ...firstNotification,
            unviewed_responses: allResponses,
            total_unviewed: totalUnviewed,
            unviewed_statuses: allStatuses,
            is_recurring_series: true,
            series_count: notifications.length,
            series_notifications: notifications
          });
        });
        
        // Add single notifications
        finalNotifications.push(...singleNotifications);
        
        setHostedActivityNotifications(finalNotifications);
        console.log(`📊 Found ${finalNotifications.length} hosted activity notifications (${groupedNotifications.size} recurring series + ${singleNotifications.length} single activities)`);
      }
    } catch (error) {
      console.error('Failed to load hosted activity notifications:', error);
      setHostedActivityNotifications([]);
    }
  };

  const handleInvitationResponse = async (invitationUuid: string, action: 'accept' | 'reject') => {
    const formatDate = (dateString: string) => {
      return new Date(dateString).toLocaleDateString('en-US', { 
        weekday: 'short', 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    };
    
    try {
      setProcessingInvitation(parseInt(invitationUuid)); // Keep for UI state management
      
      // ✅ RECURRING ACTIVITIES: Find the invitation and check if it's part of a series
      let currentInvitation: any = null;
      let allInvitationsForChild: any[] = [];
      
      Object.keys(childInvitations).forEach(childId => {
        const invitations = childInvitations[childId] || [];
        const found = invitations.find(inv => inv.invitation_uuid === invitationUuid);
        if (found) {
          currentInvitation = found;
          allInvitationsForChild = invitations;
        }
      });
      
      if (!currentInvitation) {
        console.error('❌ Could not find invitation with UUID:', invitationUuid);
        return;
      }
      
      // Check if this is part of a recurring series using series_id (safer than name matching)
      const currentSeriesId = (currentInvitation as any).series_id;
      
      // Check if series_id is valid (not null, undefined, or the string "undefined")
      const seriesInvitations = currentSeriesId && currentSeriesId !== 'undefined'
        ? allInvitationsForChild.filter(inv => (inv as any).series_id === currentSeriesId)
        : allInvitationsForChild.filter(inv => 
            inv.activity_name === currentInvitation.activity_name &&
            inv.host_parent_name === currentInvitation.host_parent_name
          );
      
      const isRecurringInvitation = seriesInvitations.length > 1;
      
      if (isRecurringInvitation) {
        // Show confirmation dialog for series action
        const actionWord = action === 'accept' ? 'accept' : 'decline';
        const seriesMessage = `This is a recurring activity with ${seriesInvitations.length} instances. Do you want to ${actionWord}:\n\n` +
          `• Just this activity (${formatDate(currentInvitation.start_date)})\n` +
          `• The entire series (all ${seriesInvitations.length} activities)`;
          
        const acceptSeries = window.confirm(seriesMessage + '\n\nClick OK for entire series, Cancel for just this activity.');
        
        if (acceptSeries) {
          // Accept/decline the entire series
          console.log(`📧 ${action === 'accept' ? 'Accepting' : 'Declining'} entire series:`, seriesInvitations.map(inv => ({
            uuid: inv.invitation_uuid,
            name: inv.activity_name,
            date: inv.start_date
          })));
          
          const seriesPromises = seriesInvitations.map(inv => 
            apiService.respondToActivityInvitation(inv.invitation_uuid, action)
          );
          
          const results = await Promise.all(seriesPromises);
          const successCount = results.filter(r => r?.success).length;
          
          if (successCount > 0) {
            // Remove all series invitations from the child's list
            setChildInvitations(prev => {
              const updated = { ...prev };
              Object.keys(updated).forEach(childId => {
                updated[childId] = updated[childId].filter(inv => 
                  !(inv.activity_name === currentInvitation.activity_name &&
                    inv.host_parent_name === currentInvitation.host_parent_name)
                );
              });
              return updated;
            });
            
            const message = action === 'accept' 
              ? `Series accepted! ${successCount} recurring activities will appear in your calendar.`
              : `Series declined. ${successCount} invitations removed.`;
            alert(message);
            
            // Refresh data to update notification bell and other UI components
            loadChildren();
          } else {
            alert(`Error: Failed to ${action} series invitations`);
          }
          
          return;
        }
      }
      
      // Handle single invitation (either non-recurring or user chose single)
      const response = await apiService.respondToActivityInvitation(invitationUuid, action);
      
      if (response.success) {
        // Remove the invitation from the child's list
        setChildInvitations(prev => {
          const updated = { ...prev };
          Object.keys(updated).forEach(childId => {
            updated[childId] = updated[childId].filter(inv => inv.invitation_uuid !== invitationUuid);
          });
          return updated;
        });
        
        // If invitation was accepted, increment club usage (external API call like activity creation)
        if (action === 'accept' && currentInvitation) {
          try {
            console.log('🏢 INVITATION ACCEPT: Attempting to increment club usage for accepted invitation');
            
            if (currentInvitation.website_url && currentInvitation.activity_type && currentInvitation.activity_uuid) {
              const clubUsageData = {
                website_url: currentInvitation.website_url,
                activity_type: currentInvitation.activity_type,
                location: currentInvitation.location || null,
                activity_uuid: currentInvitation.activity_uuid
              };
              
              console.log('🏢 INVITATION ACCEPT: Calling club increment API:', clubUsageData);
              
              const clubResponse = await apiService.incrementClubUsage(clubUsageData);
              if (clubResponse.success) {
                console.log('✅ INVITATION ACCEPT: Club usage incremented successfully');
              } else {
                console.log('⚠️ INVITATION ACCEPT: Club usage increment failed:', clubResponse.error);
              }
            } else {
              console.log('ℹ️ INVITATION ACCEPT: Activity does not have required club data for increment');
            }
          } catch (clubError) {
            console.error('❌ INVITATION ACCEPT: Failed to increment club usage:', clubError);
            // Don't fail the invitation acceptance if club increment fails
          }
        }
        
        const message = action === 'accept' 
          ? 'Invitation accepted! Activity will appear in your calendar.' 
          : 'Invitation declined.';
        alert(message);
        
        // Refresh data to update notification bell and other UI components
        loadChildren();
      } else {
        alert(`Error: ${response.error || 'Failed to respond to invitation'}`);
      }
    } catch (error) {
      console.error('Failed to respond to invitation:', error);
      alert('Failed to respond to invitation');
    } finally {
      setProcessingInvitation(null);
    }
  };

  const handleConnectionResponse = async (connectionUuid: string, action: 'accept' | 'reject') => {
    try {
      setProcessingConnection(connectionUuid);
      const response = await apiService.respondToConnectionRequest(connectionUuid, action);
      
      if (response.success) {
        // Remove the connection request from the child's list
        setChildConnections(prev => {
          const updated = { ...prev };
          Object.keys(updated).forEach(childId => {
            updated[childId] = updated[childId].filter(req => req.request_uuid !== connectionUuid);
          });
          return updated;
        });
        
        const message = action === 'accept' 
          ? 'Connection request accepted!' 
          : 'Connection request declined.';
        alert(message);
        
        // Refresh data to update notification bell and other UI components
        loadChildren();
      } else {
        alert(`Error: ${response.error || 'Failed to respond to connection request'}`);
      }
    } catch (error) {
      console.error('Failed to respond to connection request:', error);
      alert('Failed to respond to connection request');
    } finally {
      setProcessingConnection(null);
    }
  };

  const handleMarkHostedActivityAsViewed = async (activityNotification: any) => {
    try {
      if (activityNotification.is_recurring_series && activityNotification.series_notifications) {
        // Handle recurring series - mark all activities in the series as viewed
        for (const seriesNotification of activityNotification.series_notifications) {
          for (const response of seriesNotification.unviewed_responses || []) {
            if (response.invitation_uuid) {
              await apiService.markStatusChangeAsViewed(response.invitation_uuid);
            }
          }
        }
        
        // Remove all notifications for activities in this series
        setHostedActivityNotifications(prev => 
          prev.filter(n => {
            if (n.is_recurring_series && n.series_id === activityNotification.series_id) {
              return false; // Remove this recurring series notification
            }
            // Also remove any individual notifications that might be part of this series
            if (activityNotification.series_notifications) {
              const seriesActivityUuids = activityNotification.series_notifications.map((sn: any) => sn.activity_uuid);
              return !seriesActivityUuids.includes(n.activity_uuid);
            }
            return true;
          })
        );
      } else {
        // Handle single activity notification
        for (const response of activityNotification.unviewed_responses || []) {
          if (response.invitation_uuid) {
            await apiService.markStatusChangeAsViewed(response.invitation_uuid);
          }
        }
        
        // Remove this notification from the list
        setHostedActivityNotifications(prev => 
          prev.filter(n => n.activity_uuid !== activityNotification.activity_uuid)
        );
      }
      
      // Also refresh the notification bell
      loadChildren();
    } catch (error) {
      console.error('Failed to mark hosted activity as viewed:', error);
    }
  };

  const handleAddChild = () => {
    setShowAddModal(true);
  };

  const handleCreateChild = async () => {
    if (!newChildFirstName.trim()) {
      alert('Please enter the child\'s first name');
      return;
    }
    
    if (!newChildLastName.trim()) {
      alert('Please enter the child\'s last name');
      return;
    }

    setAddingChild(true);
    try {
      // Calculate age from birth date if provided
      let age = undefined;
      if (newChildBirthDate) {
        const birthDate = new Date(newChildBirthDate);
        const today = new Date();
        age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
      }

      const childData = { 
        first_name: newChildFirstName.trim(),
        last_name: newChildLastName.trim(),
        age: age
      };

      console.log('🔍 Creating child with data:', childData);
      
      const response = await apiService.createChild(childData);
      
      console.log('🔍 Create child response:', response);
      
      if (response.success) {
        console.log('✅ Child created successfully, response.data:', response.data);
        
        // Clear the form and close modal
        setNewChildFirstName('');
        setNewChildLastName('');
        setNewChildBirthDate('');
        setShowAddModal(false);
        
        console.log('🔄 Refreshing children data from API...');
        // Refresh data from API to get the latest state
        await loadChildren();
        
        // Notify parent component (Dashboard) to refresh its children state too
        console.log('📡 Triggering data changed callback');
        if (typeof window !== 'undefined') {
          // Dispatch a custom event to notify Dashboard
          window.dispatchEvent(new CustomEvent('childrenDataChanged'));
        }
        
        console.log('✅ Child creation process completed successfully');
      } else {
        console.log('❌ Child creation failed:', response.error);
        alert(`Error: ${response.error || 'Failed to add child'}`);
      }
    } catch (error) {
      alert('Failed to add child');
      console.error('Create child error:', error);
    } finally {
      setAddingChild(false);
    }
  };

  const handleDeleteChild = async (child: Child) => {
    if (window.confirm(`Are you sure you want to delete ${child.display_name || child.name}? This will also delete all their activities.`)) {
      try {
        const response = await apiService.deleteChild(child.uuid);
        if (response.success) {
          loadChildren();
          alert('Child deleted successfully');
        } else {
          alert(`Error: ${response.error || 'Failed to delete child'}`);
        }
      } catch (error) {
        alert('Failed to delete child');
        console.error('Delete child error:', error);
      }
    }
  };

  const handleEditChild = (child: Child) => {
    setEditingChild(child);
    setEditChildFirstName(child.first_name || child.name?.split(' ')[0] || '');
    setEditChildLastName(child.last_name || child.name?.split(' ').slice(1).join(' ') || '');
    
    // Calculate birth date from age if available
    let birthDate = '';
    if (child.age) {
      const currentYear = new Date().getFullYear();
      const birthYear = currentYear - child.age;
      birthDate = `${birthYear}-01-01`; // Default to January 1st
    }
    setEditChildBirthDate(birthDate);
    
    setEditChildInterests(child.interests || '');
    setShowEditModal(true);
  };

  const handleUpdateChild = async () => {
    if (!editingChild) return;
    
    if (!editChildFirstName.trim()) {
      alert('Please enter the child\'s first name');
      return;
    }

    setUpdatingChild(true);
    try {
      // Calculate age from birth date
      let age = undefined;
      if (editChildBirthDate) {
        const birthDate = new Date(editChildBirthDate);
        const today = new Date();
        age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
      }

      const updateData = {
        first_name: editChildFirstName.trim(),
        last_name: editChildLastName.trim(),
        age: age,
        interests: editChildInterests.trim() || undefined
      };

      console.log('🔄 Updating child with data:', updateData);
      
      const response = await apiService.updateChild(editingChild.uuid, updateData);
      
      if (response.success) {
        console.log('✅ Child updated successfully');
        
        // Close modal and refresh data
        setShowEditModal(false);
        setEditingChild(null);
        await loadChildren();
        
        // Notify parent component
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('childrenDataChanged'));
        }
        
        alert('Child updated successfully');
      } else {
        console.log('❌ Child update failed:', response.error);
        alert(`Error: ${response.error || 'Failed to update child'}`);
      }
    } catch (error) {
      alert('Failed to update child');
      console.error('Update child error:', error);
    } finally {
      setUpdatingChild(false);
    }
  };

  const handleCancelEdit = () => {
    setShowEditModal(false);
    setEditingChild(null);
    setEditChildFirstName('');
    setEditChildLastName('');
    setEditChildBirthDate('');
    setEditChildInterests('');
  };

  // Removed popstate handler - let React Router handle all navigation naturally

  // Handle initial selected child ID from parent
  useEffect(() => {
    if (initialSelectedChildId && children.length > 0) {
      const child = children.find(c => c.uuid === initialSelectedChildId);
      if (child) {
        setSelectedChild(child);
        // Removed manual history.pushState - let React Router handle all navigation
      }
    } else if (initialSelectedChildId === null) {
      // Clear selected child when parent clears the selection
      setSelectedChild(null);
    }
  }, [initialSelectedChildId, children]);

  const handleChildClick = (child: Child) => {
    // Use proper navigation to change the URL
    if (onNavigateToChildActivities) {
      onNavigateToChildActivities(child);
    } else {
      // Fallback to old behavior if navigation prop not provided
      setSelectedChild(child);
      onChildSelectionChange?.(child.uuid);
    }
  };

  const handleBackToChildren = () => {
    // Check if any invitations were viewed and refresh data if needed
    if (sessionStorage.getItem('invitationViewed') === 'true') {
      sessionStorage.removeItem('invitationViewed');
      // Refresh all data to remove viewed invitations from notifications
      loadChildren();
    }
    
    setSelectedChild(null);
    onChildSelectionChange?.(null);
    
    // Scroll to top before navigating back
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // Check if we have a navigation state indicating we came from calendar
    console.log('🔍 Checking navigation state:', location.state);
    console.log('🔍 SessionStorage navigationSource:', sessionStorage.getItem('navigationSource'));
    console.log('🔍 Current pathname:', location.pathname);
    
    // Try multiple approaches to detect if we came from calendar
    const fromState = location.state?.fromPath === '/calendar';
    const fromSession = sessionStorage.getItem('navigationSource') === 'calendar';
    const cameFromCalendar = fromState || fromSession;
    
    console.log('🔍 Detection results:', { fromState, fromSession, cameFromCalendar });
    
    if (cameFromCalendar) {
      console.log('🔙 Detected calendar origin, navigating directly to /calendar');
      // Clear the session storage flag
      sessionStorage.removeItem('navigationSource');
      // Direct navigation to calendar instead of trying to manipulate history
      navigate('/calendar', { replace: true });
      return;
    }
    
    console.log('🔙 Standard back navigation');
    // Use proper navigation if available, otherwise fallback to browser back
    if (onNavigateBack) {
      onNavigateBack();
    } else {
      window.history.back();
    }
  };

  if (loading) {
    return (
      <div className="children-screen">
        <div className="loading">Loading children...</div>
      </div>
    );
  }

  // Show child activity screen if a child is selected
  if (selectedChild) {
    return <ChildActivityScreen 
      child={selectedChild} 
      onBack={handleBackToChildren}
      onDataChanged={loadChildren}
      onNavigateToConnections={onNavigateToConnections}
      onNavigateToActivity={onNavigateToActivity}
      initialActivityUuid={initialActivityUuid}
      shouldRestoreActivityCreation={shouldRestoreActivityCreation}
    />;
  }

  return (
    <div className="children-screen">
      <div className="children-header">
        <h2>My Children</h2>
        <button onClick={handleAddChild} className="add-btn">
          + Add Child
        </button>
      </div>

      {/* Activity Draft Notification */}
      {activityDraft && (
        <div style={{
          background: 'linear-gradient(135deg, #667eea, #764ba2)',
          color: 'white',
          padding: '16px',
          borderRadius: '8px',
          margin: '16px 0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <div>
            <h4 style={{ margin: '0 0 4px 0', fontSize: '16px' }}>
              📝 Saved Activity Draft
            </h4>
            <p style={{ margin: '0', fontSize: '14px', opacity: 0.9 }}>
              You have an unfinished activity "{activityDraft.newActivity?.name || 'Untitled'}" 
              {activityDraft.childUuid && children.find(c => c.uuid === activityDraft.childUuid) && 
                ` for ${children.find(c => c.uuid === activityDraft.childUuid)?.name}`}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={resumeActivityCreation}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: '1px solid rgba(255,255,255,0.3)',
                color: 'white',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold'
              }}
            >
              Continue
            </button>
            <button
              onClick={dismissActivityDraft}
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: 'white',
                padding: '8px 12px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {!Array.isArray(children) || children.length === 0 ? (
        <div className="empty-state">
          <h3>No Children Added</h3>
          <p>Add your first child to start sharing activities</p>
          <button onClick={handleAddChild} className="add-first-btn">
            Add Child
          </button>
        </div>
      ) : (
        <div className="children-grid">
          {children.map((child) => (
            <div
              key={child.uuid}
              className="child-card"
              onClick={() => handleChildClick(child)}
            >
              <div className="child-info">
                <h3 className="child-name">{child.display_name || child.name}</h3>
                <div className="child-details">
                  {child.age && `Age: ${child.age}`}
                  {child.age && child.grade && ' • '}
                  {child.grade && `Grade: ${child.grade}`}
                </div>
                {child.school && (
                  <div className="child-school">School: {child.school}</div>
                )}
                {child.interests && (
                  <div className="child-interests">Interests: {child.interests}</div>
                )}
                
                {/* Activity Count Badge */}
                <div className="child-activity-count">
                  {childActivityCounts[child.uuid] || 0} {childActivityCounts[child.uuid] === 1 ? 'Activity' : 'Activities'}
                </div>

                {/* Notifications - Activity Invitations, Connection Requests, and Hosted Activity Responses */}
                {((childInvitations[child.uuid] && childInvitations[child.uuid].length > 0) || 
                  (childConnections[child.uuid] && childConnections[child.uuid].length > 0) ||
                  (hostedActivityNotifications.filter(n => n.host_child_uuid === child.uuid).length > 0)) && (
                  <div className="child-invitations">
                    <div className="invitations-header">
                      📩 {(childInvitations[child.uuid]?.length || 0) + (childConnections[child.uuid]?.length || 0) + hostedActivityNotifications.filter(n => n.host_child_uuid === child.uuid).length} Notification{((childInvitations[child.uuid]?.length || 0) + (childConnections[child.uuid]?.length || 0) + hostedActivityNotifications.filter(n => n.host_child_uuid === child.uuid).length) !== 1 ? 's' : ''}
                    </div>
                    
                    {/* Connection Requests */}
                    {childConnections[child.uuid] && childConnections[child.uuid].map((request) => {
                      return (
                        <div key={`connection_${request.id}`} className="invitation-item" onClick={(e) => e.stopPropagation()}>
                          <div className="invitation-message">
                            {request.child_name || 'Someone'} wants to connect
                          </div>
                          <div className="invitation-actions">
                          <button
                            className="invitation-accept-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleConnectionResponse(request.request_uuid, 'accept');
                            }}
                            disabled={processingConnection === request.request_uuid}
                          >
                            {processingConnection === request.request_uuid ? '...' : 'Accept'}
                          </button>
                          <button
                            className="invitation-reject-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleConnectionResponse(request.request_uuid, 'reject');
                            }}
                            disabled={processingConnection === request.request_uuid}
                          >
                            {processingConnection === request.request_uuid ? '...' : 'Decline'}
                          </button>
                          </div>
                        </div>
                      );
                    })}
                    
                    {/* Activity Invitations */}
                    {(() => {
                      const childInvs = childInvitations[child.uuid];
                      console.log(`🔍 CHILD CARD INVITATIONS for ${child.name}:`, childInvs);
                      if (childInvs) {
                        childInvs.forEach(inv => {
                          console.log(`  - ${inv.activity_name} (series_id: ${(inv as any).series_id})`);
                        });
                      }
                      return childInvs;
                    })() && childInvitations[child.uuid]
                      .filter((invitation, index, allInvitations) => {
                        // For recurring activities, only show the first invitation of each series
                        const currentSeriesId = (invitation as any).series_id;
                        const activityName = invitation.activity_name;
                        const hostParentName = (invitation as any).host_parent_name;
                        
                        console.log(`🔍 FILTERING invitation "${activityName}": series_id="${currentSeriesId}", host="${hostParentName}"`);
                        
                        // Check if this is truly a recurring activity (has series_id AND recurring_days)
                        const isRecurring = (invitation as any).is_recurring;
                        const recurringDays = (invitation as any).recurring_days;
                        const isTrulyRecurring = currentSeriesId && 
                                               currentSeriesId !== 'undefined' && 
                                               isRecurring && 
                                               recurringDays && 
                                               Array.isArray(recurringDays) && 
                                               recurringDays.length > 0;
                        
                        console.log(`🔍 RECURRING CHECK for "${activityName}":`, {
                          series_id: currentSeriesId,
                          is_recurring: isRecurring,
                          recurring_days: recurringDays,
                          isTrulyRecurring: isTrulyRecurring
                        });
                        
                        if (isTrulyRecurring) {
                          console.log(`  ✅ Using series_id grouping for "${activityName}"`);
                          // Use series_id for grouping (only for truly recurring activities)
                          const seriesInvitations = allInvitations.filter(other => 
                            (other as any).series_id === currentSeriesId
                          );
                          
                          if (seriesInvitations.length > 1) {
                            // This is part of a recurring series - only show the earliest one
                            const sortedSeries = seriesInvitations.sort((a, b) => 
                              new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
                            );
                            const shouldShow = invitation.id === sortedSeries[0].id;
                            console.log(`  📅 Series of ${seriesInvitations.length}, showing first: ${shouldShow}`);
                            console.log(`  📅 Current invitation ID: ${invitation.id}, date: ${invitation.start_date}`);
                            console.log(`  📅 First invitation ID: ${sortedSeries[0].id}, date: ${sortedSeries[0].start_date}`);
                            return shouldShow;
                          }
                        }
                        
                        console.log(`  ✅ Individual activity, showing: true`);
                        // Show all individual activities (no fallback grouping by name)
                        return true;
                      })
                      .map((invitation) => {
                      // Use just the host child's name (which should be their full name from the database)
                      const childFullName = invitation.host_child_name || 'Someone';
                      
                      const formatDate = (dateString: string) => {
                        const date = new Date(dateString);
                        const day = String(date.getDate()).padStart(2, '0');
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const year = date.getFullYear();
                        return `${day}/${month}/${year}`;
                      };

                      const timeRange = invitation.start_time && invitation.end_time 
                        ? ` at ${invitation.start_time}-${invitation.end_time}`
                        : invitation.start_time
                        ? ` at ${invitation.start_time}`
                        : '';

                      // ✅ RECURRING ACTIVITIES: Apply same logic as NotificationBell
                      const currentChildInvitations = childInvitations[child.uuid] || [];
                      
                      // Check if this is part of a truly recurring series (same logic as filtering)
                      const currentSeriesId = (invitation as any).series_id;
                      const isRecurring = (invitation as any).is_recurring;
                      const recurringDays = (invitation as any).recurring_days;
                      const isTrulyRecurring = currentSeriesId && 
                                             currentSeriesId !== 'undefined' && 
                                             isRecurring && 
                                             recurringDays && 
                                             Array.isArray(recurringDays) && 
                                             recurringDays.length > 0;
                      
                      const seriesInvitations = isTrulyRecurring 
                        ? currentChildInvitations.filter(inv => (inv as any).series_id === currentSeriesId)
                        : [invitation]; // Single invitation if not truly recurring
                      
                      let displayMessage = '';
                      if (isTrulyRecurring && seriesInvitations.length > 1) {
                        // This is a recurring activity - show grouped message
                        const firstInvitation = seriesInvitations[0];
                        const startDate = new Date(firstInvitation.start_date);
                        const dayOfWeek = startDate.toLocaleDateString('en-US', { weekday: 'long' });
                        displayMessage = `${childFullName} invited you to "${invitation.activity_name}" - recurring every ${dayOfWeek} (${seriesInvitations.length} activities)${timeRange}`;
                      } else {
                        // Single activity
                        displayMessage = `${childFullName} invited you to "${invitation.activity_name}" on ${formatDate(invitation.start_date)}${timeRange}`;
                      }

                      return (
                        <div key={invitation.id} className="invitation-item" onClick={(e) => e.stopPropagation()}>
                          <div className="invitation-message">
                            {displayMessage}
                          </div>
                          <div className="invitation-actions">
                            <button
                              className="invitation-accept-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleInvitationResponse(invitation.invitation_uuid || String(invitation.id), 'accept');
                              }}
                              disabled={processingInvitation === invitation.id}
                            >
                              {processingInvitation === invitation.id ? '...' : 'Accept'}
                            </button>
                            <button
                              className="invitation-reject-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleInvitationResponse(invitation.invitation_uuid || String(invitation.id), 'reject');
                              }}
                              disabled={processingInvitation === invitation.id}
                            >
                              {processingInvitation === invitation.id ? '...' : 'Decline'}
                            </button>
                            <button
                              className="invitation-calendar-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                onNavigateToChildCalendar?.(child, invitation.start_date);
                              }}
                            >
                              See in Calendar
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {/* Hosted Activity Notifications */}
                    {hostedActivityNotifications.filter(n => n.host_child_uuid === child.uuid).map((notification) => {
                      const formatDate = (dateString: string) => {
                        const date = new Date(dateString);
                        const day = String(date.getDate()).padStart(2, '0');
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const year = date.getFullYear();
                        return `${day}/${month}/${year}`;
                      };

                      // Create notification message based on whether it's a recurring series or single activity
                      let displayMessage = '';
                      let responseMessage = '';
                      
                      if (notification.is_recurring_series && notification.series_count > 1) {
                        // Recurring series notification - show grouped message with deduplicated responses
                        const startDate = new Date(notification.start_date);
                        const dayOfWeek = startDate.toLocaleDateString('en-US', { weekday: 'long' });
                        
                        if (notification.unviewed_responses && notification.unviewed_responses.length > 0) {
                          // Group responses by person and status to avoid duplicates
                          const responseGroups = new Map<string, { name: string, statuses: Set<string> }>();
                          
                          notification.unviewed_responses.forEach((r: any) => {
                            const name = r.child_name || r.parent_name || 'Someone';
                            const status = r.status === 'accepted' ? 'accepted' : 'declined';
                            
                            if (responseGroups.has(name)) {
                              responseGroups.get(name)!.statuses.add(status);
                            } else {
                              responseGroups.set(name, { name, statuses: new Set([status]) });
                            }
                          });
                          
                          // Create clean message for each person
                          const responseTexts = Array.from(responseGroups.values()).map(group => {
                            const statuses = Array.from(group.statuses);
                            if (statuses.length === 1) {
                              return `${group.name} ${statuses[0]} the series`;
                            } else {
                              return `${group.name} responded to the series`;
                            }
                          });
                          
                          responseMessage = responseTexts.join(', ');
                        } else {
                          // Fallback summary message
                          const statusTypes = notification.unviewed_statuses ? notification.unviewed_statuses.split(',').join('/') : 'responses';
                          responseMessage = `${notification.total_unviewed} series ${statusTypes}`;
                        }
                        
                        displayMessage = `📅 Recurring Activity "${notification.activity_name}" (${notification.series_count} sessions every ${dayOfWeek}): ${responseMessage}`;
                      } else {
                        // Single activity notification
                        const timeRange = notification.start_time && notification.end_time 
                          ? ` at ${notification.start_time}-${notification.end_time}`
                          : notification.start_time
                          ? ` at ${notification.start_time}`
                          : '';
                        
                        if (notification.unviewed_responses && notification.unviewed_responses.length > 0) {
                          // Detailed message with names for single activity
                          responseMessage = notification.unviewed_responses
                            .map((r: any) => `${r.child_name || r.parent_name || 'Someone'} ${r.status === 'accepted' ? 'accepted' : 'declined'}`)
                            .join(', ');
                        } else {
                          // Fallback summary message
                          const statusTypes = notification.unviewed_statuses ? notification.unviewed_statuses.split(',').join('/') : 'responses';
                          responseMessage = `${notification.total_unviewed} unviewed ${statusTypes}`;
                        }
                        
                        displayMessage = `📅 Activity "${notification.activity_name}" on ${formatDate(notification.start_date)}${timeRange}: ${responseMessage}`;
                      }

                      return (
                        <div key={`hosted_${notification.activity_uuid}`} className="invitation-item" onClick={(e) => e.stopPropagation()}>
                          <div className="invitation-message">
                            {displayMessage}
                          </div>
                          <div className="invitation-actions">
                            <button
                              className="invitation-calendar-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMarkHostedActivityAsViewed(notification);
                              }}
                            >
                              Mark as Read
                            </button>
                            <button
                              className="invitation-calendar-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                // Navigate to the host child's activity screen
                                const hostChild = children.find(c => c.uuid === notification.host_child_uuid);
                                if (hostChild) {
                                  // This will navigate to the child's individual activity screen
                                  handleChildClick(hostChild);
                                }
                              }}
                            >
                              View Activity
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                
                <div className="child-date">
                  Added: {new Date(child.created_at).toLocaleDateString()}
                </div>
              </div>
              <div className="child-actions">
                <button
                  className="edit-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditChild(child);
                  }}
                  title="Edit child details"
                >
                  Edit
                </button>
                <button
                  className="delete-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteChild(child);
                  }}
                  title="Delete child"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Child Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Add New Child</h3>
            <div className="name-fields">
              <input
                type="text"
                placeholder="First name"
                value={newChildFirstName}
                onChange={(e) => setNewChildFirstName(e.target.value)}
                className="modal-input"
                autoFocus
              />
              <input
                type="text"
                placeholder="Last name"
                value={newChildLastName}
                onChange={(e) => setNewChildLastName(e.target.value)}
                className="modal-input"
              />
            </div>
            <div className="form-group">
              <label>Date of Birth (Optional)</label>
              <input
                type="date"
                value={newChildBirthDate}
                onChange={(e) => setNewChildBirthDate(e.target.value)}
                className="modal-input"
                max={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div className="modal-actions">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNewChildFirstName('');
                  setNewChildLastName('');
                  setNewChildBirthDate('');
                }}
                className="cancel-btn"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateChild}
                disabled={addingChild}
                className={`confirm-btn ${addingChild ? 'disabled' : ''}`}
              >
                {addingChild ? 'Adding...' : 'Add Child'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Child Modal */}
      {showEditModal && (
        <div className="modal-overlay" onClick={handleCancelEdit}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Edit Child Details</h2>
            <div className="form-group">
              <label>First Name *</label>
              <input
                type="text"
                value={editChildFirstName}
                onChange={(e) => setEditChildFirstName(e.target.value)}
                placeholder="Enter first name"
                className="modal-input"
              />
            </div>
            <div className="form-group">
              <label>Last Name</label>
              <input
                type="text"
                value={editChildLastName}
                onChange={(e) => setEditChildLastName(e.target.value)}
                placeholder="Enter last name"
                className="modal-input"
              />
            </div>
            <div className="form-group">
              <label>Date of Birth</label>
              <input
                type="date"
                value={editChildBirthDate}
                onChange={(e) => setEditChildBirthDate(e.target.value)}
                className="modal-input"
                max={new Date().toISOString().split('T')[0]} // Can't be future date
              />
            </div>
            <div className="form-group">
              <label>Interests</label>
              <textarea
                value={editChildInterests}
                onChange={(e) => setEditChildInterests(e.target.value)}
                placeholder="e.g., Soccer, Art, Reading, Music"
                className="modal-input"
                rows={3}
              />
            </div>
            <div className="modal-actions">
              <button
                onClick={handleCancelEdit}
                className="cancel-btn"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateChild}
                disabled={updatingChild}
                className={`confirm-btn ${updatingChild ? 'disabled' : ''}`}
              >
                {updatingChild ? 'Updating...' : 'Update Child'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChildrenScreen;