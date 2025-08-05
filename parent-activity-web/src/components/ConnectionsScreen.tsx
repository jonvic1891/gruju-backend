import React, { useState, useEffect } from 'react';
import ApiService from '../services/api';
import { ConnectionRequest, Child, SearchResult } from '../types';
import './ConnectionsScreen.css';

const ConnectionsScreen = () => {
  const [connectionRequests, setConnectionRequests] = useState<ConnectionRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<ConnectionRequest[]>([]);
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
          setConnectionRequests(prev => prev.filter(req => req.id !== requestId));
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