class AuthService {
  constructor() {
    this.baseUrl = this.getBaseUrl();
  }

  getBaseUrl() {
    const isLocal = window.location.hostname === 'localhost' || 
                    window.location.hostname === '127.0.0.1';
                    
    return isLocal 
      ? 'http://localhost:8000'
      : 'check.check';
  }

  // Token management functions
  saveAuthData(user, token) {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
  }

  getAuthToken() {
    try {
      const authData = localStorage.getItem('token') ? localStorage.getItem('token') : null;
      
      if (!authData) {
        return null;
      }
      
      return authData;
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  }

  getCurrentUser() {
    try {
      const authData = window.authData ? JSON.parse(window.authData) : null;
      
      if (!authData || !authData.user) {
        return null;
      }
      
      return authData.user;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  // API call helper with automatic token handling
  async apiCall(endpoint, method = 'GET', body = null, requiresAuth = false) {
    const url = `${this.baseUrl}${endpoint}`;
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    // Add authorization header if required
    if (requiresAuth) {
      const token = this.getAuthToken();
      if (!token) {
        throw new Error('Authentication required. Please log in.');
      }
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || data.message || 'An error occurred');
    }

    return data;
  }

  // Validate token with backend and get fresh user data
  async validateTokenAndGetUser() {
    try {
      const token = this.getAuthToken();
      if (!token) {
        return { isValid: false, user: null, error: 'No token found' };
      }

      // Validate token with backend and get current user info
      const response = await this.apiCall('/api/users/me', 'GET', null, true);
      
      return { 
        isValid: true, 
        user: response, 
        error: null 
      };

    } catch (error) {
      console.error('Token validation failed:', error);
      
      return { 
        isValid: false, 
        user: null, 
        error: error.message 
      };
    }
  }

  // Check authentication status (quick local check)
  isAuthenticated() {
    const token = this.getAuthToken();
    const user = this.getCurrentUser();
    return !!(token && user && !this.isTokenExpired());
  }

  // Login function
  async login(loginData) {
    try {
      const response = await this.apiCall('/api/users/login', 'POST', loginData);
      
      if (!response.token) {
        throw new Error('Login successful but no token received');
      }
      
      // Save authentication data
      this.saveAuthData(response.user, response.token);
      
      return {
        success: true,
        user: response.user,
        message: `Welcome back, ${response.user.username}!`
      };
      
    } catch (error) {
      return {
        success: false,
        user: null,
        message: error.message
      };
    }
  }

  // Register function
  async register(registerData) {
    try {
      const response = await this.apiCall('/api/users/create', 'POST', {
        username: registerData.username,
        email: registerData.email,
        password: registerData.password
      });
      
      return {
        success: true,
        user: response,
        message: `Account created successfully! Welcome, ${response.username}!`
      };
      
    } catch (error) {
      return {
        success: false,
        user: null,
        message: error.message
      };
    }
  }

  // Logout function
  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    return { message: 'Logged out successfully' };
  }

  // Refresh token
  async refreshToken() {
    try {
      const response = await this.apiCall('/api/users/refresh-token', 'PUT', null, true);
      
      // Update stored token
      const currentUser = this.getCurrentUser();
      if (currentUser) {
        this.saveAuthData(currentUser, response.token);
      }
      
      return {
        success: true,
        message: 'Token refreshed successfully'
      };
      
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }

  // Get token expiration info
  getTokenExpirationInfo() {
    try {
      const authData = window.authData ? JSON.parse(window.authData) : null;
      if (!authData) return null;

      const now = Date.now();
      const expiresAt = authData.expiresAt;
      const timeUntilExpiry = expiresAt - now;
      const daysUntilExpiry = Math.ceil(timeUntilExpiry / (1000 * 60 * 60 * 24));

      return {
        expiresAt: new Date(expiresAt),
        timeUntilExpiry,
        daysUntilExpiry,
        isExpired: timeUntilExpiry <= 0
      };
    } catch (error) {
      return null;
    }
  }
}

// Create a singleton instance
const authService = new AuthService();

export default authService;

// Named exports for convenience
export const {
  saveAuthData,
  getAuthToken,
  getCurrentUser,
  isTokenExpired,
  apiCall,
  validateTokenAndGetUser,
  isAuthenticated,
  login,
  register,
  logout,
  refreshToken,
  getTokenExpirationInfo
} = authService;