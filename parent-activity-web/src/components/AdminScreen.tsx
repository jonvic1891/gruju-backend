import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import './AdminScreen.css';

const AdminScreen = () => {
  const { user } = useAuth();

  if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
    return (
      <div className="admin-screen">
        <div className="access-denied">
          <h3>Access Denied</h3>
          <p>You don't have permission to access this area.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-screen">
      <div className="admin-header">
        <h2>
          Admin Dashboard
          <span className={`admin-badge ${user.role}`}>
            {user.role === 'super_admin' ? 'Super Admin' : 'Admin'}
          </span>
        </h2>
      </div>

      <div className="admin-grid">
        <div className="admin-card">
          <div className="card-icon">👥</div>
          <h3>User Management</h3>
          <p>Manage users, roles, and permissions</p>
          <button 
            className="card-button"
            onClick={() => alert('User Management feature coming soon!')}
          >
            Manage Users
          </button>
        </div>

        <div className="admin-card">
          <div className="card-icon">📊</div>
          <h3>Analytics</h3>
          <p>View platform usage statistics and reports</p>
          <button 
            className="card-button"
            onClick={() => alert('Analytics feature coming soon!')}
          >
            View Analytics
          </button>
        </div>

        <div className="admin-card">
          <div className="card-icon">📱</div>
          <h3>SMS Configuration</h3>
          <p>Configure SMS settings and templates</p>
          <button 
            className="card-button"
            onClick={() => alert('SMS Configuration feature coming soon!')}
          >
            Configure SMS
          </button>
        </div>

        <div className="admin-card">
          <div className="card-icon">📋</div>
          <h3>System Logs</h3>
          <p>Monitor system activity and troubleshoot issues</p>
          <button 
            className="card-button"
            onClick={() => alert('System Logs feature coming soon!')}
          >
            View Logs
          </button>
        </div>

        {user.role === 'super_admin' && (
          <>
            <div className="admin-card">
              <div className="card-icon">⚙️</div>
              <h3>System Settings</h3>
              <p>Configure global system settings</p>
              <button 
                className="card-button"
                onClick={() => alert('System Settings feature coming soon!')}
              >
                Settings
              </button>
            </div>

            <div className="admin-card">
              <div className="card-icon">🔒</div>
              <h3>Security</h3>
              <p>Manage security settings and access controls</p>
              <button 
                className="card-button"
                onClick={() => alert('Security feature coming soon!')}
              >
                Security
              </button>
            </div>
          </>
        )}
      </div>

      <div className="admin-stats">
        <h3>Quick Stats</h3>
        <div className="stats-grid">
          <div className="stat-item">
            <div className="stat-number">-</div>
            <div className="stat-label">Total Users</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">-</div>
            <div className="stat-label">Active Sessions</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">-</div>
            <div className="stat-label">Total Activities</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">-</div>
            <div className="stat-label">Connections Made</div>
          </div>
        </div>
        <p className="stats-note">
          * Live statistics will be available in the full admin implementation
        </p>
      </div>
    </div>
  );
};

export default AdminScreen;