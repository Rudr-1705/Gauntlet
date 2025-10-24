import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { Trophy, Users, DollarSign, TrendingUp, Activity, BarChart3, Zap, Target, Award, Sparkles, ArrowUp, Clock, CheckCircle, AlertCircle, PieChart } from 'lucide-react';
import { dashboardAPI, handleApiError } from '../services/api';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalChallenges: 0,
    totalRewards: 0,
    activeParticipants: 0,
    topDomains: [],
    recentActivity: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('🔍 [Dashboard] Fetching stats from API...');
        const response = await dashboardAPI.getStats();
        console.log('📦 [Dashboard] Raw API response:', response);
        console.log('📊 [Dashboard] Response data:', response.data);
        
        const statsData = response.data.stats || {};
        console.log('✅ [Dashboard] Stats data extracted:', statsData);
        
        setStats({
          totalUsers: statsData.totalUsers || 0,
          totalChallenges: statsData.totalChallenges || 0,
          totalRewards: statsData.totalRewards || 0,
          activeParticipants: statsData.activeParticipants || 0,
          topDomains: statsData.topDomains || [],
          recentActivity: statsData.recentActivity || []
        });
        
        console.log('✅ [Dashboard] Stats state updated');
      } catch (err) {
        console.error('❌ [Dashboard] Error fetching dashboard stats:', err);
        console.error('❌ [Dashboard] Error details:', err.response?.data);
        setError(handleApiError(err));
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-indigo-50/30 to-purple-50/30 dark:from-gray-900 dark:via-indigo-950/20 dark:to-purple-950/20">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 dark:from-indigo-700 dark:via-purple-700 dark:to-pink-700">
        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:32px_32px]"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
        
        <div className="relative container mx-auto px-6 py-16 md:py-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-4xl mx-auto"
          >
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", delay: 0.2 }}
              className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm border-4 border-white/30 mb-6"
            >
              <BarChart3 className="text-white" size={40} />
            </motion.div>

            <h1 className="text-5xl md:text-7xl font-black mb-4 text-white">
              Platform
              <span className="block bg-gradient-to-r from-yellow-300 via-pink-300 to-purple-300 bg-clip-text text-transparent">
                Analytics
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-white/90 mb-8 font-light">
              Real-time insights into your decentralized challenge ecosystem
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4">
              <div className="inline-flex items-center space-x-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full border border-white/30">
                <Zap className="text-yellow-300" size={18} />
                <span className="text-white font-semibold">Live Data</span>
              </div>
              <div className="inline-flex items-center space-x-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full border border-white/30">
                <Sparkles className="text-pink-300" size={18} />
                <span className="text-white font-semibold">AI-Powered</span>
              </div>
              <div className="inline-flex items-center space-x-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full border border-white/30">
                <Target className="text-green-300" size={18} />
                <span className="text-white font-semibold">Blockchain Verified</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Wave Divider */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" className="w-full h-auto fill-gray-50 dark:fill-gray-900">
            <path d="M0,64L80,69.3C160,75,320,85,480,80C640,75,800,53,960,48C1120,43,1280,53,1360,58.7L1440,64L1440,120L1360,120C1280,120,1120,120,960,120C800,120,640,120,480,120C320,120,160,120,80,120L0,120Z"></path>
          </svg>
        </div>
      </div>

      <div className="container mx-auto px-6 -mt-8 pb-16 relative z-10">
        {/* Loading State */}
        {loading && (
          <div className="flex flex-col justify-center items-center py-32">
            <div className="relative">
              <div className="animate-spin rounded-full h-24 w-24 border-t-4 border-b-4 border-indigo-500"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <BarChart3 className="text-indigo-500 animate-pulse" size={32} />
              </div>
            </div>
            <p className="mt-6 text-lg font-medium text-gray-600 dark:text-gray-300 animate-pulse">
              Loading platform analytics...
            </p>
          </div>
        )}

        {/* Error Banner */}
        <AnimatePresence>
          {!loading && error && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-6 p-6 bg-gradient-to-r from-yellow-400 to-orange-400 text-white rounded-2xl shadow-xl flex items-center space-x-4"
            >
              <div className="flex-shrink-0 w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <AlertCircle size={28} />
              </div>
              <div>
                <h3 className="text-lg font-bold">⚠️ {error}</h3>
                <p className="text-sm text-white/80">Showing default values</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {/* Main Stats Cards */}
        {!loading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
          >
            {/* Total Users */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              whileHover={{ y: -8, scale: 1.03 }}
              className="relative group"
            >
              <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl opacity-75 group-hover:opacity-100 blur transition duration-500"></div>
              <div className="relative bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl p-6 text-white overflow-hidden">
                <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <Users size={24} />
                    </div>
                    <div className="flex items-center space-x-1 text-xs font-semibold bg-white/20 px-2 py-1 rounded-full">
                      <ArrowUp size={12} />
                      <span>12%</span>
                    </div>
                  </div>
                  <p className="text-sm font-medium opacity-90 mb-1">Total Users</p>
                  <p className="text-5xl font-black mb-1">{stats.totalUsers.toLocaleString()}</p>
                  <p className="text-xs opacity-75">Community members</p>
                </div>
              </div>
            </motion.div>

            {/* Total Challenges */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              whileHover={{ y: -8, scale: 1.03 }}
              className="relative group"
            >
              <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl opacity-75 group-hover:opacity-100 blur transition duration-500"></div>
              <div className="relative bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl p-6 text-white overflow-hidden">
                <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <Trophy size={24} />
                    </div>
                    <div className="flex items-center space-x-1 text-xs font-semibold bg-white/20 px-2 py-1 rounded-full">
                      <Sparkles size={12} />
                      <span>Active</span>
                    </div>
                  </div>
                  <p className="text-sm font-medium opacity-90 mb-1">Total Challenges</p>
                  <p className="text-5xl font-black mb-1">{stats.totalChallenges.toLocaleString()}</p>
                  <p className="text-xs opacity-75">Live competitions</p>
                </div>
              </div>
            </motion.div>

            {/* Total Rewards */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
              whileHover={{ y: -8, scale: 1.03 }}
              className="relative group"
            >
              <div className="absolute -inset-0.5 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl opacity-75 group-hover:opacity-100 blur transition duration-500"></div>
              <div className="relative bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl p-6 text-white overflow-hidden">
                <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <DollarSign size={24} />
                    </div>
                    <div className="flex items-center space-x-1 text-xs font-semibold bg-white/20 px-2 py-1 rounded-full">
                      <ArrowUp size={12} />
                      <span>24%</span>
                    </div>
                  </div>
                  <p className="text-sm font-medium opacity-90 mb-1">Total Rewards</p>
                  <p className="text-4xl font-black mb-1">{stats.totalRewards.toLocaleString()} <span className="text-2xl">PYUSD</span></p>
                  <p className="text-xs opacity-75">In prize pool</p>
                </div>
              </div>
            </motion.div>

            {/* Active Participants */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
              whileHover={{ y: -8, scale: 1.03 }}
              className="relative group"
            >
              <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl opacity-75 group-hover:opacity-100 blur transition duration-500"></div>
              <div className="relative bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl p-6 text-white overflow-hidden">
                <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <Activity size={24} />
                    </div>
                    <div className="flex items-center space-x-1 text-xs font-semibold bg-white/20 px-2 py-1 rounded-full">
                      <Zap size={12} />
                      <span>Live</span>
                    </div>
                  </div>
                  <p className="text-sm font-medium opacity-90 mb-1">Active Participants</p>
                  <p className="text-5xl font-black mb-1">{stats.activeParticipants.toLocaleString()}</p>
                  <p className="text-xs opacity-75">Currently competing</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
        {/* Bottom Section - Charts & Activity */}
        {!loading && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Domains Chart */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
              className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 dark:from-indigo-500/20 dark:to-purple-500/20 p-1"
            >
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 h-full">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                    <PieChart className="text-white" size={20} />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Top Domains</h3>
                </div>
                
                <div className="space-y-4">
                  {stats.topDomains.length > 0 ? (
                    stats.topDomains.map((domain, index) => {
                      // Assign colors based on index
                      const colors = [
                        'from-blue-500 to-cyan-500',
                        'from-purple-500 to-pink-500',
                        'from-green-500 to-emerald-500',
                        'from-orange-500 to-red-500',
                        'from-yellow-500 to-orange-500'
                      ];
                      const color = colors[index % colors.length];
                      
                      return (
                        <div key={domain.name}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-semibold text-gray-900 dark:text-gray-100">{domain.name}</span>
                            <span className="text-sm font-bold text-gray-600 dark:text-gray-400">{domain.percentage}%</span>
                          </div>
                          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${domain.percentage}%` }}
                              transition={{ delay: 0.7 + index * 0.1, duration: 0.8, type: "spring" }}
                              className={`h-full bg-gradient-to-r ${color} rounded-full`}
                            />
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      <PieChart className="mx-auto mb-2 opacity-50" size={40} />
                      <p className="text-sm">No challenges created yet</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Recent Activity Feed */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.7 }}
              className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-500/10 to-blue-500/10 dark:from-green-500/20 dark:to-blue-500/20 p-1"
            >
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 h-full">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-blue-500 flex items-center justify-center">
                    <Clock className="text-white" size={20} />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Recent Activity</h3>
                </div>
                
                <div className="space-y-4">
                  {stats.recentActivity.length > 0 ? (
                    stats.recentActivity.map((activity, index) => {
                      // Map colors to gradients
                      const colorMap = {
                        green: { bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-green-200 dark:border-green-800', gradient: 'from-green-500 to-emerald-500' },
                        blue: { bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800', gradient: 'from-blue-500 to-cyan-500' },
                        purple: { bg: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-purple-200 dark:border-purple-800', gradient: 'from-purple-500 to-pink-500' },
                        orange: { bg: 'bg-orange-50 dark:bg-orange-900/20', border: 'border-orange-200 dark:border-orange-800', gradient: 'from-orange-500 to-red-500' }
                      };
                      
                      const colors = colorMap[activity.color] || colorMap.blue;
                      
                      // Format timestamp
                      const timeAgo = (timestamp) => {
                        const now = new Date();
                        const activityTime = new Date(timestamp);
                        const diffMs = now - activityTime;
                        const diffMins = Math.floor(diffMs / 60000);
                        const diffHours = Math.floor(diffMs / 3600000);
                        const diffDays = Math.floor(diffMs / 86400000);
                        
                        if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
                        if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
                        return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
                      };
                      
                      return (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.8 + index * 0.1 }}
                          className={`flex items-start space-x-3 p-3 rounded-xl ${colors.bg} border ${colors.border}`}
                        >
                          <div className={`flex-shrink-0 w-8 h-8 mt-0.5 rounded-full bg-gradient-to-br ${colors.gradient} flex items-center justify-center`}>
                            {activity.icon === 'CheckCircle' && <CheckCircle className="text-white" size={16} />}
                            {activity.icon === 'Award' && <Award className="text-white" size={16} />}
                            {activity.icon === 'Zap' && <Zap className="text-white" size={16} />}
                            {activity.icon === 'AlertCircle' && <AlertCircle className="text-white" size={16} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 dark:text-white">{activity.title}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400 truncate">{activity.description}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{timeAgo(activity.timestamp)}</p>
                          </div>
                        </motion.div>
                      );
                    })
                  ) : (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      <Clock className="mx-auto mb-2 opacity-50" size={40} />
                      <p className="text-sm">No recent activity</p>
                      <p className="text-xs mt-1">Activity will appear here when challenges are created</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
