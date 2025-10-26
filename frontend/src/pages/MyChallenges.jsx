import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Users, DollarSign, Eye, CheckCircle, Clock, XCircle, Plus, TrendingUp, Award, FileText, AlertCircle, Sparkles, Target, BarChart3 } from 'lucide-react';
import { challengesAPI, handleApiError } from '../services/api';

const MyChallenges = () => {
  const navigate = useNavigate();
  const [challenges, setChallenges] = useState([]);
  const [selectedChallenge, setSelectedChallenge] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [creatorEmail, setCreatorEmail] = useState('');
  useEffect(() => {
    const fetchChallenges = async () => {
      try {
        setLoading(true);
        setError(null);
        const email = localStorage.getItem('creatorEmail');
        
        if (!email) {
          navigate('/login');
          return;
        }
        setCreatorEmail(email);
        const response = await challengesAPI.getByCreator(email);
        const challengesData = Array.isArray(response.data) 
          ? response.data 
          : (response.data?.challenges || []);
        const transformedChallenges = challengesData.map((challenge) => ({
          id: challenge.id,
          title: challenge.title,
          description: challenge.description,
          domain: challenge.domain || 'Other',
          reward: challenge.reward,
          status: challenge.status,
          participants: challenge.participants?.length || 0,
          submissions: challenge.submissions?.length || 0,
          createdAt: challenge.createdAt || new Date().toISOString(),
          sponsorTxHash: challenge.sponsorTxHash || 'N/A',
        }));
        
        setChallenges(transformedChallenges);
      } catch (err) {
        console.error('Error fetching challenges:', err);
        if (err.response && err.response.status === 404) {
          setChallenges([]);
          setError(null); 
        } else {
          setError(handleApiError(err));
          setChallenges([]); 
        }
      } finally {
        setLoading(false);
      }
    };

    fetchChallenges();
  }, [navigate]);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'live':
      case 'funded':
        return <CheckCircle className="text-green-500" size={20} />;
      case 'pending':
        return <Clock className="text-yellow-500" size={20} />;
      case 'completed':
        return <Trophy className="text-blue-500" size={20} />;
      case 'rejected':
        return <XCircle className="text-red-500" size={20} />;
      default:
        return <Clock className="text-gray-500" size={20} />;
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      funded: 'badge-success',
      pending: 'badge-warning',
      completed: 'badge-info',
      rejected: 'badge-error',
    };
    return badges[status] || 'badge';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-green-50/30 to-blue-50/30 dark:from-gray-900 dark:via-green-950/20 dark:to-blue-950/20">
      <div className="relative overflow-hidden bg-gradient-to-r from-green-600 via-teal-600 to-blue-600 dark:from-green-700 dark:via-teal-700 dark:to-blue-700">
        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:32px_32px]"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
        
        <div className="relative container mx-auto px-6 py-16 md:py-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl"
          >
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", delay: 0.2 }}
              className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm border-4 border-white/30 mb-6"
            >
              <Award className="text-white" size={40} />
            </motion.div>

            <h1 className="text-5xl md:text-6xl font-black mb-4 text-white">
              My Challenges
            </h1>
            
            <p className="text-xl text-white/90 mb-6 font-light">
              Track, manage, and monitor your active challenges
            </p>

            {creatorEmail && (
              <div className="inline-flex items-center space-x-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full border border-white/30">
                <Target className="text-white" size={18} />
                <span className="text-white font-medium">{creatorEmail}</span>
              </div>
            )}
          </motion.div>
        </div>
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" className="w-full h-auto fill-gray-50 dark:fill-gray-900">
            <path d="M0,64L80,69.3C160,75,320,85,480,80C640,75,800,53,960,48C1120,43,1280,53,1360,58.7L1440,64L1440,120L1360,120C1280,120,1120,120,960,120C800,120,640,120,480,120C320,120,160,120,80,120L0,120Z"></path>
          </svg>
        </div>
      </div>

      <div className="container mx-auto px-6 -mt-8 pb-16 relative z-10">
        <AnimatePresence>
          {error && challenges.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-6 p-4 bg-gradient-to-r from-yellow-400 to-orange-400 text-white rounded-2xl shadow-xl flex items-center space-x-3"
            >
              <AlertCircle size={24} />
              <div>
                <p className="font-semibold">{error}</p>
                <p className="text-sm text-white/80">Showing cached data</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {!loading && error && challenges.length === 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="mb-6 p-6 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-2xl shadow-2xl flex items-center space-x-4"
            >
              <div className="flex-shrink-0 w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <AlertCircle size={28} />
              </div>
              <div>
                <h3 className="text-xl font-bold">Error Loading Challenges</h3>
                <p className="text-red-100">{error}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {loading && (
          <div className="flex flex-col justify-center items-center py-32">
            <div className="relative">
              <div className="animate-spin rounded-full h-24 w-24 border-t-4 border-b-4 border-primary-500"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Trophy className="text-primary-500 animate-pulse" size={32} />
              </div>
            </div>
            <p className="mt-6 text-lg font-medium text-gray-600 dark:text-gray-300 animate-pulse">
              Loading your challenges...
            </p>
          </div>
        )}
        {!loading && challenges.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
          >
            <motion.div
              whileHover={{ y: -4, scale: 1.02 }}
              className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 p-1 shadow-lg"
            >
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 h-full">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                    <Trophy className="text-white" size={24} />
                  </div>
                  <TrendingUp className="text-green-500" size={20} />
                </div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Total Challenges</p>
                <p className="text-4xl font-black text-gray-900 dark:text-white">{challenges.length}</p>
              </div>
            </motion.div>
            <motion.div
              whileHover={{ y: -4, scale: 1.02 }}
              className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 p-1 shadow-lg"
            >
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 h-full">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                    <CheckCircle className="text-white" size={24} />
                  </div>
                  <Sparkles className="text-yellow-500" size={20} />
                </div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Active</p>
                <p className="text-4xl font-black text-gray-900 dark:text-white">
                  {challenges.filter((c) => c.status === 'live' || c.status === 'funded').length}
                </p>
              </div>
            </motion.div>
            <motion.div
              whileHover={{ y: -4, scale: 1.02 }}
              className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 p-1 shadow-lg"
            >
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 h-full">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <Users className="text-white" size={24} />
                  </div>
                  <BarChart3 className="text-blue-500" size={20} />
                </div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Total Participants</p>
                <p className="text-4xl font-black text-gray-900 dark:text-white">
                  {challenges.reduce((acc, c) => acc + c.participants, 0)}
                </p>
              </div>
            </motion.div>
            <motion.div
              whileHover={{ y: -4, scale: 1.02 }}
              className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 p-1 shadow-lg"
            >
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 h-full">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                    <DollarSign className="text-white" size={24} />
                  </div>
                  <Award className="text-yellow-500" size={20} />
                </div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Total Rewards</p>
                <p className="text-3xl font-black text-gray-900 dark:text-white">
                  {challenges.reduce((acc, c) => acc + c.reward, 0)}
                  <span className="text-base font-semibold text-gray-600 dark:text-gray-400 ml-1">PYUSD</span>
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
        {!loading && challenges.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="space-y-6"
          >
            {challenges.map((challenge, index) => (
              <motion.div
                key={challenge.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
                whileHover={{ y: -4, scale: 1.01 }}
                className="relative group cursor-pointer"
                onClick={() => setSelectedChallenge(challenge)}
              >
                <div className="absolute -inset-0.5 bg-gradient-to-r from-green-500 via-blue-500 to-purple-500 rounded-2xl opacity-0 group-hover:opacity-100 blur transition-all duration-500"></div>
                <div className="relative bg-white dark:bg-gray-800 rounded-2xl p-6 border-2 border-gray-200 dark:border-gray-700 group-hover:border-transparent transition-all duration-300">
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between mb-4">
                    <div className="flex-1 mb-4 lg:mb-0">
                      <div className="flex items-start space-x-3 mb-3">
                        <div className="flex-shrink-0 mt-1">
                          {getStatusIcon(challenge.status)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 group-hover:text-primary-500 dark:group-hover:text-primary-400 transition-colors line-clamp-2">
                            {challenge.title}
                          </h3>
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                            challenge.status === 'live' || challenge.status === 'funded'
                              ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white' 
                              : challenge.status === 'pending'
                              ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white'
                              : challenge.status === 'completed'
                              ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white'
                              : challenge.status === 'rejected'
                              ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white'
                              : 'bg-gradient-to-r from-gray-500 to-gray-600 text-white'
                          }`}>
                            {challenge.status.toUpperCase()}
                          </span>
                        </div>
                      </div>
                      
                      <p className="text-gray-600 dark:text-gray-300 mb-4 line-clamp-2">
                        {challenge.description}
                      </p>
                      <div className="flex flex-wrap gap-3">
                        <div className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                          <DollarSign size={18} className="text-green-600 dark:text-green-400" />
                          <span className="font-bold text-green-700 dark:text-green-300">{challenge.reward} PYUSD</span>
                        </div>
                        
                        <div className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                          <Users size={18} className="text-blue-600 dark:text-blue-400" />
                          <span className="font-semibold text-blue-700 dark:text-blue-300">{challenge.participants} joined</span>
                        </div>
                        
                        <div className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
                          <Eye size={18} className="text-purple-600 dark:text-purple-400" />
                          <span className="font-semibold text-purple-700 dark:text-purple-300">{challenge.submissions} submissions</span>
                        </div>
                        
                        <div className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600">
                          <Clock size={18} className="text-gray-600 dark:text-gray-400" />
                          <span className="text-sm text-gray-600 dark:text-gray-300">{new Date(challenge.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedChallenge(challenge);
                      }}
                      className="flex-shrink-0 px-6 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-primary-500 to-blue-500 hover:from-primary-600 hover:to-blue-600 shadow-lg hover:shadow-xl transition-all duration-300 flex items-center space-x-2"
                    >
                      <FileText size={18} />
                      <span>View Details</span>
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
        {!loading && challenges.length === 0 && !error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-32"
          >
            <div className="mb-8">
              <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 mb-6">
                <Trophy className="text-gray-400 dark:text-gray-500" size={64} />
              </div>
            </div>
            <h3 className="text-4xl font-bold mb-4 text-gray-900 dark:text-white">
              No Challenges Created Yet
            </h3>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
              Ready to start your journey? Create your first challenge and watch innovators compete to solve it!
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/create')}
              className="px-8 py-4 rounded-xl font-bold text-lg text-white bg-gradient-to-r from-green-500 via-blue-500 to-purple-500 hover:from-green-600 hover:via-blue-600 hover:to-purple-600 shadow-xl hover:shadow-2xl transition-all duration-300 flex items-center space-x-3 mx-auto"
            >
              <Plus size={24} />
              <span>Create Your First Challenge</span>
              <Sparkles size={20} />
            </motion.button>
          </motion.div>
        )}
        <AnimatePresence>
          {selectedChallenge && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedChallenge(null)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="card p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-6">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  {getStatusIcon(selectedChallenge.status)}
                  <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                    {selectedChallenge.title}
                  </h2>
                </div>
                <span className={getStatusBadge(selectedChallenge.status)}>
                  {selectedChallenge.status}
                </span>
              </div>
              <button
                onClick={() => setSelectedChallenge(null)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Description</h3>
                <p className="text-gray-600 dark:text-gray-300">{selectedChallenge.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <DollarSign className="text-green-500 mb-2" size={24} />
                  <p className="text-sm text-gray-600 dark:text-gray-400">Reward</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {selectedChallenge.reward} PYUSD
                  </p>
                </div>

                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <Users className="text-blue-500 mb-2" size={24} />
                  <p className="text-sm text-gray-600 dark:text-gray-400">Participants</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {selectedChallenge.participants}
                  </p>
                </div>

                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <Eye className="text-purple-500 mb-2" size={24} />
                  <p className="text-sm text-gray-600 dark:text-gray-400">Submissions</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {selectedChallenge.submissions}
                  </p>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <Clock className="text-gray-500 mb-2" size={24} />
                  <p className="text-sm text-gray-600 dark:text-gray-400">Created</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    {new Date(selectedChallenge.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setSelectedChallenge(null)}
                  className="flex-1 btn-secondary"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    alert('Viewing participants and submissions');
                  }}
                  className="flex-1 btn-primary"
                >
                  View Submissions
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default MyChallenges;
