import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginScreen from './components/LoginScreen';
import Dashboard from './components/Dashboard';
import './App.css';
import versionInfo from './version.json';

const AppContent = () => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Enhanced debug logging
  console.log('AppContent rendering:', { 
    isAuthenticated, 
    isLoading, 
    user,
    timestamp: new Date().toISOString()
  });

  // Version checking DISABLED to prevent loops
  React.useEffect(() => {
    const currentVersion = versionInfo.version;
    console.log(`📱 App version: ${currentVersion} - version checking disabled`);
    
    // Just set the version without any reloading
    localStorage.setItem('appVersion', currentVersion);
  }, []);

  React.useEffect(() => {
    console.log('AppContent mounted/updated - Auth state changed:', {
      isAuthenticated,
      isLoading,
      user,
      localStorageToken: localStorage.getItem('authToken') ? 'present' : 'missing',
      localStorageUserData: localStorage.getItem('userData') ? 'present' : 'missing'
    });
  }, [isAuthenticated, isLoading, user]);


  if (isLoading) {
    console.log('Showing loading screen');
    return (
      <div className="app-loading">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (isAuthenticated) {
    console.log('User authenticated, rendering Dashboard with routing');
    try {
      return (
        <Routes>
          <Route path="/children" element={<Dashboard initialTab="children" />} />
          <Route path="/children/:childUuid/activities" element={<Dashboard initialTab="children" />} />
          <Route path="/children/:childUuid/activities/:activityUuid" element={<Dashboard initialTab="children" />} />
          <Route path="/calendar" element={<Dashboard initialTab="calendar" />} />
          <Route path="/clubs" element={<Dashboard initialTab="clubs" />} />
          <Route path="/connections" element={<Dashboard initialTab="connections" />} />
          <Route path="/profile" element={<Dashboard initialTab="profile" />} />
          <Route path="/admin" element={<Dashboard initialTab="admin" />} />
          <Route path="/" element={<Navigate to="/children" replace />} />
        </Routes>
      );
    } catch (error) {
      console.error('Error rendering authenticated content:', error);
      return (
        <div style={{ padding: '20px', textAlign: 'center', color: 'red' }}>
          <h1>❌ Error Loading Dashboard</h1>
          <p>Error: {String(error)}</p>
          <button onClick={() => window.location.reload()}>Reload Page</button>
        </div>
      );
    }
  }

  console.log('User not authenticated, showing login screen');
  return <LoginScreen />;
};

function App() {
  console.log('App component rendering');
  
  return (
    <div className="App" data-deployment-pipeline="configured">
      <AuthProvider>
        <Router>
          <AppContent />
        </Router>
      </AuthProvider>
    </div>
  );
}

export default App;