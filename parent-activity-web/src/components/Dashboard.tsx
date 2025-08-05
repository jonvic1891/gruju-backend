import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import ChildrenScreen from './ChildrenScreen';
import CalendarScreen from './CalendarScreen';
import ConnectionsScreen from './ConnectionsScreen';
import ProfileScreen from './ProfileScreen';
import AdminScreen from './AdminScreen';
import NotificationBell from './NotificationBell';
import './Dashboard.css';

type Tab = 'children' | 'calendar' | 'connections' | 'profile' | 'admin';

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState<Tab>('children');
  const { user, logout } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';


  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      logout();
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'children':
        return <ChildrenScreen />;
      case 'calendar':
        return <CalendarScreen />;
      case 'connections':
        return <ConnectionsScreen />;
      case 'profile':
        return <ProfileScreen />;
      case 'admin':
        return isAdmin ? <AdminScreen /> : <div>Access Denied</div>;
      default:
        return <ChildrenScreen />;
    }
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-content">
          <h1>Parent Activity App</h1>
          <div className="header-user">
            <NotificationBell />
            <span>Welcome, {user?.username}!</span>
            <button onClick={handleLogout} className="logout-btn">
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="dashboard-body">
        <nav className="dashboard-nav">
          <button
            className={`nav-item ${activeTab === 'children' ? 'active' : ''}`}
            onClick={() => setActiveTab('children')}
          >
            <span className="nav-icon">👶</span>
            <span className="nav-label">My Children</span>
          </button>
          
          <button
            className={`nav-item ${activeTab === 'calendar' ? 'active' : ''}`}
            onClick={() => setActiveTab('calendar')}
          >
            <span className="nav-icon">📅</span>
            <span className="nav-label">Calendar</span>
          </button>
          
          <button
            className={`nav-item ${activeTab === 'connections' ? 'active' : ''}`}
            onClick={() => setActiveTab('connections')}
          >
            <span className="nav-icon">🤝</span>
            <span className="nav-label">Connections</span>
          </button>
          
          <button
            className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <span className="nav-icon">👤</span>
            <span className="nav-label">Profile</span>
          </button>
          
          {isAdmin && (
            <button
              className={`nav-item ${activeTab === 'admin' ? 'active' : ''}`}
              onClick={() => setActiveTab('admin')}
            >
              <span className="nav-icon">⚙️</span>
              <span className="nav-label">Admin</span>
              <span className="admin-badge">
                {user?.role === 'super_admin' ? 'SA' : 'A'}
              </span>
            </button>
          )}
        </nav>

        <main className="dashboard-content">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default Dashboard;