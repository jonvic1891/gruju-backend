import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import ApiService from '../services/api';
import { User, LoginRequest, RegisterRequest } from '../types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginRequest) => Promise<{ success: boolean; error?: string }>;
  register: (userData: RegisterRequest) => Promise<{ success: boolean; error?: string }>;
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
  const apiService = ApiService.getInstance();

  // Enhanced debug logging
  console.log('AuthProvider rendering:', {
    user,
    isAuthenticated: !!user,
    isLoading,
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

      // Verify the token with the server
      console.log('checkAuthStatus: Verifying token with server');
      const response = await apiService.verifyToken();
      console.log('checkAuthStatus: Token verification response:', response);
      
      if (response.success && response.data?.user) {
        console.log('checkAuthStatus: Token verified, setting user:', response.data.user);
        setUser(response.data.user);
        localStorage.setItem('userData', JSON.stringify(response.data.user));
      } else {
        console.log('checkAuthStatus: Token invalid, clearing auth data');
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

  const register = async (userData: RegisterRequest): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      
      const response = await apiService.register(userData);
      
      if (response.success && response.data) {
        setUser(response.data.user);
        return { success: true };
      } else {
        return { success: false, error: response.error || 'Registration failed' };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Registration failed' 
      };
    } finally {
      setIsLoading(false);
    }
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
      const response = await apiService.verifyToken();
      if (response.success && response.data?.user) {
        setUser(response.data.user);
        localStorage.setItem('userData', JSON.stringify(response.data.user));
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
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