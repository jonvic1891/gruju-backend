import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import ApiService from '../services/api';
import './ProfileScreen.css';

const ProfileScreen = () => {
  const { user, logout, refreshUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [username, setUsername] = useState(user?.username || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [loading, setLoading] = useState(false);
  const apiService = ApiService.getInstance();


  const handleSaveProfile = async () => {
    if (!username.trim() || !email.trim() || !phone.trim()) {
      alert('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const response = await apiService.updateProfile({
        username: username.trim(),
        email: email.trim(),
        phone: phone.trim()
      });

      if (response.success && response.data) {
        // Refresh user data in context
        await refreshUser();
        setEditing(false);
        alert('Profile updated successfully');
      } else {
        alert(`Failed to update profile: ${response.error || 'Unknown error'}`);
      }
    } catch (error) {
      alert('Failed to update profile');
      console.error('Update profile error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    if (user) {
      setUsername(user.username);
      setEmail(user.email);
      setPhone(user.phone);
    }
    setEditing(false);
  };

  const handleChangePassword = () => {
    alert('Change Password feature will be implemented next');
  };

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      logout();
    }
  };

  if (!user) {
    return (
      <div className="profile-screen">
        <div className="loading">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="profile-screen">
      <div className="profile-header">
        <h2>Profile</h2>
      </div>

      <div className="profile-card">
        {editing ? (
          <div className="edit-form">
            <h3>Edit Profile</h3>
            
            <div className="form-group">
              <label>Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>Phone</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="form-input"
              />
            </div>

            <div className="form-actions">
              <button
                onClick={handleCancelEdit}
                className="cancel-btn"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveProfile}
                disabled={loading}
                className={`save-btn ${loading ? 'disabled' : ''}`}
              >
                {loading ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        ) : (
          <div className="profile-info">
            <div className="profile-avatar">
              <div className="avatar-circle">
                {user.username.charAt(0).toUpperCase()}
              </div>
              <div className="profile-details">
                <h3>{user.username}</h3>
                <p>Member since {new Date(user.created_at).toLocaleDateString()}</p>
              </div>
            </div>

            <div className="info-sections">
              <div className="info-section">
                <label>Username</label>
                <div className="info-value">{user.username}</div>
              </div>

              <div className="info-section">
                <label>Email</label>
                <div className="info-value">{user.email}</div>
              </div>

              <div className="info-section">
                <label>Phone</label>
                <div className="info-value">{user.phone}</div>
              </div>

              <div className="info-section">
                <label>Role</label>
                <div className="info-value">
                  <span className={`role-badge ${user.role}`}>
                    {user.role === 'super_admin' ? 'Super Admin' : 
                     user.role === 'admin' ? 'Admin' : 'User'}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setEditing(true)}
              className="edit-btn"
            >
              Edit Profile
            </button>
          </div>
        )}
      </div>

      <div className="actions-section">
        <button
          onClick={handleChangePassword}
          className="action-item"
        >
          <span>Change Password</span>
          <span className="arrow">→</span>
        </button>

        <button
          onClick={handleLogout}
          className="action-item logout-action"
        >
          <span>Logout</span>
          <span className="arrow">→</span>
        </button>
      </div>

      <div className="app-info">
        <p>Parent Activity App v1.0.0</p>
      </div>
    </div>
  );
};

export default ProfileScreen;