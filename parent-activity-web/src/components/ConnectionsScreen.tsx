import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ApiService from '../services/api';
import { ConnectionRequest, Child, SearchResult } from '../types';
import './ConnectionsScreen.css';

interface ConnectionsScreenProps {
  cameFromActivity?: boolean;
  onReturnToActivity?: () => void;
  returnToActivityUrl?: string;
  onForceTabUpdate?: (tab: string) => void;
}

const ConnectionsScreen: React.FC<ConnectionsScreenProps> = ({ cameFromActivity = false, onReturnToActivity, returnToActivityUrl, onForceTabUpdate }) => {
  const navigate = useNavigate();
  const [connectionRequests, setConnectionRequests] = useState<ConnectionRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<any[]>([]);
  const [activeConnections, setActiveConnections] = useState<any[]>([]);
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [selectedParent, setSelectedParent] = useState<SearchResult | null>(null);
  const [myChildren, setMyChildren] = useState<Child[]>([]);
  const [selectedMyChild, setSelectedMyChild] = useState<string | null>(null);
  const [selectedTargetChildren, setSelectedTargetChildren] = useState<string[]>([]);
  const [connectionMessage, setConnectionMessage] = useState('');
  const [showReturnToActivityPopup, setShowReturnToActivityPopup] = useState(false);
  const [showSkeletonModal, setShowSkeletonModal] = useState(false);
  const [noResultsContact, setNoResultsContact] = useState('');
  const [skeletonChildName, setSkeletonChildName] = useState('');
  const [skeletonChildBirthYear, setSkeletonChildBirthYear] = useState('');
  const apiService = ApiService.getInstance();

  useEffect(() => {
    loadConnectionRequests();
    loadSentRequests();
    loadActiveConnections();
    loadMyChildren();

    // Set up polling for connection requests every 30 seconds
    const interval = setInterval(() => {
      loadConnectionRequests();
      loadSentRequests();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const loadConnectionRequests = async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading connection requests...');
      const response = await apiService.getConnectionRequests();
      console.log('📋 Connection requests response:', response);
      
      if (response.success && response.data) {
        console.log('✅ Connection requests loaded:', response.data.length, 'requests');
        console.log('📝 Request details:', response.data);
        setConnectionRequests(response.data);
      } else {
        console.error('❌ Failed to load connection requests:', response.error);
        alert(`Error: ${response.error || 'Failed to load connection requests'}`);
      }
    } catch (error) {
      console.error('❌ Load connection requests error:', error);
      alert('Failed to load connection requests');
    } finally {
      setLoading(false);
    }
  };

  const loadSentRequests = async () => {
    try {
      console.log('🔄 Loading sent connection requests...');
      const response = await apiService.getSentConnectionRequests();
      console.log('📤 Sent requests response:', response);
      
      if (response.success && response.data) {
        console.log('✅ Sent requests loaded:', response.data.length, 'requests');
        console.log('📝 Sent request details:', response.data);
        setSentRequests(response.data);
      } else {
        console.error('❌ Failed to load sent requests:', response.error);
      }
    } catch (error) {
      console.error('❌ Load sent requests error:', error);
    }
  };

  const loadMyChildren = async () => {
    try {
      const response = await apiService.getChildren();
      if (response.success && response.data) {
        setMyChildren(response.data);
      }
    } catch (error) {
      console.error('Load children error:', error);
    }
  };

  const loadActiveConnections = async () => {
    try {
      const response = await apiService.getConnections();
      if (response.success && response.data) {
        setActiveConnections(response.data);
      } else {
        console.error('Failed to load active connections:', response.error);
      }
    } catch (error) {
      console.error('Load active connections error:', error);
    }
  };

  const handleSearchParent = async () => {
    if (!searchText.trim() || searchText.trim().length < 3) {
      alert('Please enter at least 3 characters to search');
      return;
    }
    
    setSearching(true);
    try {
      const response = await apiService.searchParent(searchText.trim());
      if (response.success && response.data) {
        setSearchResults(response.data);
        if (response.data.length === 0) {
          // No results found - offer to create skeleton account
          setNoResultsContact(searchText.trim());
          setShowSkeletonModal(true);
        }
      } else {
        alert(`Error: ${response.error || 'Search failed'}`);
      }
    } catch (error) {
      alert('Search failed');
      console.error('Search error:', error);
    } finally {
      setSearching(false);
    }
  };

  const handleAcceptRequest = async (requestUuid: string) => {
    if (window.confirm('Are you sure you want to accept this connection request?')) {
      try {
        const response = await apiService.respondToConnectionRequest(requestUuid, 'accept');
        if (response.success) {
          // Find the connection request details before removing it from state
          const acceptedRequest = connectionRequests.find(req => req.request_uuid === requestUuid);
          
          setConnectionRequests(prev => prev.filter(req => req.request_uuid !== requestUuid));
          // Reload active connections to show the new connection immediately
          loadActiveConnections();
          
          // Auto-notify: Now handled on backend for bidirectional notifications
          console.log('🔔 Auto-notification now handled on backend for both directions');
          
          alert('Connection request accepted!');
        } else {
          alert(`Error: ${response.error || 'Failed to accept request'}`);
        }
      } catch (error) {
        alert('Failed to accept request');
        console.error('Accept request error:', error);
      }
    }
  };

  const notifyNewConnectionAboutFutureActivities = async (
    newConnectionParentUuid: string, 
    requestorChildUuid: string,
    targetChildUuid?: string
  ) => {
    try {
      console.log('🔔 Starting auto-notification process:', {
        newConnectionParentUuid,
        requestorChildUuid,  
        targetChildUuid,
        note: 'Sending current user auto-notify activities to new connection'
      });

      const today = new Date().toISOString().split('T')[0];
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1); // Get activities for the next year
      const endDate = futureDate.toISOString().split('T')[0];

      console.log('📅 Fetching activities from', today, 'to', endDate);

      // Get all future activities for the accepting parent (current user)
      const activitiesResponse = await apiService.getCalendarActivities(today, endDate);
      
      console.log('📋 Activities response:', {
        success: activitiesResponse.success,
        dataLength: activitiesResponse.data?.length,
        data: activitiesResponse.data
      });
      
      if (activitiesResponse.success && activitiesResponse.data) {
        console.log('🔍 All activities found:', activitiesResponse.data.length);

        // Filter for activities that are in the future, hosted by current user, and have auto-notify enabled
        const futureActivities = activitiesResponse.data.filter(activity => {
          const activityDate = new Date(activity.start_date);
          const now = new Date();
          const isFuture = activityDate >= now;
          const isHost = activity.is_host;
          const hasAutoNotify = activity.auto_notify_new_connections;
          
          console.log(`📝 Activity "${activity.name}":`, {
            start_date: activity.start_date,
            isFuture,
            isHost,
            hasAutoNotify,
            shouldInclude: isFuture && isHost && hasAutoNotify
          });
          
          return isFuture && isHost && hasAutoNotify;
        });

        console.log('✅ Filtered future activities with auto-notify:', futureActivities.length, futureActivities);

        if (futureActivities.length === 0) {
          console.log('⚠️ No qualifying activities found. Possible reasons:');
          console.log('   - No activities are in the future');
          console.log('   - No activities have auto_notify_new_connections: true');
          console.log('   - Current user is not the host of any activities');
          console.log('   - Activities exist but were filtered out');
        }

        // Send invitations for each future activity
        let invitationsSent = 0;
        for (const activity of futureActivities) {
          try {
            // Determine which child to invite based on the connection request
            const inviteChildUuid = targetChildUuid || requestorChildUuid;
            
            console.log(`📧 Sending invitation for activity "${activity.name}" to child ${inviteChildUuid}`);
            
            const inviteResponse = await apiService.sendActivityInvitation(
              activity.uuid || activity.activity_uuid || String(activity.id),
              newConnectionParentUuid,
              inviteChildUuid,
              `Welcome to our connection! ${activity.child_name} would like to invite your child to join: ${activity.name}`
            );
            
            console.log(`📧 Invitation response for "${activity.name}":`, inviteResponse);
            
            if (inviteResponse.success) {
              invitationsSent++;
            }
          } catch (inviteError) {
            console.error('❌ Failed to send activity invitation:', inviteError);
          }
        }

        console.log(`🎉 Total invitations sent: ${invitationsSent}`);
      }
    } catch (error) {
      console.error('❌ Failed to notify new connection about future activities:', error);
    }
  };


  const handleRejectRequest = async (requestUuid: string) => {
    if (window.confirm('Are you sure you want to reject this connection request?')) {
      try {
        const response = await apiService.respondToConnectionRequest(requestUuid, 'reject');
        if (response.success) {
          setConnectionRequests(prev => prev.filter(req => req.request_uuid !== requestUuid));
          alert('Connection request rejected');
        } else {
          alert(`Error: ${response.error || 'Failed to reject request'}`);
        }
      } catch (error) {
        alert('Failed to reject request');
        console.error('Reject request error:', error);
      }
    }
  };

  const handleConnectRequest = (parent: SearchResult) => {
    setSelectedParent(parent);
    setSelectedMyChild(null); // User must explicitly select their child
    // Start with no children selected - user must explicitly choose
    setSelectedTargetChildren([]);
    setConnectionMessage('');
    setShowConnectModal(true);
  };

  const handleRemoveConnection = async (connectionId: string, connectionDescription: string) => {
    if (window.confirm(`Are you sure you want to remove this connection? ${connectionDescription}`)) {
      try {
        console.log('🔄 Attempting to remove connection:', connectionId);
        const response = await apiService.deleteConnection(connectionId);
        console.log('📋 Delete connection response:', response);
        
        if (response.success) {
          setActiveConnections(prev => prev.filter(conn => conn.connection_uuid !== connectionId));
          alert('Connection removed successfully');
        } else {
          alert(`Error: ${response.error || 'Failed to remove connection'}\n\nAlternative: You can test auto-notifications by:\n1. Creating a new test account\n2. Or having the other user send you a new connection request`);
        }
      } catch (error) {
        console.error('❌ Remove connection error:', error);
        alert(`Failed to remove connection (API endpoint may not exist yet)\n\nTo test auto-notifications, you can:\n1. Create a new test user account\n2. Send a connection request from that new account\n3. Accept it to trigger auto-notifications\n\nOr ask me to help implement the delete endpoint on the backend.`);
      }
    }
  };

  const handleSendConnectionRequest = async () => {
    if (!selectedParent || !selectedMyChild) {
      alert('Please select your child');
      return;
    }

    console.log('🔍 Connection request debug:', {
      selectedParent,
      selectedMyChild,
      selectedTargetChildren,
      connectionMessage: connectionMessage.trim()
    });

    if (selectedTargetChildren.length === 0) {
      alert('Please select at least one target child');
      return;
    }

    // Find the child objects to get their UUIDs
    const myChildObj = myChildren.find(child => child.uuid === selectedMyChild);
    
    try {
      let successCount = 0;
      let errorCount = 0;
      
      // Send separate connection request for each selected target child
      for (const targetChildUuid of selectedTargetChildren) {
        const targetChildObj = selectedParent.children.find(child => child.uuid === targetChildUuid);
        
        const requestData = {
          target_parent_id: selectedParent.user_uuid || selectedParent.id,
          child_uuid: myChildObj?.uuid,
          target_child_uuid: targetChildObj?.uuid,
          message: connectionMessage.trim() || undefined,
        };

        console.log(`📤 Sending connection request ${successCount + 1} to ${targetChildObj?.name}:`, requestData);

        const response = await apiService.sendConnectionRequest(requestData);

        if (response.success) {
          successCount++;
        } else {
          errorCount++;
          console.error(`Failed to send request to ${targetChildObj?.name}:`, response.error);
        }
      }

      if (successCount > 0) {
        setShowConnectModal(false);
        setSearchResults([]);
        setSearchText('');
        // Reload both sent and received requests
        loadConnectionRequests();
        loadSentRequests();
        
        const message = successCount === 1 
          ? 'Connection request sent successfully'
          : `${successCount} connection requests sent successfully${errorCount > 0 ? ` (${errorCount} failed)` : ''}`;
        
        // Show popup if user came from activity creation flow
        if (cameFromActivity) {
          setShowReturnToActivityPopup(true);
        } else {
          alert(message);
        }
      } else {
        alert('Failed to send all connection requests. Please try again.');
      }
    } catch (error) {
      alert('Error sending connection requests');
      console.error('Send request error:', error);
    }
  };

  const handleCreateSkeletonAccount = async () => {
    if (!selectedMyChild || !skeletonChildName.trim()) {
      alert('Please select your child and enter the target child\'s name');
      return;
    }

    try {
      const myChildObj = myChildren.find(child => child.uuid === selectedMyChild);
      
      // Determine contact type (email or phone)
      const contactType = noResultsContact.includes('@') ? 'email' : 'phone';
      
      const requestData = {
        contact_method: noResultsContact,
        contact_type: contactType,
        my_child_uuid: selectedMyChild,
        target_child_name: skeletonChildName.trim(),
        target_child_birth_year: skeletonChildBirthYear ? parseInt(skeletonChildBirthYear) : null,
        message: connectionMessage.trim() || `${myChildObj?.name} would like to connect with ${skeletonChildName.trim()}`
      };

      console.log('📝 Creating skeleton account:', requestData);

      const response = await apiService.createSkeletonAccount(requestData);

      if (response.success) {
        alert(`Skeleton account created! When someone creates an account with ${noResultsContact}, they will receive your connection request.`);
        setShowSkeletonModal(false);
        // Reset form
        setNoResultsContact('');
        setSkeletonChildName('');
        setSkeletonChildBirthYear('');
        setConnectionMessage('');
        setSelectedMyChild(null);
        setSearchText('');
        setSearchResults([]);
      } else {
        alert(`Error: ${response.error || 'Failed to create skeleton account'}`);
      }
    } catch (error) {
      alert('Failed to create skeleton account');
      console.error('Create skeleton account error:', error);
    }
  };

  return (
    <div className="connections-screen">
      <div className="connections-header">
        <h2>Connections</h2>
      </div>

      {/* Search Section */}
      <div className="search-section">
        <h3>Connect with Parents</h3>
        <div className="search-form">
          <input
            type="text"
            placeholder="Enter email or phone number"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="search-input"
          />
          <button 
            onClick={handleSearchParent}
            disabled={searching}
            className={`search-btn ${searching ? 'disabled' : ''}`}
          >
            {searching ? 'Searching...' : 'Search'}
          </button>
        </div>
      </div>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="search-results">
          <h4>Search Results</h4>
          {searchResults.map((parent) => (
            <div key={parent.user_uuid || parent.id} className="parent-card">
              <div className="parent-info">
                <h5>{parent.username}</h5>
                <div className="parent-contact">{parent.email}</div>
                <div className="children-count">
                  {parent.children.length} child{parent.children.length !== 1 ? 'ren' : ''}
                </div>
              </div>
              <button
                onClick={() => handleConnectRequest(parent)}
                className="connect-btn"
              >
                Connect
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Connection Requests */}
      <div className="requests-section">
        <h3>Connection Requests ({connectionRequests.length})</h3>
        
        {loading ? (
          <div className="loading">Loading requests...</div>
        ) : connectionRequests.length === 0 ? (
          <div className="empty-state">
            <p>No connection requests</p>
          </div>
        ) : (
          <div className="requests-grouped">
            {Object.entries(
              connectionRequests.reduce((grouped: any, request) => {
                const targetChildName = request.target_child_name || 'Any Child';
                
                if (!grouped[targetChildName]) {
                  grouped[targetChildName] = [];
                }
                
                grouped[targetChildName].push(request);
                
                return grouped;
              }, {})
            ).map(([childName, requests]: any) => (
              <div key={childName} className="child-connections-group">
                <h4 className="child-group-header">{childName}</h4>
                <div className="child-connections-list">
                  {requests.map((request: any) => (
                    <div key={request.request_uuid} className="connection-item">
                      <span className="connected-to"><strong>{request.child_name}</strong> wants to connect</span>
                      <div className="request-actions">
                        <button
                          onClick={() => handleRejectRequest(request.request_uuid)}
                          className="reject-btn"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => handleAcceptRequest(request.request_uuid)}
                          className="accept-btn"
                        >
                          Accept
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sent Connection Requests */}
      <div className="requests-section">
        <h3>Sent Requests ({sentRequests.length})</h3>
        
        {sentRequests.length === 0 ? (
          <div className="empty-state">
            <p>No sent requests</p>
          </div>
        ) : (
          <div className="requests-grouped">
            {Object.entries(
              sentRequests.reduce((grouped: any, request) => {
                const childName = request.child_name || 'Unknown Child';
                
                if (!grouped[childName]) {
                  grouped[childName] = [];
                }
                
                grouped[childName].push(request);
                
                return grouped;
              }, {})
            ).map(([childName, requests]: any) => (
              <div key={childName} className="child-connections-group">
                <h4 className="child-group-header">{childName}</h4>
                <div className="child-connections-list">
                  {requests.map((request: any) => (
                    <div key={request.request_uuid} className="connection-item">
                      <span className="connected-to">
                        {request.target_child_name ? (
                          <strong>{request.target_child_name}</strong>
                        ) : (
                          <span>Request sent to <strong>{request.target_parent_name || request.target_family_name}</strong> (Any Child)</span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Active Connections Section */}
      <div className="connections-section">
        <h3>Active Connections ({activeConnections.length})</h3>
        
        {activeConnections.length === 0 ? (
          <div className="empty-state">
            <p>No active connections yet</p>
          </div>
        ) : (
          <div className="connections-grouped">
            {Object.entries(
              activeConnections.reduce((grouped: any, connection) => {
                // Get current user info to determine which child is ours
                const currentUser = JSON.parse(localStorage.getItem('userData') || '{}');
                const currentUsername = currentUser.username;
                
                // Determine which child belongs to the current user
                let myChild, theirChild;
                if (connection.child1_parent_name === currentUsername) {
                  myChild = { name: connection.child1_name, uuid: connection.child1_uuid };
                  theirChild = { name: connection.child2_name, uuid: connection.child2_uuid };
                } else {
                  myChild = { name: connection.child2_name, uuid: connection.child2_uuid };
                  theirChild = { name: connection.child1_name, uuid: connection.child1_uuid };
                }
                
                // Group by our child
                if (!grouped[myChild.uuid]) {
                  grouped[myChild.uuid] = {
                    childName: myChild.name,
                    connections: []
                  };
                }
                
                console.log('🔍 Processing connection for deletion:', { connectionId: connection.connection_uuid, connection });
                grouped[myChild.uuid].connections.push({
                  ...connection,
                  connectedToName: theirChild.name
                });
                
                return grouped;
              }, {})
            ).map(([childId, childGroup]: any) => (
              <div key={childId} className="child-connections-group">
                <h4 className="child-group-header">{childGroup.childName}</h4>
                <div className="child-connections-list">
                  {childGroup.connections.map((connection: any) => (
                    <div key={connection.connection_uuid} className="connection-item">
                      <span className="connected-to"><strong>{connection.connectedToName}</strong></span>
                      <button
                        onClick={() => {
                          console.log('🗑️ Delete button clicked:', { connectionId: connection.connection_uuid, connection });
                          handleRemoveConnection(
                            connection.connection_uuid,
                            `${childGroup.childName} ↔ ${connection.connectedToName}`
                          );
                        }}
                        className="remove-connection-btn"
                        title="Remove this connection"
                      >
                        🗑️
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Connection Request Modal */}
      {showConnectModal && selectedParent && (
        <div className="modal-overlay" onClick={() => setShowConnectModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Send Connection Request</h3>
            
            <div className="form-section">
              <label>Your Child:</label>
              <div className="child-selector">
                {myChildren.map((child) => (
                  <button
                    key={child.uuid}
                    className={`child-option ${selectedMyChild === child.uuid ? 'selected' : ''}`}
                    onClick={() => setSelectedMyChild(child.uuid)}
                  >
                    {child.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-section">
              <label>Their Child:</label>
              <div className="selection-help" style={{ 
                fontSize: '12px', 
                color: '#6c757d', 
                marginBottom: '8px',
                background: '#ffffcc',
                padding: '4px',
                borderRadius: '4px'
              }}>
                Click to select/deselect children. Multiple selections allowed.
              </div>
              <div className="child-selector">
                {selectedParent.children.length > 1 && (
                  <button
                    className={`child-option ${selectedTargetChildren.length === selectedParent.children.length ? 'selected' : ''}`}
                    onClick={() => {
                      if (selectedTargetChildren.length === selectedParent.children.length) {
                        // Deselect all if all are selected
                        setSelectedTargetChildren([]);
                      } else {
                        // Select all children
                        setSelectedTargetChildren(selectedParent.children.map(child => child.uuid));
                      }
                    }}
                    style={{
                      background: selectedTargetChildren.length === selectedParent.children.length 
                        ? 'linear-gradient(135deg, #667eea, #764ba2)' 
                        : '#e9ecef',
                      color: selectedTargetChildren.length === selectedParent.children.length 
                        ? 'white' 
                        : '#6c757d'
                    }}
                  >
                    All Children ({selectedParent.children.length})
                  </button>
                )}
                {selectedParent.children.map((child) => (
                  <button
                    key={child.uuid}
                    className={`child-option ${selectedTargetChildren.includes(child.uuid) ? 'selected' : ''}`}
                    onClick={() => {
                      // Multi-select mode (mobile-friendly)
                      if (selectedTargetChildren.includes(child.uuid)) {
                        // Remove this child from selection
                        setSelectedTargetChildren(selectedTargetChildren.filter(uuid => uuid !== child.uuid));
                      } else {
                        // Add this child to selection
                        setSelectedTargetChildren([...selectedTargetChildren, child.uuid]);
                      }
                    }}
                    style={{
                      background: selectedTargetChildren.includes(child.uuid)
                        ? 'linear-gradient(135deg, #667eea, #764ba2)'
                        : '#e9ecef',
                      color: selectedTargetChildren.includes(child.uuid)
                        ? 'white'
                        : '#6c757d'
                    }}
                  >
                    {child.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-section">
              <label>Message (Optional):</label>
              <textarea
                placeholder="Hi! Would love to connect our kids..."
                value={connectionMessage}
                onChange={(e) => setConnectionMessage(e.target.value)}
                className="message-input"
              />
            </div>

            <div className="modal-actions">
              <button
                onClick={() => setShowConnectModal(false)}
                className="cancel-btn"
              >
                Cancel
              </button>
              <button
                onClick={handleSendConnectionRequest}
                className="send-btn"
              >
                Send Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Return to Activity Popup */}
      {showReturnToActivityPopup && (
        <div className="modal-overlay" style={{
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="modal-content" style={{
            backgroundColor: 'white',
            padding: '24px',
            borderRadius: '12px',
            maxWidth: '400px',
            width: '90%',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)',
            textAlign: 'center'
          }}>
            <h3>Connection Request Sent! 🎉</h3>
            <p>Your connection request has been sent successfully.</p>
            <p>Would you like to continue adding more connections or return to finish creating your activity?</p>
            
            <div className="modal-actions">
              <button
                onClick={() => setShowReturnToActivityPopup(false)}
                className="cancel-btn"
                style={{
                  background: 'linear-gradient(135deg, #48bb78, #68d391)',
                  color: 'white',
                  border: 'none'
                }}
              >
                Continue Adding Connections
              </button>
              <button
                onClick={() => {
                  setShowReturnToActivityPopup(false);
                  if (returnToActivityUrl) {
                    console.log('🔄 Direct navigation to:', returnToActivityUrl);
                    // Force the Dashboard to update its active tab first
                    if (onForceTabUpdate) {
                      console.log('🎯 Forcing Dashboard tab update to children');
                      onForceTabUpdate('children');
                    }
                    // Then navigate
                    navigate(returnToActivityUrl, { replace: false });
                  } else if (onReturnToActivity) {
                    onReturnToActivity();
                  }
                }}
                className="send-btn"
                style={{
                  background: 'linear-gradient(135deg, #667eea, #764ba2)',
                  color: 'white',
                  border: 'none'
                }}
              >
                Return to Activity
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Skeleton Account Creation Modal */}
      {showSkeletonModal && (
        <div className="modal-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '24px',
            borderRadius: '12px',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)'
          }}>
            <h3>No Account Found</h3>
            <p>No parent found with <strong>{noResultsContact}</strong>.</p>
            <p>Would you like to create a connection request for when they sign up?</p>
            
            <div className="form-section">
              <label>Select Your Child:</label>
              <select
                value={selectedMyChild || ''}
                onChange={(e) => setSelectedMyChild(e.target.value)}
                className="child-select"
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '8px',
                  border: '2px solid #e9ecef',
                  fontSize: '16px'
                }}
              >
                <option value="">Choose your child...</option>
                {myChildren.map((child) => (
                  <option key={child.uuid} value={child.uuid}>
                    {child.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-section">
              <label>Target Child's Name:</label>
              <input
                type="text"
                placeholder="Enter the child's first and last name"
                value={skeletonChildName}
                onChange={(e) => setSkeletonChildName(e.target.value)}
                className="name-input"
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '8px',
                  border: '2px solid #e9ecef',
                  fontSize: '16px'
                }}
              />
            </div>

            <div className="form-section">
              <label>Target Child's Birth Year (Optional):</label>
              <input
                type="number"
                placeholder="e.g., 2015"
                value={skeletonChildBirthYear}
                onChange={(e) => setSkeletonChildBirthYear(e.target.value)}
                className="year-input"
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '8px',
                  border: '2px solid #e9ecef',
                  fontSize: '16px'
                }}
                min="2000"
                max="2025"
              />
            </div>

            <div className="form-section">
              <label>Message (Optional):</label>
              <textarea
                placeholder="Hi! Would love to connect our kids..."
                value={connectionMessage}
                onChange={(e) => setConnectionMessage(e.target.value)}
                className="message-input"
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '8px',
                  border: '2px solid #e9ecef',
                  fontSize: '16px',
                  minHeight: '80px',
                  resize: 'vertical'
                }}
              />
            </div>

            <div className="modal-actions" style={{ marginTop: '20px' }}>
              <button
                onClick={() => {
                  setShowSkeletonModal(false);
                  setNoResultsContact('');
                  setSkeletonChildName('');
                  setSkeletonChildBirthYear('');
                  setConnectionMessage('');
                  setSelectedMyChild(null);
                }}
                className="cancel-btn"
                style={{
                  padding: '12px 20px',
                  marginRight: '10px',
                  borderRadius: '8px',
                  border: '2px solid #dc3545',
                  backgroundColor: 'white',
                  color: '#dc3545',
                  fontSize: '16px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSkeletonAccount}
                className="send-btn"
                style={{
                  padding: '12px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #667eea, #764ba2)',
                  color: 'white',
                  fontSize: '16px',
                  cursor: 'pointer'
                }}
                disabled={!selectedMyChild || !skeletonChildName.trim()}
              >
                Create Connection Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConnectionsScreen;