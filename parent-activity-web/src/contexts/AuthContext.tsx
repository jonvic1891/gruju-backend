import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import ApiService from '../services/api';
import { User, LoginRequest, RegisterRequest } from '../types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isPendingRegistration: boolean;
  showAddressModal: boolean;
  pendingUserData: any;
  pendingToken: string;
  login: (credentials: LoginRequest) => Promise<{ success: boolean; error?: string }>;
  register: (userData: RegisterRequest) => Promise<{ success: boolean; error?: string; user?: any; token?: string }>;
  completeRegistration: (userData: any, token: string) => void;
  setShowAddressModal: (show: boolean) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPendingRegistration, setIsPendingRegistration] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [pendingUserData, setPendingUserData] = useState<any>(null);
  const [pendingToken, setPendingToken] = useState<string>('');
  const apiService = ApiService.getInstance();

  // Enhanced debug logging
  console.log('AuthProvider rendering:', {
    user,
    isAuthenticated: !!user,
    isLoading,
    isPendingRegistration,
    showAddressModal,
    timestamp: new Date().toISOString()
  });

  useEffect(() => {
    console.log('AuthProvider mounted, checking auth status');
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      console.log('checkAuthStatus: Starting auth check');
      setIsLoading(true);
      
      // Check if we have a stored token
      const token = localStorage.getItem('authToken');
      console.log('checkAuthStatus: Token check:', { hasToken: !!token });
      
      if (!token) {
        console.log('checkAuthStatus: No token found, user not authenticated');
        setIsLoading(false);
        return;
      }

      // Try to get user data from localStorage first
      const userData = localStorage.getItem('userData');
      console.log('checkAuthStatus: UserData check:', { hasUserData: !!userData });
      
      if (userData) {
        try {
          const parsedUser = JSON.parse(userData);
          console.log('checkAuthStatus: Setting user from localStorage:', parsedUser);
          setUser(parsedUser);
        } catch (e) {
          console.error('Failed to parse stored user data:', e);
        }
      }

      // Get full profile data from the server
      console.log('checkAuthStatus: Getting profile data from server');
      const response = await apiService.getProfile();
      console.log('checkAuthStatus: Profile response:', response);
      
      if (response.success && response.data) {
        console.log('checkAuthStatus: Got profile data, setting user:', response.data);
        setUser(response.data);
        localStorage.setItem('userData', JSON.stringify(response.data));
      } else {
        console.log('checkAuthStatus: Failed to get profile, clearing auth data');
        // Token is invalid, clear it
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        setUser(null);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      // Clear potentially invalid tokens
      localStorage.removeItem('authToken');
      localStorage.removeItem('userData');
      setUser(null);
    } finally {
      console.log('checkAuthStatus: Finished, setting isLoading to false');
      setIsLoading(false);
    }
  };

  const login = async (credentials: LoginRequest): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      
      const response = await apiService.login(credentials);
      
      if (response.success && response.data) {
        setUser(response.data.user);
        return { success: true };
      } else {
        return { success: false, error: response.error || 'Login failed' };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Login failed' 
      };
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: RegisterRequest): Promise<{ success: boolean; error?: string; user?: any; token?: string }> => {
    try {
      setIsLoading(true);
      console.log('🔐 AuthContext: Starting registration for:', userData.email);
      
      const response = await apiService.register(userData);
      console.log('🔐 AuthContext: API register response:', response);
      
      if (response.success && response.data) {
        console.log('✅ AuthContext: Registration successful, user:', response.data.user);
        // Set the token in API service immediately so address modal can make authenticated requests
        apiService.setToken(response.data.token);
        // Set pending registration flag and address modal data
        setPendingUserData(response.data.user);
        setPendingToken(response.data.token);
        setShowAddressModal(true);
        setIsPendingRegistration(true);
        setIsLoading(false);
        return { success: true, user: response.data.user, token: response.data.token };
      } else {
        console.error('❌ AuthContext: Registration failed:', response.error);
        setIsLoading(false);
        return { success: false, error: response.error || 'Registration failed' };
      }
    } catch (error) {
      console.error('❌ AuthContext: Registration exception:', error);
      setIsLoading(false);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Registration failed' 
      };
    }
    // Note: Don't set isLoading(false) here for success case - will be done in completeRegistration
  };

  const completeRegistration = (userData: any, token: string) => {
    console.log('✅ AuthContext: Completing registration with user:', userData);
    // Set token in API service and localStorage
    apiService.setToken(token);
    localStorage.setItem('authToken', token);
    localStorage.setItem('userData', JSON.stringify(userData));
    setUser(userData);
    setIsPendingRegistration(false);
    setShowAddressModal(false);
    setPendingUserData(null);
    setPendingToken('');
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      const response = await apiService.logout();
      if (!response.success) {
        console.warn('Server logout failed:', response.error);
      }
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
      // Still clear user state even if logout fails
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUser = async () => {
    try {
      console.log('🔄 AuthContext: Refreshing user profile data');
      const response = await apiService.getProfile();
      if (response.success && response.data) {
        console.log('✅ AuthContext: Got updated profile data:', response.data);
        setUser(response.data);
        localStorage.setItem('userData', JSON.stringify(response.data));
      } else {
        console.error('❌ AuthContext: Failed to get profile data:', response.error);
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    isPendingRegistration,
    showAddressModal,
    pendingUserData,
    pendingToken,
    login,
    register,
    completeRegistration,
    setShowAddressModal,
    logout,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;