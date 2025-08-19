import React, { useState, useEffect } from 'react';
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
  invited_child_id?: number;
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
  initialSelectedChildId?: number | null;
  initialActivityUuid?: string;
  onChildSelectionChange?: (childId: number | null) => void;
  onNavigateToConnections?: (isInActivityCreation?: boolean) => void;
  shouldRestoreActivityCreation?: boolean;
}

const ChildrenScreen: React.FC<ChildrenScreenProps> = ({ onNavigateToCalendar, onNavigateToChildCalendar, onNavigateToChildActivities, onNavigateToActivity, onNavigateBack, initialSelectedChildId, initialActivityUuid, onChildSelectionChange, onNavigateToConnections, shouldRestoreActivityCreation }) => {
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newChildFirstName, setNewChildFirstName] = useState('');
  const [newChildLastName, setNewChildLastName] = useState('');
  const [addingChild, setAddingChild] = useState(false);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [childActivityCounts, setChildActivityCounts] = useState<Record<number, number>>({});
  const [childInvitations, setChildInvitations] = useState<Record<number, ActivityInvitation[]>>({});
  const [childConnections, setChildConnections] = useState<Record<number, ConnectionRequest[]>>({});
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
    if (activityDraft && activityDraft.childId) {
      const child = children.find(c => c.id === activityDraft.childId);
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
      setLoading(true);
      const response = await apiService.getChildren();
      
      if (response.success && response.data) {
        // Handle different response formats - API might return { data: [...] }
        const childrenData = Array.isArray(response.data) 
          ? response.data 
          : (response.data as any)?.data || [];
        setChildren(childrenData);
        
        // Load activity counts, invitations, connection requests, and hosted activity notifications
        await loadActivityCounts(childrenData);
        await loadInvitationsForChildren(childrenData);
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

  const loadActivityCounts = async (childrenData: Child[]) => {
    try {
      const counts: Record<number, number> = {};
      
      // Get date range for accepted invitations
      const today = new Date();
      const oneYearLater = new Date();
      oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
      const startDate = today.toISOString().split('T')[0];
      const endDate = oneYearLater.toISOString().split('T')[0];
      
      // Load activity count for each child using secure UUID-based filtering
      const calendarActivitiesResponse = await apiService.getCalendarActivities(startDate, endDate);
      if (calendarActivitiesResponse.success && calendarActivitiesResponse.data) {
        const allActivities = Array.isArray(calendarActivitiesResponse.data) ? calendarActivitiesResponse.data : [];
        
        for (const child of childrenData) {
          try {
            // Filter activities for this specific child using UUIDs (same logic as ChildActivityScreen)
            const childActivities = allActivities.filter(activity => {
              const ownsActivity = activity.child_uuid === child.uuid;
              const isInvited = activity.invited_child_uuid === child.uuid && 
                               activity.invitation_status && 
                               activity.invitation_status !== 'none';
              return ownsActivity || isInvited;
            });
            
            counts[child.id] = childActivities.length;
            console.log(`📊 Child ${child.name} (UUID: ${child.uuid}): ${childActivities.length} activities`);
          } catch (error) {
            console.error(`Failed to load activity count for child ${child.id}:`, error);
            counts[child.id] = 0;
          }
        }
      } else {
        console.error('Failed to load calendar activities for counts:', calendarActivitiesResponse.error);
        // Set all counts to 0 if API fails
        for (const child of childrenData) {
          counts[child.id] = 0;
        }
      }
      
      setChildActivityCounts(counts);
    } catch (error) {
      console.error('Failed to load activity counts:', error);
    }
  };

  const loadInvitationsForChildren = async (childrenData: Child[]) => {
    try {
      // Use unified calendar invitations endpoint with a wide date range
      const today = new Date();
      const oneYearLater = new Date();
      oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
      
      const startDate = today.toISOString().split('T')[0];
      const endDate = oneYearLater.toISOString().split('T')[0];
      
      const response = await apiService.getAllInvitations(startDate, endDate);
      if (response.success && response.data) {
        
        // Group invitations by child
        const invitationsByChild: Record<number, ActivityInvitation[]> = {};
        
        // Initialize empty arrays for each child
        childrenData.forEach(child => {
          invitationsByChild[child.id] = [];
        });
        
        // Filter for pending invitations only and group by child
        response.data.forEach((invitation: any) => {
          if (invitation.status === 'pending') {
            // Find the child this invitation is for using child name
            const targetChild = childrenData.find(child => 
              child.name === invitation.invited_child_name
            );
            
            if (targetChild) {
              // Convert the calendar invitation format to match ActivityInvitation interface
              invitationsByChild[targetChild.id].push({
                id: invitation.invitation_id,
                invitation_uuid: invitation.invitation_uuid,
                activity_id: invitation.id,
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
                invited_child_id: targetChild.id,
                invited_child_name: invitation.invited_child_name,
                message: invitation.invitation_message,
                created_at: invitation.created_at || new Date().toISOString()
              });
            }
          }
        });
        
        setChildInvitations(invitationsByChild);
      } else {
        console.error('Failed to load activity invitations:', response.error);
        setChildInvitations({});
      }
    } catch (error) {
      console.error('Failed to load invitations:', error);
      setChildInvitations({});
    }
  };

  const loadConnectionRequestsForChildren = async (childrenData: Child[]) => {
    try {
      // Get all connection requests for this parent
      const response = await apiService.getConnectionRequests();
      if (response.success && response.data) {
        // Group connection requests by child
        const connectionsByChild: Record<number, ConnectionRequest[]> = {};
        
        // Initialize empty arrays for each child
        childrenData.forEach(child => {
          connectionsByChild[child.id] = [];
        });
        
        // Group connection requests by the target child
        response.data.forEach((request: any) => {
          // Find the child this connection request is for
          const targetChild = childrenData.find(child => 
            (child.display_name || child.name) === request.target_child_name
          );
          
          if (targetChild) {
            connectionsByChild[targetChild.id].push({
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
        
        const notifications: any[] = [];
        
        // Check each activity where one of our children is the host AND has unviewed responses
        for (const activity of allActivities) {
          const hostChild = childrenData.find(child => child.uuid === activity.child_uuid);
          const hasUnviewedResponses = parseInt(activity.unviewed_status_changes || '0') > 0;
          
          if (hostChild && hasUnviewedResponses) {
            try {
              // Get participants for this activity to get detailed response information
              const participantsResponse = await apiService.getActivityParticipants(activity.activity_uuid || activity.uuid);
              if (participantsResponse.success && participantsResponse.data) {
                const participants = participantsResponse.data.participants || [];
                
                // Since calendar activities says there are unviewed responses, find non-pending participants
                // We can't rely on status_viewed_at since it's missing from the API, but we know there are unviewed responses
                const responseParticipants = participants.filter((p: any) => 
                  p.status !== 'pending'
                );
                
                if (responseParticipants.length > 0) {
                  notifications.push({
                    activity_id: activity.id,
                    activity_uuid: activity.activity_uuid || activity.uuid,
                    activity_name: activity.name,
                    start_date: activity.start_date,
                    start_time: activity.start_time,
                    end_time: activity.end_time,
                    host_child_id: hostChild.id,
                    host_child_name: hostChild.name,
                    unviewed_responses: responseParticipants,
                    total_unviewed: parseInt(activity.unviewed_status_changes),
                    unviewed_statuses: activity.unviewed_statuses
                  });
                }
              }
            } catch (error) {
              console.error(`Failed to load participants for activity ${activity.id}:`, error);
              // Fallback: create notification without detailed participant info
              notifications.push({
                activity_id: activity.id,
                activity_uuid: activity.activity_uuid || activity.uuid,
                activity_name: activity.name,
                start_date: activity.start_date,
                start_time: activity.start_time,
                end_time: activity.end_time,
                host_child_id: hostChild.id,
                host_child_name: hostChild.name,
                unviewed_responses: [],
                total_unviewed: parseInt(activity.unviewed_status_changes),
                unviewed_statuses: activity.unviewed_statuses
              });
            }
          }
        }
        
        setHostedActivityNotifications(notifications);
        console.log(`📊 Found ${notifications.length} hosted activities with unviewed responses`);
      }
    } catch (error) {
      console.error('Failed to load hosted activity notifications:', error);
      setHostedActivityNotifications([]);
    }
  };

  const handleInvitationResponse = async (invitationUuid: string, action: 'accept' | 'reject') => {
    try {
      setProcessingInvitation(parseInt(invitationUuid)); // Keep for UI state management
      const response = await apiService.respondToActivityInvitation(invitationUuid, action);
      
      if (response.success) {
        // Remove the invitation from the child's list
        setChildInvitations(prev => {
          const updated = { ...prev };
          Object.keys(updated).forEach(childId => {
            updated[parseInt(childId)] = updated[parseInt(childId)].filter(inv => inv.invitation_uuid !== invitationUuid);
          });
          return updated;
        });
        
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
            updated[parseInt(childId)] = updated[parseInt(childId)].filter(req => req.request_uuid !== connectionUuid);
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
      // Mark all unviewed responses for this activity as viewed
      for (const response of activityNotification.unviewed_responses) {
        if (response.invitation_uuid) {
          await apiService.markStatusChangeAsViewed(response.invitation_uuid);
        }
      }
      
      // Remove this notification from the list
      setHostedActivityNotifications(prev => 
        prev.filter(n => n.activity_uuid !== activityNotification.activity_uuid)
      );
      
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
      const response = await apiService.createChild({ 
        first_name: newChildFirstName.trim(),
        last_name: newChildLastName.trim()
      });
      
      if (response.success) {
        // Immediately add the new child to the state for better UX
        if (response.data) {
          setChildren(prev => [response.data, ...prev]);
        }
        
        setNewChildFirstName('');
        setNewChildLastName('');
        setShowAddModal(false);
        
        // Also reload to ensure everything is in sync
        loadChildren();
      } else {
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
        const response = await apiService.deleteChild(child.id);
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

  // Removed popstate handler - let React Router handle all navigation naturally

  // Handle initial selected child ID from parent
  useEffect(() => {
    if (initialSelectedChildId && children.length > 0) {
      const child = children.find(c => c.id === initialSelectedChildId);
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
      onChildSelectionChange?.(child.id);
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
              {activityDraft.childId && children.find(c => c.id === activityDraft.childId) && 
                ` for ${children.find(c => c.id === activityDraft.childId)?.name}`}
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
              key={child.id}
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
                  {childActivityCounts[child.id] || 0} {childActivityCounts[child.id] === 1 ? 'Activity' : 'Activities'}
                </div>

                {/* Notifications - Activity Invitations, Connection Requests, and Hosted Activity Responses */}
                {((childInvitations[child.id] && childInvitations[child.id].length > 0) || 
                  (childConnections[child.id] && childConnections[child.id].length > 0) ||
                  (hostedActivityNotifications.filter(n => n.host_child_id === child.id).length > 0)) && (
                  <div className="child-invitations">
                    <div className="invitations-header">
                      📩 {(childInvitations[child.id]?.length || 0) + (childConnections[child.id]?.length || 0) + hostedActivityNotifications.filter(n => n.host_child_id === child.id).length} Notification{((childInvitations[child.id]?.length || 0) + (childConnections[child.id]?.length || 0) + hostedActivityNotifications.filter(n => n.host_child_id === child.id).length) !== 1 ? 's' : ''}
                    </div>
                    
                    {/* Connection Requests */}
                    {childConnections[child.id] && childConnections[child.id].map((request) => {
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
                    {childInvitations[child.id] && childInvitations[child.id].map((invitation) => {
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

                      return (
                        <div key={invitation.id} className="invitation-item" onClick={(e) => e.stopPropagation()}>
                          <div className="invitation-message">
                            {childFullName} invited you to "{invitation.activity_name}" on {formatDate(invitation.start_date)}{timeRange}
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
                    {hostedActivityNotifications.filter(n => n.host_child_id === child.id).map((notification) => {
                      const formatDate = (dateString: string) => {
                        const date = new Date(dateString);
                        const day = String(date.getDate()).padStart(2, '0');
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const year = date.getFullYear();
                        return `${day}/${month}/${year}`;
                      };

                      const timeRange = notification.start_time && notification.end_time 
                        ? ` at ${notification.start_time}-${notification.end_time}`
                        : notification.start_time
                        ? ` at ${notification.start_time}`
                        : '';

                      // Create notification message - use detailed names if available, otherwise use summary
                      let responseMessage = '';
                      if (notification.unviewed_responses && notification.unviewed_responses.length > 0) {
                        // Detailed message with names
                        responseMessage = notification.unviewed_responses
                          .map((r: any) => `${r.parent_name || 'Someone'} ${r.status === 'accepted' ? 'accepted' : 'declined'}`)
                          .join(', ');
                      } else {
                        // Fallback summary message
                        const statusTypes = notification.unviewed_statuses ? notification.unviewed_statuses.split(',').join('/') : 'responses';
                        responseMessage = `${notification.total_unviewed} unviewed ${statusTypes}`;
                      }

                      return (
                        <div key={`hosted_${notification.activity_uuid}`} className="invitation-item" onClick={(e) => e.stopPropagation()}>
                          <div className="invitation-message">
                            📅 Activity "{notification.activity_name}" on {formatDate(notification.start_date)}{timeRange}: {responseMessage}
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
                                const hostChild = children.find(c => c.id === notification.host_child_id);
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
            <div className="modal-actions">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNewChildFirstName('');
                  setNewChildLastName('');
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
    </div>
  );
};

export default ChildrenScreen;