import React, { useState, useEffect } from 'react';
import ApiService from '../services/api';
import { Child } from '../types';
import ChildActivityScreen from './ChildActivityScreen';
import './ChildrenScreen.css';

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
  host_parent_name: string;
  host_parent_email: string;
  invited_child_name?: string;
  message?: string;
  created_at: string;
}

const ChildrenScreen = () => {
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newChildName, setNewChildName] = useState('');
  const [addingChild, setAddingChild] = useState(false);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [childActivityCounts, setChildActivityCounts] = useState<Record<number, number>>({});
  const [childInvitations, setChildInvitations] = useState<Record<number, ActivityInvitation[]>>({});
  const [processingInvitation, setProcessingInvitation] = useState<number | null>(null);
  const apiService = ApiService.getInstance();


  useEffect(() => {
    loadChildren();
  }, []);

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
        
        // Load activity counts and invitations for each child
        await loadActivityCounts(childrenData);
        await loadInvitationsForChildren(childrenData);
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
      
      // Load activity count for each child
      for (const child of childrenData) {
        try {
          const response = await apiService.getActivities(child.id);
          if (response.success && response.data && Array.isArray(response.data)) {
            counts[child.id] = response.data.length;
          } else {
            counts[child.id] = 0;
          }
        } catch (error) {
          console.error(`Failed to load activity count for child ${child.id}:`, error);
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
      // Get all activity invitations for this parent
      const response = await apiService.getActivityInvitations();
      if (response.success && response.data) {
        // Group invitations by child
        const invitationsByChild: Record<number, ActivityInvitation[]> = {};
        
        // Initialize empty arrays for each child
        childrenData.forEach(child => {
          invitationsByChild[child.id] = [];
        });
        
        // Group invitations by the child they're for
        response.data.forEach((invitation: any) => {
          // Find the child this invitation is for
          const targetChild = childrenData.find(child => 
            child.name === invitation.invited_child_name
          );
          
          if (targetChild && invitation.status === 'pending') {
            invitationsByChild[targetChild.id].push({
              id: invitation.id,
              activity_id: invitation.activity_id,
              activity_name: invitation.activity_name,
              activity_description: invitation.activity_description,
              start_date: invitation.start_date,
              end_date: invitation.end_date,
              start_time: invitation.start_time,
              end_time: invitation.end_time,
              location: invitation.location,
              status: invitation.status,
              host_parent_name: invitation.host_parent_name,
              host_parent_email: invitation.host_parent_email,
              invited_child_name: invitation.invited_child_name,
              message: invitation.message,
              created_at: invitation.created_at
            });
          }
        });
        
        setChildInvitations(invitationsByChild);
      }
    } catch (error) {
      console.error('Failed to load invitations:', error);
    }
  };

  const handleInvitationResponse = async (invitationId: number, action: 'accept' | 'reject') => {
    try {
      setProcessingInvitation(invitationId);
      const response = await apiService.respondToActivityInvitation(invitationId, action);
      
      if (response.success) {
        // Remove the invitation from the child's list
        setChildInvitations(prev => {
          const updated = { ...prev };
          Object.keys(updated).forEach(childId => {
            updated[parseInt(childId)] = updated[parseInt(childId)].filter(inv => inv.id !== invitationId);
          });
          return updated;
        });
        
        const message = action === 'accept' 
          ? 'Invitation accepted! Activity will appear in your calendar.' 
          : 'Invitation declined.';
        alert(message);
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

  const handleAddChild = () => {
    setShowAddModal(true);
  };

  const handleCreateChild = async () => {
    if (!newChildName.trim()) {
      alert('Please enter a child name');
      return;
    }

    setAddingChild(true);
    try {
      const response = await apiService.createChild({ name: newChildName.trim() });
      
      if (response.success) {
        setNewChildName('');
        setShowAddModal(false);
        loadChildren();
        alert('Child added successfully');
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
    if (window.confirm(`Are you sure you want to delete ${child.name}? This will also delete all their activities.`)) {
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

  // Handle browser back button for child selection
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state && event.state.selectedChildId) {
        const child = children.find(c => c.id === event.state.selectedChildId);
        setSelectedChild(child || null);
      } else {
        setSelectedChild(null);
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [children]);

  const handleChildClick = (child: Child) => {
    setSelectedChild(child);
    // Push state for child selection
    window.history.pushState({ selectedChildId: child.id }, '', window.location.href);
  };

  const handleBackToChildren = () => {
    // Use browser back functionality
    window.history.back();
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
    return <ChildActivityScreen child={selectedChild} onBack={handleBackToChildren} />;
  }

  return (
    <div className="children-screen">
      <div className="children-header">
        <h2>My Children</h2>
        <button onClick={handleAddChild} className="add-btn">
          + Add Child
        </button>
      </div>

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
                <h3 className="child-name">{child.name}</h3>
                <div className="child-details">
                  {child.age && `Age: ${child.age}`}
                  {child.age && child.grade && ' • '}
                  {child.grade && `Grade: ${child.grade}`}
                </div>
                {child.school && (
                  <div className="child-school">🏫 {child.school}</div>
                )}
                {child.interests && (
                  <div className="child-interests">💡 {child.interests}</div>
                )}
                
                {/* Activity Count Badge */}
                <div className="child-activity-count">
                  📋 {childActivityCounts[child.id] || 0} {childActivityCounts[child.id] === 1 ? 'Activity' : 'Activities'}
                </div>

                {/* Activity Invitations - Optimized Layout */}
                {childInvitations[child.id] && childInvitations[child.id].length > 0 && (
                  <div className="child-invitations">
                    <div className="invitations-header">
                      📩 {childInvitations[child.id].length} Invitation{childInvitations[child.id].length !== 1 ? 's' : ''}
                    </div>
                    {childInvitations[child.id].map((invitation) => (
                      <div key={invitation.id} className="invitation-item" onClick={(e) => e.stopPropagation()}>
                        <div className="invitation-header">
                          <div className="invitation-activity">
                            <strong>{invitation.activity_name}</strong>
                            <span className="invitation-from">from {invitation.host_parent_name}</span>
                          </div>
                          <div className="invitation-actions">
                            <button
                              className="invitation-accept-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleInvitationResponse(invitation.id, 'accept');
                              }}
                              disabled={processingInvitation === invitation.id}
                            >
                              {processingInvitation === invitation.id ? '...' : 'Accept'}
                            </button>
                            <button
                              className="invitation-reject-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleInvitationResponse(invitation.id, 'reject');
                              }}
                              disabled={processingInvitation === invitation.id}
                            >
                              {processingInvitation === invitation.id ? '...' : 'Decline'}
                            </button>
                          </div>
                        </div>
                        <div className="invitation-meta">
                          <span className="invitation-meta-item">
                            📅 {new Date(invitation.start_date).toLocaleDateString()}
                          </span>
                          {invitation.start_time && (
                            <span className="invitation-meta-item">🕐 {invitation.start_time}</span>
                          )}
                          {invitation.location && (
                            <span className="invitation-meta-item">📍 {invitation.location}</span>
                          )}
                        </div>
                        {invitation.message && (
                          <div className="invitation-message">"{invitation.message}"</div>
                        )}
                      </div>
                    ))}
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
                  🗑️
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
            <input
              type="text"
              placeholder="Enter child's name"
              value={newChildName}
              onChange={(e) => setNewChildName(e.target.value)}
              className="modal-input"
              autoFocus
            />
            <div className="modal-actions">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNewChildName('');
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