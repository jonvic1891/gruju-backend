import React, { useState, useEffect } from 'react';
import ApiService from '../services/api';
import { ConnectionRequest, Child, SearchResult } from '../types';
import './ConnectionsScreen.css';

const ConnectionsScreen = () => {
  const [connectionRequests, setConnectionRequests] = useState<ConnectionRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<ConnectionRequest[]>([]);
  const [activeConnections, setActiveConnections] = useState<any[]>([]);
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [selectedParent, setSelectedParent] = useState<SearchResult | null>(null);
  const [myChildren, setMyChildren] = useState<Child[]>([]);
  const [selectedMyChild, setSelectedMyChild] = useState<number | null>(null);
  const [selectedTargetChild, setSelectedTargetChild] = useState<number | null>(null);
  const [connectionMessage, setConnectionMessage] = useState('');
  const apiService = ApiService.getInstance();

  useEffect(() => {
    loadConnectionRequests();
    loadSentRequests();
    loadActiveConnections();
    loadMyChildren();
  }, []);

  const loadConnectionRequests = async () => {
    try {
      setLoading(true);
      const response = await apiService.getConnectionRequests();
      if (response.success && response.data) {
        setConnectionRequests(response.data);
      } else {
        alert(`Error: ${response.error || 'Failed to load connection requests'}`);
      }
    } catch (error) {
      alert('Failed to load connection requests');
      console.error('Load connection requests error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSentRequests = async () => {
    try {
      const response = await apiService.getSentConnectionRequests();
      if (response.success && response.data) {
        setSentRequests(response.data);
      } else {
        console.error('Failed to load sent requests:', response.error);
      }
    } catch (error) {
      console.error('Load sent requests error:', error);
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
          alert('No parents found with that email or phone number');
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

  const handleAcceptRequest = async (requestId: number) => {
    if (window.confirm('Are you sure you want to accept this connection request?')) {
      try {
        const response = await apiService.respondToConnectionRequest(requestId, 'accept');
        if (response.success) {
          // Find the connection request details before removing it from state
          const acceptedRequest = connectionRequests.find(req => req.id === requestId);
          
          setConnectionRequests(prev => prev.filter(req => req.id !== requestId));
          // Reload active connections to show the new connection immediately
          loadActiveConnections();
          
          // Notify new connection about future activities (filtered by per-activity setting)
          if (acceptedRequest) {
            await notifyNewConnectionAboutFutureActivities(
              acceptedRequest.requester_id, 
              acceptedRequest.child_id,
              acceptedRequest.target_child_id
            );
          }
          
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
    newConnectionParentId: number, 
    requestorChildId: number,
    targetChildId?: number
  ) => {
    try {
      console.log('🔔 Starting auto-notification process for new connection:', {
        newConnectionParentId,
        requestorChildId,
        targetChildId
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

        // Send invitations for each future activity
        let invitationsSent = 0;
        for (const activity of futureActivities) {
          try {
            // Determine which child to invite based on the connection request
            const inviteChildId = targetChildId || requestorChildId;
            
            console.log(`📧 Sending invitation for activity "${activity.name}" to child ${inviteChildId}`);
            
            const inviteResponse = await apiService.sendActivityInvitation(
              activity.id,
              newConnectionParentId,
              inviteChildId,
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

  const handleRejectRequest = async (requestId: number) => {
    if (window.confirm('Are you sure you want to reject this connection request?')) {
      try {
        const response = await apiService.respondToConnectionRequest(requestId, 'reject');
        if (response.success) {
          setConnectionRequests(prev => prev.filter(req => req.id !== requestId));
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
    setSelectedMyChild(myChildren.length > 0 ? myChildren[0].id : null);
    setSelectedTargetChild(parent.children.length > 0 ? parent.children[0].id : null);
    setConnectionMessage('');
    setShowConnectModal(true);
  };

  const handleRemoveConnection = async (connectionId: number, connectionDescription: string) => {
    if (window.confirm(`Are you sure you want to remove this connection? ${connectionDescription}\n\nNote: If this fails, you can also test auto-notifications by creating a new test user account.`)) {
      try {
        console.log('🔄 Attempting to remove connection:', connectionId);
        const response = await apiService.deleteConnection(connectionId);
        console.log('📋 Delete connection response:', response);
        
        if (response.success) {
          setActiveConnections(prev => prev.filter(conn => conn.id !== connectionId));
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

    try {
      const response = await apiService.sendConnectionRequest({
        target_parent_id: selectedParent.id,
        child_id: selectedMyChild,
        target_child_id: selectedTargetChild || undefined,
        message: connectionMessage.trim() || undefined,
      });

      if (response.success) {
        alert('Connection request sent successfully');
        setShowConnectModal(false);
        setSearchResults([]);
        setSearchText('');
        // Refresh sent requests to show the new request immediately
        loadSentRequests();
      } else {
        alert(`Error: ${response.error || 'Failed to send connection request'}`);
      }
    } catch (error) {
      alert('Failed to send connection request');
      console.error('Send request error:', error);
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
            <div key={parent.id} className="parent-card">
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
        <h3>Pending Requests ({connectionRequests.length})</h3>
        
        {loading ? (
          <div className="loading">Loading requests...</div>
        ) : connectionRequests.length === 0 ? (
          <div className="empty-state">
            <p>No pending connection requests</p>
          </div>
        ) : (
          <div className="requests-list">
            {connectionRequests.map((request) => (
              <div key={request.id} className="request-card">
                <div className="request-header">
                  <span className="request-date">
                    {new Date(request.created_at).toLocaleDateString()}
                  </span>
                </div>
                
                <div className="request-message">
                  <p>
                    <strong>{request.child_name}</strong> wants to connect with{' '}
                    <strong>{request.target_child_name || 'your child'}</strong> to share activities
                  </p>
                </div>
                
                <div className="request-actions">
                  <button
                    onClick={() => handleRejectRequest(request.id)}
                    className="reject-btn"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => handleAcceptRequest(request.id)}
                    className="accept-btn"
                  >
                    Accept
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sent Requests Section */}
      <div className="sent-requests-section">
        <h3>Sent Requests ({sentRequests.length})</h3>
        
        {sentRequests.length === 0 ? (
          <div className="empty-state">
            <p>No pending sent requests</p>
          </div>
        ) : (
          <div className="requests-list">
            {sentRequests.map((request) => (
              <div key={request.id} className="request-card sent-request">
                <div className="request-header">
                  <span className="request-date">
                    {new Date(request.created_at).toLocaleDateString()}
                  </span>
                </div>
                
                <div className="request-message">
                  <p>
                    <strong>{request.child_name}</strong> wants to connect with{' '}
                    <strong>{request.target_child_name || 'their child'}</strong> to share activities
                  </p>
                </div>
                
                <div className="request-status">
                  <span className="status-badge pending">Pending</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Active Connections Section */}
      <div className="sent-requests-section">
        <h3>Active Connections ({activeConnections.length})</h3>
        
        {activeConnections.length === 0 ? (
          <div className="empty-state">
            <p>No active connections yet</p>
          </div>
        ) : (
          <div className="requests-list">
            {activeConnections.map((connection) => (
              <div key={connection.id} className="request-card">
                <div className="request-header">
                  <span className="request-date">
                    {new Date(connection.created_at).toLocaleDateString()}
                  </span>
                </div>
                
                <div className="request-message">
                  <p>
                    <strong>{connection.child1_name}</strong> is connected with{' '}
                    <strong>{connection.child2_name}</strong>
                  </p>
                </div>
                
                <div className="request-status">
                  <span className="status-badge" style={{backgroundColor: '#28a745', color: 'white', border: '1px solid #1e7e34'}}>Active</span>
                  <button
                    onClick={() => handleRemoveConnection(
                      connection.id,
                      `${connection.child1_name} ↔ ${connection.child2_name}`
                    )}
                    className="remove-connection-btn"
                    title="Remove this connection"
                  >
                    🗑️ Remove
                  </button>
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
                    key={child.id}
                    className={`child-option ${selectedMyChild === child.id ? 'selected' : ''}`}
                    onClick={() => setSelectedMyChild(child.id)}
                  >
                    {child.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-section">
              <label>Their Child (Optional):</label>
              <div className="child-selector">
                <button
                  className={`child-option ${selectedTargetChild === null ? 'selected' : ''}`}
                  onClick={() => setSelectedTargetChild(null)}
                >
                  Any Child
                </button>
                {selectedParent.children.map((child) => (
                  <button
                    key={child.id}
                    className={`child-option ${selectedTargetChild === child.id ? 'selected' : ''}`}
                    onClick={() => setSelectedTargetChild(child.id)}
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
    </div>
  );
};

export default ConnectionsScreen;