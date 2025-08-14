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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedChildId, setSelectedChildId] = useState<number | null>(null);
  const [cameFromActivity, setCameFromActivity] = useState(false);
  const [shouldRestoreActivityCreation, setShouldRestoreActivityCreation] = useState(false);
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';



  const handleMobileNavClick = (tab: Tab) => {
    if (tab === 'connections') {
      handleNavigateToConnections();
    } else {
      setActiveTab(tab);
    }
    setMobileMenuOpen(false);
  };

  const handleChildSelection = (child: any) => {
    // Set the selected child ID and ensure we're on the children tab
    setSelectedChildId(child.id);
    setActiveTab('children');
  };

  const handleNavigateToConnectionsFromActivity = (isInActivityCreation: boolean = false) => {
    setCameFromActivity(true);
    setShouldRestoreActivityCreation(isInActivityCreation);
    setActiveTab('connections');
  };

  const handleNavigateToConnections = () => {
    setCameFromActivity(false);
    setActiveTab('connections');
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'children':
        return <ChildrenScreen 
          onNavigateToCalendar={() => setActiveTab('calendar')} 
          onNavigateToChildCalendar={(child) => {
            handleChildSelection(child);
          }}
          initialSelectedChildId={selectedChildId}
          onChildSelectionChange={setSelectedChildId}
          onNavigateToConnections={handleNavigateToConnectionsFromActivity}
          shouldRestoreActivityCreation={shouldRestoreActivityCreation}
        />;
      case 'calendar':
        return <CalendarScreen />;
      case 'connections':
        return <ConnectionsScreen 
          cameFromActivity={cameFromActivity}
          onReturnToActivity={() => {
            setCameFromActivity(false);
            setActiveTab('children');
            // Reset the restore flag after using it
            setTimeout(() => {
              setShouldRestoreActivityCreation(false);
            }, 200);
          }}
        />;
      case 'profile':
        return <ProfileScreen />;
      case 'admin':
        return isAdmin ? <AdminScreen /> : <div>Access Denied</div>;
      default:
        return <ChildrenScreen 
          onNavigateToCalendar={() => setActiveTab('calendar')} 
          onNavigateToConnections={() => setActiveTab('connections')}
        />;
    }
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-content">
          <div className="header-left">
            <button 
              className="mobile-menu-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <span className="burger-line"></span>
              <span className="burger-line"></span>
              <span className="burger-line"></span>
            </button>
            <h1>Parent Activity App</h1>
          </div>
          <div className="header-user">
            <NotificationBell />
            <span className="welcome-text">Welcome, {user?.username}!</span>
          </div>
        </div>
      </header>

      <div className="dashboard-body">
        {/* Desktop Navigation */}
        <nav className="dashboard-nav desktop-nav">
          <button
            className={`nav-item ${activeTab === 'children' ? 'active' : ''}`}
            onClick={() => setActiveTab('children')}
          >
            <span className="nav-label">My Children</span>
          </button>
          
          <button
            className={`nav-item ${activeTab === 'calendar' ? 'active' : ''}`}
            onClick={() => setActiveTab('calendar')}
          >
            <span className="nav-label">Calendar</span>
          </button>
          
          <button
            className={`nav-item ${activeTab === 'connections' ? 'active' : ''}`}
            onClick={handleNavigateToConnections}
          >
            <span className="nav-label">Connections</span>
          </button>
          
          <button
            className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <span className="nav-label">Profile</span>
          </button>
          
          {isAdmin && (
            <button
              className={`nav-item ${activeTab === 'admin' ? 'active' : ''}`}
              onClick={() => setActiveTab('admin')}
            >
              <span className="nav-label">Admin</span>
              <span className="admin-badge">
                {user?.role === 'super_admin' ? 'SA' : 'A'}
              </span>
            </button>
          )}
        </nav>

        {/* Mobile Navigation Overlay */}
        {mobileMenuOpen && (
          <>
            <div className="mobile-menu-overlay" onClick={() => setMobileMenuOpen(false)}></div>
            <nav className="mobile-nav">
              <button
                className={`nav-item ${activeTab === 'children' ? 'active' : ''}`}
                onClick={() => handleMobileNavClick('children')}
              >
                <span className="nav-label">My Children</span>
              </button>
              
              <button
                className={`nav-item ${activeTab === 'calendar' ? 'active' : ''}`}
                onClick={() => handleMobileNavClick('calendar')}
              >
                <span className="nav-label">Calendar</span>
              </button>
              
              <button
                className={`nav-item ${activeTab === 'connections' ? 'active' : ''}`}
                onClick={() => handleMobileNavClick('connections')}
              >
                <span className="nav-label">Connections</span>
              </button>
              
              <button
                className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`}
                onClick={() => handleMobileNavClick('profile')}
              >
                <span className="nav-label">Profile</span>
              </button>
              
              {isAdmin && (
                <button
                  className={`nav-item ${activeTab === 'admin' ? 'active' : ''}`}
                  onClick={() => handleMobileNavClick('admin')}
                >
                  <span className="nav-label">Admin</span>
                  <span className="admin-badge">
                    {user?.role === 'super_admin' ? 'SA' : 'A'}
                  </span>
                </button>
              )}
            </nav>
          </>
        )}

        <main className="dashboard-content">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default Dashboard;