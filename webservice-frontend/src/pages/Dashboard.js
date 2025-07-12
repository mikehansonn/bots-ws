import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from './api';

const tokenUtil = {
    getToken: () => localStorage.getItem('token'),
    removeToken: () => localStorage.removeItem('token'),
};

const Dashboard = () => {
  const [userData, setUserData] = useState(null);
  const [robotsData, setRobotsData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [robotMacAddress, setRobotMacAddress] = useState('');
  const [isAddingRobot, setIsAddingRobot] = useState(false);
  const [robotError, setRobotError] = useState(null);
  const [robotSuccess, setRobotSuccess] = useState(null);
  const [expandedRobots, setExpandedRobots] = useState(new Set());
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserData = async () => {     
      const token = tokenUtil.getToken();
      if (!token) {
          navigate('/login');
          return;
      }
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await api.get('/api/users/me', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUserData(response.data);
        
        // Fetch robot data if user has robots
        if (response.data.robots && response.data.robots.length > 0) {
          await fetchRobotsData(response.data.id);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [navigate]);

  const fetchRobotsData = async (userId) => {
    const token = tokenUtil.getToken();
    if (!token) {
        navigate('/login');
        return;
    }
    
    try {
      const response = await api.get(`/api/bot/user-bots/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRobotsData(response.data);
    } catch (err) {
      console.error('Failed to fetch robots data:', err);
    }
  };

  const handleRefresh = async () => {
    const token = tokenUtil.getToken();
    if (!token) {
        navigate('/login');
        return;
    }
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await api.get('/api/users/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUserData(response.data);
      
      if (response.data.robots && response.data.robots.length > 0) {
        await fetchRobotsData(response.data.id);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddRobot = async (e) => {
    e.preventDefault();
    
    if (!robotMacAddress.trim()) {
      setRobotError('Please enter a MAC address');
      return;
    }

    const token = tokenUtil.getToken();
    if (!token) {
      navigate('/login');
      return;
    }

    setIsAddingRobot(true);
    setRobotError(null);
    setRobotSuccess(null);

    try {
      const response = await api.post('/api/bot/add', {
        bot_id: robotMacAddress.trim(),
        user_id: userData.username
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setRobotSuccess(`Robot ${robotMacAddress} successfully added to your account!`);
      setRobotMacAddress('');
      
      // Refresh user data to show the new robot
      await handleRefresh();
      
    } catch (err) {
      if (err.response && err.response.data && err.response.data.detail) {
        setRobotError(err.response.data.detail);
      } else {
        setRobotError('Failed to add robot. Please try again.');
      }
    } finally {
      setIsAddingRobot(false);
    }
  };

  const handleLogout = () => {
    tokenUtil.removeToken();
    navigate('/login');
  };

  const toggleRobotExpansion = (robotId) => {
    const newExpanded = new Set(expandedRobots);
    if (newExpanded.has(robotId)) {
      newExpanded.delete(robotId);
    } else {
      newExpanded.add(robotId);
    }
    setExpandedRobots(newExpanded);
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'online':
      case 'active':
        return 'text-green-600 bg-green-100';
      case 'offline':
      case 'inactive':
        return 'text-red-600 bg-red-100';
      case 'warning':
        return 'text-yellow-600 bg-yellow-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    try {
      return new Date(timestamp).toLocaleString();
    } catch {
      return timestamp;
    }
  };

  const StatCard = ({ label, value, unit = '', icon }) => (
    <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-4 border border-slate-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-600">{label}</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {value !== null && value !== undefined ? value : 'N/A'}
            {unit && <span className="text-base font-normal text-slate-500 ml-1">{unit}</span>}
          </p>
        </div>
        {icon && <div className="text-slate-400">{icon}</div>}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Modern Navigation Header */}
      <nav className="bg-white/80 backdrop-blur-md shadow-sm border-b border-slate-200/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                  </svg>
                </div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                  Robot Dashboard
                </h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-slate-700">
                Welcome, {userData?.username}
              </span>
              <button
                onClick={handleRefresh}
                className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors duration-200"
                disabled={isLoading}
                title="Refresh"
              >
                <svg className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              <button
                onClick={handleLogout}
                className="bg-gradient-to-r from-red-500 to-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-md hover:shadow-lg"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-8 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          {/* Error Display */}
          {error && (
            <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-xl shadow-sm">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-red-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-red-700 text-sm font-medium">{error}</p>
              </div>
              <button 
                onClick={() => setError(null)}
                className="text-red-600 text-sm underline mt-2 hover:text-red-800"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Add Robot Section */}
          <div className="mb-8">
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200/50 overflow-hidden">
              <div className="px-6 py-6">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">Add New Robot</h2>
                </div>
                
                <form onSubmit={handleAddRobot} className="space-y-4">
                  <div>
                    <label htmlFor="mac-address" className="block text-sm font-medium text-slate-700 mb-2">
                      Robot MAC Address
                    </label>
                    <div className="flex rounded-xl shadow-sm overflow-hidden">
                      <input
                        type="text"
                        id="mac-address"
                        value={robotMacAddress}
                        onChange={(e) => setRobotMacAddress(e.target.value)}
                        placeholder="Enter MAC address (e.g., 00:1A:2B:3C:4D:5E)"
                        className="flex-1 block w-full px-4 py-3 border border-slate-300 bg-white/50 backdrop-blur-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm rounded-l-xl"
                        disabled={isAddingRobot}
                      />
                      <button
                        type="submit"
                        disabled={isAddingRobot || !robotMacAddress.trim()}
                        className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm font-medium hover:from-blue-600 hover:to-indigo-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 rounded-r-xl"
                      >
                        {isAddingRobot ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Adding...
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            Add Robot
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                  
                  {/* Robot Error/Success Messages */}
                  {robotError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                      <p className="text-red-700 text-sm">{robotError}</p>
                      <button 
                        type="button"
                        onClick={() => setRobotError(null)}
                        className="text-red-600 text-sm underline mt-1 hover:text-red-800"
                      >
                        Dismiss
                      </button>
                    </div>
                  )}
                  
                  {robotSuccess && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-xl">
                      <p className="text-green-700 text-sm">{robotSuccess}</p>
                      <button 
                        type="button"
                        onClick={() => setRobotSuccess(null)}
                        className="text-green-600 text-sm underline mt-1 hover:text-green-800"
                      >
                        Dismiss
                      </button>
                    </div>
                  )}
                </form>
              </div>
            </div>
          </div>

          {/* Robots Overview */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Your Robots</h2>
            <p className="text-slate-600">
              {robotsData.length} robot{robotsData.length !== 1 ? 's' : ''} connected
            </p>
          </div>

          {/* Robot Cards */}
          <div className="space-y-6">
            {robotsData.length === 0 ? (
              <div className="text-center py-16">
                <svg className="mx-auto h-16 w-16 text-slate-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                </svg>
                <h3 className="text-lg font-medium text-slate-900 mb-2">No robots connected</h3>
                <p className="text-slate-600">Add your first robot using the form above.</p>
              </div>
            ) : (
              robotsData.map((robot, index) => (
                <div key={robot.mac || index} className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200/50 overflow-hidden hover:shadow-xl transition-all duration-300">
                  {/* Robot Header */}
                  <div 
                    className="px-6 py-4 cursor-pointer hover:bg-slate-50/50 transition-colors duration-200"
                    onClick={() => toggleRobotExpansion(robot.mac)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                          <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-slate-900">Robot {index + 1}</h3>
                          <p className="text-sm text-slate-600 font-mono">{robot.mac}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                          <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(robot.status_string)}`}>
                            {robot.status_string || 'Unknown'}
                          </span>
                        </div>
                        
                        <svg 
                          className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${
                            expandedRobots.has(robot.mac) ? 'rotate-180' : ''
                          }`} 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Robot Details */}
                  {expandedRobots.has(robot.mac) && (
                    <div className="border-t border-slate-200/50 bg-slate-50/30">
                      <div className="px-6 py-6">
                        {/* Quick Stats Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                          <StatCard 
                            label="Compass Angle" 
                            value={robot.compass_angle?.toFixed(1)} 
                            unit="°"
                            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0 9c0-5 0-5 0-5s0 0 0 0v5z" /></svg>}
                          />
                          <StatCard 
                            label="Speed" 
                            value={robot.route_measured_speed?.toFixed(1)} 
                            unit="m/s"
                            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
                          />
                          <StatCard 
                            label="GPS Accuracy" 
                            value={robot.gps_hacc?.toFixed(1)} 
                            unit="m"
                            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
                          />
                          <StatCard 
                            label="Satellites" 
                            value={robot.gps_satellites_used} 
                            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" /></svg>}
                          />
                        </div>

                        {/* Detailed Information Sections */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {/* GPS Information */}
                          <div className="bg-white/50 rounded-xl p-4 border border-slate-200/50">
                            <h4 className="font-semibold text-slate-900 mb-3 flex items-center">
                              <svg className="w-5 h-5 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              </svg>
                              GPS Data
                            </h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-slate-600">Position:</span>
                                <span className="font-mono text-slate-900">
                                  {robot.gps_now_x}, {robot.gps_now_y}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-600">Accuracy Status:</span>
                                <span className="font-medium text-slate-900">{robot.gps_hacc_status || 'N/A'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-600">PDOP:</span>
                                <span className="font-mono text-slate-900">{robot.gps_pdop?.toFixed(2) || 'N/A'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-600">Last Update:</span>
                                <span className="text-slate-900">{formatTimestamp(robot.gps_timestamp)}</span>
                              </div>
                            </div>
                          </div>

                          {/* Route Information */}
                          <div className="bg-white/50 rounded-xl p-4 border border-slate-200/50">
                            <h4 className="font-semibold text-slate-900 mb-3 flex items-center">
                              <svg className="w-5 h-5 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m0 0L9 7" />
                              </svg>
                              Route Data
                            </h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-slate-600">Current Position:</span>
                                <span className="font-mono text-slate-900">
                                  {robot.route_now_x?.toFixed(3)}, {robot.route_now_y?.toFixed(3)}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-600">Target Position:</span>
                                <span className="font-mono text-slate-900">
                                  {robot.route_tgt_x?.toFixed(3)}, {robot.route_tgt_y?.toFixed(3)}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-600">Target Heading:</span>
                                <span className="font-mono text-slate-900">{robot.route_tgt_heading?.toFixed(1)}°</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-600">Top Speed:</span>
                                <span className="font-mono text-slate-900">{robot.route_topspeed?.toFixed(1)} m/s</span>
                              </div>
                            </div>
                          </div>

                          {/* System Status */}
                          <div className="bg-white/50 rounded-xl p-4 border border-slate-200/50">
                            <h4 className="font-semibold text-slate-900 mb-3 flex items-center">
                              <svg className="w-5 h-5 mr-2 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              System Status
                            </h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-slate-600">Watchdog:</span>
                                <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(robot.watchdog_string)}`}>
                                  {robot.watchdog_string || 'N/A'}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-600">Heartbeat Period:</span>
                                <span className="font-mono text-slate-900">{robot.heartbeat_period || 'N/A'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-600">Compass DRDY Error:</span>
                                <span className="font-mono text-slate-900">{robot.compass_drdy_error_flag || 0}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-600">Created:</span>
                                <span className="text-slate-900">{formatTimestamp(robot.created_at)}</span>
                              </div>
                            </div>
                          </div>

                          {/* Performance Metrics */}
                          <div className="bg-white/50 rounded-xl p-4 border border-slate-200/50">
                            <h4 className="font-semibold text-slate-900 mb-3 flex items-center">
                              <svg className="w-5 h-5 mr-2 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                              </svg>
                              Performance Metrics
                            </h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-slate-600">GPS Read Time (Avg):</span>
                                <span className="font-mono text-slate-900">{robot.gps_avg_read_time?.toFixed(3)}ms</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-600">GPS Read Time (Max):</span>
                                <span className="font-mono text-slate-900">{robot.gps_max_read_time?.toFixed(3)}ms</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-600">GPS Count:</span>
                                <span className="font-mono text-slate-900">{robot.gps_count || 0}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-600">Heartbeat Delta:</span>
                                <span className="font-mono text-slate-900">{robot.heartbeat_delta || 'N/A'}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Timestamps Footer */}
                        <div className="mt-6 pt-4 border-t border-slate-200/50">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-600">
                            <div>
                              <span className="font-medium">Last Heartbeat:</span>
                              <div className="font-mono">{formatTimestamp(robot.heartbeat_timestamp)}</div>
                            </div>
                            <div>
                              <span className="font-medium">Last Route Update:</span>
                              <div className="font-mono">{formatTimestamp(robot.route_timestamp)}</div>
                            </div>
                            <div>
                              <span className="font-medium">Last Compass Reading:</span>
                              <div className="font-mono">{formatTimestamp(robot.compass_timestamp)}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="bg-white rounded-2xl p-8 shadow-2xl">
                <div className="flex items-center space-x-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <p className="text-slate-700 font-medium">Loading robot data...</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;