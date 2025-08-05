import React from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginScreen from './components/LoginScreen';
import Dashboard from './components/Dashboard';
import './App.css';

const AppContent = () => {
  const { isAuthenticated, isLoading, user } = useAuth();

  // Enhanced debug logging
  console.log('AppContent rendering:', { 
    isAuthenticated, 
    isLoading, 
    user,
    timestamp: new Date().toISOString()
  });

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
        <p>Loading Parent Activity App...</p>
      </div>
    );
  }

  if (isAuthenticated) {
    console.log('User authenticated, rendering Dashboard');
    try {
      return <Dashboard />;
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
  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1>🚀 Parent Activity App</h1>
      <p>React app is running! Please log in to continue.</p>
      <LoginScreen />
    </div>
  );
};

function App() {
  console.log('App component rendering');
  
  return (
    <div className="App">
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </div>
  );
}

export default App;