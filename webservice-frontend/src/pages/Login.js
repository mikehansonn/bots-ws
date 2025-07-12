import React, { useState } from 'react';
import { useAuth } from './useAuth';
import { useNavigate } from 'react-router-dom';

const AuthPage = () => {
  const {
    user,
    isAuthenticated,
    isLoading: authLoading,
    error: authError,
    login,
    register,
    logout,
    getTokenInfo,
    clearError
  } = useAuth();

  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const navigate = useNavigate();
  
  // Form states
  const [loginData, setLoginData] = useState({
    username_or_email: '',
    password: ''
  });
  
  const [registerData, setRegisterData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const [fieldErrors, setFieldErrors] = useState({});

  const resetMessage = () => {
    setMessage({ text: '', type: '' });
    setFieldErrors({});
    clearError();
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = (data, isLoginForm) => {
    const errors = {};
    
    if (isLoginForm) {
      if (!data.username_or_email.trim()) {
        errors.username_or_email = 'Username or email is required';
      }
      if (!data.password) {
        errors.password = 'Password is required';
      }
    } else {
      if (!data.username.trim()) {
        errors.username = 'Username is required';
      } else if (data.username.length < 3) {
        errors.username = 'Username must be at least 3 characters';
      }
      
      if (!data.email.trim()) {
        errors.email = 'Email is required';
      } else if (!validateEmail(data.email)) {
        errors.email = 'Please enter a valid email';
      }
      
      if (!data.password) {
        errors.password = 'Password is required';
      } else if (data.password.length < 6) {
        errors.password = 'Password must be at least 6 characters';
      }
      
      if (data.password !== data.confirmPassword) {
        errors.confirmPassword = 'Passwords do not match';
      }
    }
    
    return errors;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    resetMessage();
    
    const errors = validateForm(loginData, true);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsLoading(true);

    try {
      const result = await login(loginData);
      
      if (result.success) {
        setMessage({ text: result.message, type: 'success' });

        navigate('/dashboard');
      } else {
        setMessage({ text: result.message, type: 'error' });
      }
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    resetMessage();
    
    const errors = validateForm(registerData, false);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsLoading(true);

    try {
      const result = await register({
        username: registerData.username,
        email: registerData.email,
        password: registerData.password
      });
      
      if (result.success) {
        setMessage({ text: result.message, type: 'success' });
        
        // Reset form
        setRegisterData({ username: '', email: '', password: '', confirmPassword: '' });
        
        // Switch to login after successful registration
        setTimeout(() => {
          setIsLogin(true);
          resetMessage();
        }, 2000);
      } else {
        setMessage({ text: result.message, type: 'error' });
      }
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    const result = logout();
    setMessage({ text: result.message, type: 'success' });
    setTimeout(() => {
      resetMessage();
    }, 2000);
  };

  const switchMode = () => {
    setIsLogin(!isLogin);
    resetMessage();
    setLoginData({ username_or_email: '', password: '' });
    setRegisterData({ username: '', email: '', password: '', confirmPassword: '' });
  };

  // Get token expiration info
  const tokenInfo = getTokenInfo();

  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {isAuthenticated 
              ? `Welcome, ${user?.username}!` 
              : isLogin ? 'Welcome Back' : 'Create Account'
            }
          </h1>
          <p className="text-gray-600">
            {isAuthenticated 
              ? 'You are currently logged in' 
              : isLogin ? 'Sign in to your account' : 'Join us today'
            }
          </p>
        </div>

        {/* Token Status Indicator */}
        {isAuthenticated && tokenInfo && (
          <div className="mb-6 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center justify-between text-sm text-green-700">
              <span>✓ Authenticated</span>
              <span>
                Token expires in {tokenInfo.daysUntilExpiry} day{tokenInfo.daysUntilExpiry !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        )}

        {/* Message Display */}
        {(message.text || authError) && (
          <div className={`p-4 rounded-lg mb-6 text-sm ${
            (message.type === 'success' || (!message.text && !authError))
              ? 'bg-green-50 text-green-700 border border-green-200' 
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {message.text || authError}
          </div>
        )}

        {/* Show logout button and user info if authenticated */}
        {isAuthenticated && user ? (
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2">User Information</h3>
              <p className="text-sm text-gray-600">Username: {user.username}</p>
              <p className="text-sm text-gray-600">Email: {user.email}</p>
              <p className="text-sm text-gray-600">ID: {user.id}</p>
              {user.robots && user.robots.length > 0 && (
                <p className="text-sm text-gray-600">Robots: {user.robots.length}</p>
              )}
            </div>
            
            <button
              onClick={handleLogout}
              className="w-full bg-red-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
            >
              Logout
            </button>
          </div>
        ) : (
          <>
            {/* Login Form */}
            {isLogin ? (
              <form onSubmit={handleLogin}>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Username or Email
                    </label>
                    <input
                      type="text"
                      value={loginData.username_or_email}
                      onChange={(e) => setLoginData({...loginData, username_or_email: e.target.value})}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                        fieldErrors.username_or_email ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Enter your username or email"
                      disabled={isLoading}
                    />
                    {fieldErrors.username_or_email && (
                      <p className="text-red-500 text-sm mt-1">{fieldErrors.username_or_email}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Password
                    </label>
                    <input
                      type="password"
                      value={loginData.password}
                      onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                        fieldErrors.password ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Enter your password"
                      disabled={isLoading}
                    />
                    {fieldErrors.password && (
                      <p className="text-red-500 text-sm mt-1">{fieldErrors.password}</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'Signing In...' : 'Sign In'}
                  </button>
                </div>
              </form>
            ) : (
              /* Register Form */
              <form onSubmit={handleRegister}>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Username
                    </label>
                    <input
                      type="text"
                      value={registerData.username}
                      onChange={(e) => setRegisterData({...registerData, username: e.target.value})}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                        fieldErrors.username ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Choose a username"
                      disabled={isLoading}
                    />
                    {fieldErrors.username && (
                      <p className="text-red-500 text-sm mt-1">{fieldErrors.username}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={registerData.email}
                      onChange={(e) => setRegisterData({...registerData, email: e.target.value})}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                        fieldErrors.email ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Enter your email"
                      disabled={isLoading}
                    />
                    {fieldErrors.email && (
                      <p className="text-red-500 text-sm mt-1">{fieldErrors.email}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Password
                    </label>
                    <input
                      type="password"
                      value={registerData.password}
                      onChange={(e) => setRegisterData({...registerData, password: e.target.value})}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                        fieldErrors.password ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Create a password"
                      disabled={isLoading}
                    />
                    {fieldErrors.password && (
                      <p className="text-red-500 text-sm mt-1">{fieldErrors.password}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      value={registerData.confirmPassword}
                      onChange={(e) => setRegisterData({...registerData, confirmPassword: e.target.value})}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                        fieldErrors.confirmPassword ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Confirm your password"
                      disabled={isLoading}
                    />
                    {fieldErrors.confirmPassword && (
                      <p className="text-red-500 text-sm mt-1">{fieldErrors.confirmPassword}</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'Creating Account...' : 'Create Account'}
                  </button>
                </div>
              </form>
            )}

            {/* Switch Mode */}
            <div className="mt-8 text-center">
              <p className="text-gray-600">
                {isLogin ? "Don't have an account?" : "Already have an account?"}
                <button
                  onClick={switchMode}
                  className="ml-2 text-blue-600 hover:text-blue-700 font-medium"
                  disabled={isLoading}
                >
                  {isLogin ? 'Sign up' : 'Sign in'}
                </button>
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AuthPage;