import { useState, useEffect, useCallback } from 'react';
import authService from './authService';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Validate token and update state
  const validateAuth = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await authService.validateTokenAndGetUser();

      if (result.isValid) {
        setUser(result.user);
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
        if (result.error && result.error !== 'No token found') {
          setError(result.error);
        }
      }
    } catch (err) {
      setUser(null);
      setIsAuthenticated(false);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Quick local check (no API call)
  const checkLocalAuth = useCallback(() => {
    const localUser = authService.getCurrentUser();
    const localIsAuth = authService.isAuthenticated();
    
    setUser(localUser);
    setIsAuthenticated(localIsAuth);
    setIsLoading(false);
  }, []);

  // Login function
  const login = useCallback(async (loginData) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await authService.login(loginData);
      
      if (result.success) {
        setUser(result.user);
        setIsAuthenticated(true);
        return { success: true, message: result.message };
      } else {
        setError(result.message);
        return { success: false, message: result.message };
      }
    } catch (err) {
      const errorMsg = err.message || 'Login failed';
      setError(errorMsg);
      return { success: false, message: errorMsg };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Register function
  const register = useCallback(async (registerData) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await authService.register(registerData);
      
      if (result.success) {
        return { success: true, message: result.message, user: result.user };
      } else {
        setError(result.message);
        return { success: false, message: result.message };
      }
    } catch (err) {
      const errorMsg = err.message || 'Registration failed';
      setError(errorMsg);
      return { success: false, message: errorMsg };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Logout function
  const logout = useCallback(() => {
    authService.logout();
    setUser(null);
    setIsAuthenticated(false);
    setError(null);
    return { message: 'Logged out successfully' };
  }, []);

  // Refresh token
  const refreshToken = useCallback(async () => {
    try {
      const result = await authService.refreshToken();
      return result;
    } catch (err) {
      setError(err.message);
      return { success: false, message: err.message };
    }
  }, []);

  // Get token expiration info
  const getTokenInfo = useCallback(() => {
    return authService.getTokenExpirationInfo();
  }, []);

  // Make authenticated API calls
  const apiCall = useCallback(async (endpoint, method = 'GET', body = null, requiresAuth = false) => {
    try {
      return await authService.apiCall(endpoint, method, body, requiresAuth);
    } catch (err) {
      if (err.message.includes('Session expired') || err.message.includes('Authentication required')) {
        setUser(null);
        setIsAuthenticated(false);
        setError(err.message);
      }
      throw err;
    }
  }, []);

  // Initialize auth state on mount
  useEffect(() => {
    // Quick local check first for immediate UI update
    checkLocalAuth();
    
    // Then validate with server
    validateAuth();
  }, [checkLocalAuth, validateAuth]);

  // Auto-refresh token before expiration (optional)
  useEffect(() => {
    if (!isAuthenticated) return;

    const tokenInfo = getTokenInfo();
    if (!tokenInfo) return;

    // Set up auto-refresh 1 day before expiration
    const refreshTime = tokenInfo.timeUntilExpiry - (24 * 60 * 60 * 1000); // 1 day before
    
    if (refreshTime > 0) {
      const timeout = setTimeout(() => {
        refreshToken();
      }, refreshTime);

      return () => clearTimeout(timeout);
    }
  }, [isAuthenticated, refreshToken, getTokenInfo]);

  return {
    // State
    user,
    isAuthenticated,
    isLoading,
    error,
    
    // Actions
    login,
    register,
    logout,
    refreshToken,
    validateAuth,
    apiCall,
    
    // Utilities
    getTokenInfo,
    clearError: () => setError(null)
  };
};

// HOC for protecting routes
export const withAuth = (WrappedComponent) => {
  return function AuthenticatedComponent(props) {
    const { isAuthenticated, isLoading, user } = useAuth();

    if (isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Checking authentication...</p>
          </div>
        </div>
      );
    }

    if (!isAuthenticated) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
            <p className="text-gray-600 mb-4">You need to be logged in to access this page.</p>
            <button 
              onClick={() => window.location.href = '/login'}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Go to Login
            </button>
          </div>
        </div>
      );
    }

    return <WrappedComponent {...props} user={user} />;
  };
};