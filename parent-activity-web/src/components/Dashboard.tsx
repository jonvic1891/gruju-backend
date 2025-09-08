import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import ApiService from '../services/api';
import ChildrenScreen from './ChildrenScreen';
import CalendarScreen from './CalendarScreen';
import ClubsScreen from './ClubsScreen';
import ConnectionsScreen from './ConnectionsScreen';
import ProfileScreen from './ProfileScreen';
import AdminScreen from './AdminScreen';
import NotificationBell from './NotificationBell';
import OnboardingFlow from './OnboardingFlow';
import './Dashboard.css';

type Tab = 'children' | 'calendar' | 'clubs' | 'connections' | 'profile' | 'admin';

interface DashboardProps {
  initialTab?: Tab;
}

const Dashboard: React.FC<DashboardProps> = ({ initialTab = 'children' }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  
  console.log('🔥 Dashboard RENDER called with activeTab:', activeTab, 'pathname:', location.pathname);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [cameFromActivity, setCameFromActivity] = useState(false);
  const [shouldRestoreActivityCreation, setShouldRestoreActivityCreation] = useState(false);
  const [activityCreationChildUuid, setActivityCreationChildUuid] = useState<string | null>(null);
  const [activityCreationActivityUuid, setActivityCreationActivityUuid] = useState<string | null>(null);
  // Removed navigationKey - no longer needed since we removed popstate handler
  const [calendarInitialDate, setCalendarInitialDate] = useState<string | undefined>(undefined);
  const [calendarInitialViewMode, setCalendarInitialViewMode] = useState<'month' | 'week'>('month');
  const [children, setChildren] = useState<any[]>([]);
  const [childrenRefreshTrigger, setChildrenRefreshTrigger] = useState<number>(0);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const apiService = ApiService.getInstance();

  // Check if user should see onboarding (new user with no children and no server-side onboarding_completed flag)
  const checkForNewUserOnboarding = async (childrenData: any[]) => {
    try {
      // Get user profile to check onboarding status
      const profileResponse = await apiService.getProfile();
      const onboardingCompleted = profileResponse.data?.onboarding_completed || false;
      
      const userEmail = user?.email;
      const isNewUser = childrenData.length === 0 && !onboardingCompleted;
      const forceOnboarding = localStorage.getItem('force_onboarding') === 'true';
      const isMobile = /Mobi|Android/i.test(navigator.userAgent);
      
      console.log('🎯 Onboarding check (server-side):', {
        userEmail,
        childrenCount: childrenData.length, 
        onboardingCompleted, 
        isNewUser,
        forceOnboarding,
        willTrigger: isNewUser || forceOnboarding
      });
      
      if (isNewUser || forceOnboarding) {
        console.log('🎯 TRIGGERING onboarding flow:', { isNewUser, forceOnboarding });
        console.log('🎯 Setting showOnboarding to TRUE');
        setShowOnboarding(true);
        
        // Clear force flag after using it
        if (forceOnboarding) {
          localStorage.removeItem('force_onboarding');
        }
      } else {
        console.log('🎯 NOT showing onboarding:', { 
          childrenCount: childrenData.length, 
          onboardingCompleted, 
          forceOnboarding 
        });
      }
    } catch (error) {
      console.error('Failed to check onboarding status:', error);
      // Fallback to not showing onboarding on error
    }
  };

  const handleOnboardingComplete = async () => {
    try {
      // Get current profile data first
      const currentProfile = await apiService.getProfile();
      const { username, email, phone } = currentProfile.data;
      
      // Update profile with onboarding_completed = true
      await apiService.updateProfile({
        username,
        email,
        phone,
        onboarding_completed: true
      });
      
      console.log('✅ Onboarding marked as completed on server');
      setShowOnboarding(false);
    } catch (error) {
      console.error('Failed to mark onboarding as completed:', error);
      // Still hide the modal even if server update fails
      setShowOnboarding(false);
    }
  };

  const handleNavigateToProfile = () => {
    setShowOnboarding(false);
    setActiveTab('profile');
    
    // Trigger the add parent modal after a short delay
    setTimeout(() => {
      const addParentButton = document.querySelector('.add-btn') as HTMLButtonElement;
      if (addParentButton) {
        addParentButton.click();
      }
    }, 500);
  };

  // Load children on mount
  useEffect(() => {
    const loadChildren = async () => {
      try {
        console.log('🔄 Dashboard loading children...');
        const response = await apiService.getChildren();
        if (response.success && response.data) {
          const childrenData = Array.isArray(response.data) 
            ? response.data 
            : (response.data as any)?.data || [];
          console.log('🔍 Dashboard children loaded:', childrenData.length);
          setChildren(childrenData);
          
          // Check if this is a new user who should see onboarding
          await checkForNewUserOnboarding(childrenData);
        }
      } catch (error) {
        console.error('Failed to load children:', error);
      }
    };
    
    loadChildren();
    
    // Listen for children data changes from ChildrenScreen
    const handleChildrenDataChanged = () => {
      console.log('📡 Dashboard received childrenDataChanged event, reloading...');
      loadChildren();
    };
    
    window.addEventListener('childrenDataChanged', handleChildrenDataChanged);
    
    return () => {
      window.removeEventListener('childrenDataChanged', handleChildrenDataChanged);
    };
  }, []);

  // Get UUIDs from URL params - React Router handles this automatically
  const activityUuid = params.activityUuid;
  const childUuid = params.childUuid;

  // Resolve child UUID from URL to internal ID (only when path includes /activities)
  useEffect(() => {
    const path = location.pathname;
    
    console.log('🔄 Dashboard URL change:', { childUuid, path, childrenCount: children.length });
    
    // Only set selectedChildId if we're on a child activities path
    if (childUuid && children.length > 0 && path.includes('/activities')) {
      const child = children.find(c => c.uuid === childUuid);
      if (child) {
        console.log('✅ Setting selectedChildId:', child.uuid, 'for UUID:', childUuid);
        setSelectedChildId(child.uuid);
      } else {
        console.log('❌ Child not found for UUID:', childUuid);
        setSelectedChildId(null);
      }
    } else if (path === '/children') {
      // Clear selected child when on main children page
      console.log('🏠 Clearing selectedChildId for main children page');
      setSelectedChildId(null);
    } else if (path.includes('/activities') && !childUuid) {
      // Handle case where we're on activities path but no childUuid
      console.log('🏠 Clearing selectedChildId - on activities path but no childUuid');
      setSelectedChildId(null);
    }
  }, [childUuid, children, location.pathname]);
  
  // Debug URL and params changes
  useEffect(() => {
    console.log('🎯 URL/Params changed:', { 
      pathname: location.pathname, 
      childUuid: params.childUuid, 
      activityUuid: params.activityUuid
    });
  }, [location.pathname, params.childUuid, params.activityUuid]);

  // Removed all navigation detection and component reset logic
  // Let React Router handle all navigation naturally

  // Sync activeTab with URL
  useEffect(() => {
    const path = location.pathname;
    console.log('🔄 Dashboard URL sync effect triggered:', { path, currentActiveTab: activeTab });
    
    if (path.startsWith('/children')) {
      console.log('📍 Setting activeTab to children for path:', path);
      setActiveTab('children');
      // Extract child UUID from URL if present (from /children/:childUuid/activities)
      const childUuid = params.childUuid;
      if (childUuid && path.includes('/activities')) {
        // Find child by UUID and set the ID for internal state
        // This will be set when children are loaded
        console.log('Child UUID from URL:', childUuid);
      } else if (path === '/children') {
        setSelectedChildId(null);
      }
    } else if (path === '/calendar') {
      setActiveTab('calendar');
    } else if (path === '/clubs') {
      console.log('📍 Setting activeTab to clubs for /clubs path');
      setActiveTab('clubs');
    } else if (path === '/connections') {
      setActiveTab('connections');
    } else if (path === '/profile') {
      setActiveTab('profile');
    } else if (path === '/admin') {
      setActiveTab('admin');
    }
  }, [location.pathname, params.childUuid]);



  const handleMobileNavClick = (tab: Tab) => {
    if (tab === 'connections') {
      handleNavigateToConnections();
    } else {
      // Trigger refresh for ChildrenScreen if switching to children tab
      if (tab === 'children') {
        setChildrenRefreshTrigger(Date.now());
      }
      navigate(`/${tab}`);
      if (tab !== 'calendar') {
        setCalendarInitialDate(undefined);
        setCalendarInitialViewMode('month');
      }
    }
    setMobileMenuOpen(false);
  };

  const handleChildSelection = (child: any) => {
    // Navigate to child-specific URL using UUID
    const targetURL = `/children/${child.uuid}/activities`;
    console.log('🔄 Child selection navigation:', targetURL);
    
    // Use React Router navigate with replace: false to create history entry
    navigate(targetURL, { 
      replace: false,
      state: { fromPath: '/children' }
    });
    setCalendarInitialDate(undefined);
  };

  const handleNavigateToConnectionsFromActivity = (isInActivityCreation: boolean = false) => {
    setCameFromActivity(true);
    setShouldRestoreActivityCreation(isInActivityCreation);
    setCalendarInitialDate(undefined);
    // Store current child UUID and activity UUID when navigating to connections from activity creation
    if (isInActivityCreation && childUuid) {
      setActivityCreationChildUuid(childUuid);
      if (activityUuid) {
        setActivityCreationActivityUuid(activityUuid);
      }
    }
    setActiveTab('connections'); // Use activeTab instead of navigate
    // Scroll to top when navigating to connections
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigateToConnections = () => {
    setCameFromActivity(false);
    setCalendarInitialDate(undefined);
    navigate('/connections');
  };

  const renderContent = () => {
    console.log('🎯 Dashboard renderContent called with activeTab:', activeTab, 'pathname:', location.pathname);
    switch (activeTab) {
      case 'children':
        return <ChildrenScreen
          onNavigateToCalendar={() => {
            setCalendarInitialDate(undefined);
            navigate('/calendar');
          }} 
          onNavigateToChildCalendar={(child, activityDate) => {
            // Check if activity is on weekend (Saturday or Sunday) to determine view mode
            let viewModeParam = '';
            let dayOfWeek = -1;
            if (activityDate) {
              const activityDateObj = new Date(activityDate);
              dayOfWeek = activityDateObj.getDay();
              if (dayOfWeek === 0 || dayOfWeek === 6) { // Sunday or Saturday
                viewModeParam = '?view=week';
              }
            }
            
            // Navigate to child's activities page with date and view parameters
            const targetURL = `/children/${child.uuid}/activities${viewModeParam}${activityDate ? `${viewModeParam ? '&' : '?'}date=${activityDate}` : ''}`;
            console.log('🔄 Navigating to child calendar:', targetURL);
            
            // Use React Router navigate to child activities
            navigate(targetURL, { 
              replace: false,
              state: { fromPath: '/children', initialDate: activityDate, initialViewMode: dayOfWeek === 0 || dayOfWeek === 6 ? 'week' : 'month' }
            });
          }}
          onNavigateToChildActivities={(child) => {
            const targetURL = `/children/${child.uuid}/activities`;
            console.log('🔄 Navigating to child activities:', targetURL);
            console.log('📚 History before child activities navigation:', {
              length: window.history.length,
              currentURL: window.location.href
            });
            
            // Use React Router navigate with replace: false to create history entry
            navigate(targetURL, { 
              replace: false,
              state: { fromPath: '/children' }
            });
          }}
          onNavigateToActivity={(child, activity) => {
            const childActivitiesPath = `/children/${child.uuid}/activities`;
            const activityPath = `${childActivitiesPath}/${activity.uuid || activity.activity_uuid}`;
            
            console.log('🔄 Activity navigation from ChildActivityScreen:', { 
              currentPath: location.pathname, 
              childActivitiesPath, 
              activityPath,
              historyLength: window.history.length 
            });
            
            // Log current history state before navigation
            console.log('📚 Browser history before navigation:', {
              length: window.history.length,
              state: window.history.state,
              currentURL: window.location.href
            });
            
            // Force React Router to create a new history entry by using push navigation
            // This ensures browser back button will work properly
            navigate(activityPath, { 
              replace: false,  // Explicitly force push instead of replace
              state: { 
                fromPath: location.pathname,
                parentPath: childActivitiesPath 
              } 
            });
            
            // Log history after navigation (with slight delay)
            setTimeout(() => {
              console.log('📚 Browser history after navigation:', {
                length: window.history.length,
                state: window.history.state,
                currentURL: window.location.href,
                lengthChange: window.history.length - 50
              });
            }, 100);
          }}
          onNavigateBack={() => {
            // Context-aware navigation based on current URL
            const path = location.pathname;
            const childUuid = params.childUuid;
            const activityUuid = params.activityUuid;
            
            console.log('🔙 onNavigateBack called:', { path, childUuid, activityUuid });
            
            if (activityUuid && childUuid) {
              // If we're in an activity detail page, go back to child activities
              console.log('📍 Going back from activity detail to child activities');
              navigate(`/children/${childUuid}/activities`, { replace: false });
            } else if (childUuid && path.includes('/activities')) {
              // If we're in child activities page, go back to main children page
              console.log('📍 Going back from child activities to main children page');
              navigate('/children', { replace: false });
            } else {
              // Default fallback
              console.log('📍 Default fallback to main children page');
              navigate('/children', { replace: false });
            }
          }}
          initialSelectedChildId={selectedChildId}
          initialActivityUuid={activityUuid}
          onChildSelectionChange={(childId) => {
            console.log('🔄 Child selection changed:', childId);
            setSelectedChildId(childId);
          }}
          onNavigateToConnections={handleNavigateToConnectionsFromActivity}
          shouldRestoreActivityCreation={shouldRestoreActivityCreation}
          refreshTrigger={childrenRefreshTrigger}
        />;
      case 'calendar':
        return <CalendarScreen 
          initialDate={calendarInitialDate}
          initialViewMode={calendarInitialViewMode}
          onNavigateToActivity={(child, activity) => {
            const childActivitiesPath = `/children/${child.uuid}/activities`;
            const activityUuid = (activity as any).activity_uuid || (activity as any).uuid;
            const activityPath = `${childActivitiesPath}/${activityUuid}`;
            
            console.log('🔄 Activity navigation from Calendar:', { 
              currentPath: location.pathname, 
              childActivitiesPath, 
              activityPath,
              historyLength: window.history.length 
            });
            
            // Set a flag to indicate this navigation came from calendar
            sessionStorage.setItem('navigationSource', 'calendar');
            console.log('🏷️ Set navigationSource=calendar in sessionStorage');
            console.log('🏷️ Verification - sessionStorage now contains:', sessionStorage.getItem('navigationSource'));
            
            // DIRECT navigation from calendar to activity detail - skip intermediate page
            // This ensures browser back button goes directly back to calendar
            console.log('📝 Direct navigation from calendar to activity detail (no intermediate page)');
            navigate(activityPath, { 
              replace: false,
              state: { 
                fromPath: '/calendar', // Mark that this came from calendar
                parentPath: childActivitiesPath 
              } 
            });
            
            console.log('📚 Direct navigation completed:', {
              currentPath: activityPath,
              historyLength: window.history.length
            });
          }}
        />;
      case 'clubs':
        console.log('🏢 Rendering ClubsScreen component');
        try {
          return <ClubsScreen />;
        } catch (error) {
          console.error('❌ Error rendering ClubsScreen:', error);
          return (
            <div style={{ padding: '20px', textAlign: 'center', color: 'red' }}>
              <h2>❌ Error Loading Clubs</h2>
              <p>There was an error loading the clubs screen. Please try refreshing the page.</p>
              <button onClick={() => window.location.reload()}>Reload Page</button>
            </div>
          );
        }
      case 'connections':
        return <ConnectionsScreen 
          cameFromActivity={cameFromActivity}
          returnToActivityUrl={shouldRestoreActivityCreation ? `/children/${childUuid}/activities/new` : undefined}
          onForceTabUpdate={(tab) => {
            console.log('🎯 Dashboard force tab update called:', tab);
            setActiveTab(tab as any);
          }}
          onReturnToActivity={() => {
            setCameFromActivity(false);
            setCalendarInitialDate(undefined);
            
            if (shouldRestoreActivityCreation) {
              // Coming from activity creation - return to activity creation form with UUID-based URL
              console.log('📝 Returning to activity creation form with saved draft');
              const newActivityUrl = `/children/${childUuid}/activities/new`;
              console.log('🔄 Navigating to new activity URL:', newActivityUrl);
              
              // Navigate immediately - the URL sync effect will handle setting activeTab
              navigate(newActivityUrl, { replace: false });
            } else {
              // Coming from existing activity editing - return to specific activity
              console.log('📝 Returning to existing activity');
              setActiveTab('children'); // Navigate back to children screen
              // shouldRestoreActivityCreation is false, so it will show the activity list or specific activity
            }
          }}
        />;
      case 'profile':
        return <ProfileScreen />;
      case 'admin':
        return isAdmin ? <AdminScreen /> : <div>Access Denied</div>;
      default:
        return <ChildrenScreen 
          onNavigateToCalendar={() => {
            setCalendarInitialDate(undefined);
            setActiveTab('calendar');
          }} 
          onNavigateToConnections={() => setActiveTab('connections')}
          refreshTrigger={childrenRefreshTrigger}
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
            <img 
              src="/gruju-logo-white.png" 
              alt="Gruju" 
              className="dashboard-logo"
            />
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
            onClick={() => {
              setCalendarInitialDate(undefined);
              // Trigger refresh for ChildrenScreen
              setChildrenRefreshTrigger(Date.now());
              navigate('/children');
            }}
          >
            <span className="nav-label">My Children</span>
          </button>
          
          <button
            className={`nav-item ${activeTab === 'calendar' ? 'active' : ''}`}
            onClick={() => {
              setCalendarInitialDate(undefined);
              navigate('/calendar');
            }}
          >
            <span className="nav-label">Calendar</span>
          </button>
          
          <button
            className={`nav-item ${activeTab === 'clubs' ? 'active' : ''}`}
            onClick={() => {
              setCalendarInitialDate(undefined);
              navigate('/clubs');
            }}
          >
            <span className="nav-label">Browse Clubs</span>
          </button>
          
          <button
            className={`nav-item ${activeTab === 'connections' ? 'active' : ''}`}
            onClick={handleNavigateToConnections}
          >
            <span className="nav-label">Connections</span>
          </button>
          
          <button
            className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => {
              setCalendarInitialDate(undefined);
              navigate('/profile');
            }}
          >
            <span className="nav-label">Profile</span>
          </button>
          
          {isAdmin && (
            <button
              className={`nav-item ${activeTab === 'admin' ? 'active' : ''}`}
              onClick={() => {
                setCalendarInitialDate(undefined);
                navigate('/admin');
              }}
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
                className={`nav-item ${activeTab === 'clubs' ? 'active' : ''}`}
                onClick={() => handleMobileNavClick('clubs')}
              >
                <span className="nav-label">Browse Clubs</span>
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


      {/* Onboarding Flow for New Users */}
      {showOnboarding && (
        <OnboardingFlow 
          onComplete={handleOnboardingComplete}
          onNavigateToProfile={handleNavigateToProfile}
        />
      )}
    </div>
  );
};

export default Dashboard;