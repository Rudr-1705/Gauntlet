import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, CheckCircle, XCircle, Clock, DollarSign, FileText, Award, TrendingUp, Target, Sparkles, Star, Zap, AlertCircle, Send } from 'lucide-react';
import { participantsAPI, handleApiError } from '../services/api';
import { useWallet } from '../context/WalletContext';

const MyParticipations = () => {
  const navigate = useNavigate();
  const { email } = useWallet();
  const [participations, setParticipations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  useEffect(() => {
    if (!email) {
      navigate('/login');
      return;
    }
  }, [email, navigate]);
  useEffect(() => {
    const fetchParticipations = async () => {
      if (!email) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const response = await participantsAPI.getByUserId(email);
        const participationsData = Array.isArray(response.data) 
          ? response.data 
          : (response.data?.participations || []);
        const transformedParticipations = participationsData.map((participation) => ({
          id: participation.id,
          challenge: {
            title: participation.challenge?.title || 'Unknown Challenge',
            domain: participation.challenge?.domain || 'Other',
            reward: participation.challenge?.reward || 0,
          },
          submittedAt: participation.submittedAt || participation.createdAt,
          status: participation.status || 'JOINED',
          rewardReleased: participation.rewardReleased || false,
          rewardTxHash: participation.rewardTxHash || null,
          proof: participation.proof || null,
        }));
        
        setParticipations(transformedParticipations);
      } catch (err) {
        console.error('Error fetching participations:', err);
        if (err.response && err.response.status === 404) {
          setParticipations([]);
          setError(null); 
        } else {
          setError(handleApiError(err));
          setParticipations([]); 
        }
      } finally {
        setLoading(false);
      }
    };

    fetchParticipations();
  }, [email]);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'VERIFIED':
        return <CheckCircle className="text-green-500" size={20} />;
      case 'PROOF_PENDING':
        return <Clock className="text-yellow-500" size={20} />;
      case 'REJECTED':
        return <XCircle className="text-red-500" size={20} />;
      default:
        return <FileText className="text-gray-500" size={20} />;
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      VERIFIED: 'badge-success',
      PROOF_PENDING: 'badge-warning',
      REJECTED: 'badge-error',
    };
    return badges[status] || 'badge';
  };

  const totalEarned = participations
    .filter((p) => p.rewardReleased)
    .reduce((acc, p) => acc + p.challenge.reward, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-yellow-50/30 to-orange-50/30 dark:from-gray-900 dark:via-yellow-950/20 dark:to-orange-950/20">
      <div className="relative overflow-hidden bg-gradient-to-r from-yellow-600 via-orange-600 to-red-600 dark:from-yellow-700 dark:via-orange-700 dark:to-red-700">
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
              <Star className="text-white" size={40} />
            </motion.div>

            <h1 className="text-5xl md:text-6xl font-black mb-4 text-white">
              My Participations
            </h1>
            
            <p className="text-xl text-white/90 mb-6 font-light">
              Your journey to earning rewards and recognition
            </p>

            <div className="flex flex-wrap items-center gap-4">
              {email && (
                <div className="inline-flex items-center space-x-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full border border-white/30">
                  <Target className="text-white" size={18} />
                  <span className="text-white font-medium">{email}</span>
                </div>
              )}
              <div className="inline-flex items-center space-x-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full border border-white/30">
                <Zap className="text-yellow-300" size={18} />
                <span className="text-white font-semibold">{participations.length} Submissions</span>
              </div>
              {totalEarned > 0 && (
                <div className="inline-flex items-center space-x-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full border border-white/30">
                  <Trophy className="text-yellow-300" size={18} />
                  <span className="text-white font-bold">{totalEarned} PYUSD Earned</span>
                </div>
              )}
            </div>
          </motion.div>
        </div>
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" className="w-full h-auto fill-gray-50 dark:fill-gray-900">
            <path d="M0,64L80,69.3C160,75,320,85,480,80C640,75,800,53,960,48C1120,43,1280,53,1360,58.7L1440,64L1440,120L1360,120C1280,120,1120,120,960,120C800,120,640,120,480,120C320,120,160,120,80,120L0,120Z"></path>
          </svg>
        </div>
      </div>

      <div className="container mx-auto px-6 -mt-8 pb-16 relative z-10">
        {loading && (
          <div className="flex flex-col justify-center items-center py-32">
            <div className="relative">
              <div className="animate-spin rounded-full h-24 w-24 border-t-4 border-b-4 border-orange-500"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Star className="text-orange-500 animate-pulse" size={32} />
              </div>
            </div>
            <p className="mt-6 text-lg font-medium text-gray-600 dark:text-gray-300 animate-pulse">
              Loading your participations...
            </p>
          </div>
        )}
        <AnimatePresence>
          {!loading && error && participations.length === 0 && (
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
                <h3 className="text-xl font-bold">Error Loading Participations</h3>
                <p className="text-red-100">{error}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {!loading && participations.length > 0 && (
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
                    <Send className="text-white" size={24} />
                  </div>
                  <TrendingUp className="text-blue-500" size={20} />
                </div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Total Submissions</p>
                <p className="text-4xl font-black text-gray-900 dark:text-white">{participations.length}</p>
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
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Verified</p>
                <p className="text-4xl font-black text-gray-900 dark:text-white">
                  {participations.filter((p) => p.status === 'VERIFIED').length}
                </p>
              </div>
            </motion.div>
            <motion.div
              whileHover={{ y: -4, scale: 1.02 }}
              className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-yellow-500 to-orange-500 p-1 shadow-lg"
            >
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 h-full">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center">
                    <Clock className="text-white" size={24} />
                  </div>
                  <Zap className="text-orange-500" size={20} />
                </div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Pending Review</p>
                <p className="text-4xl font-black text-gray-900 dark:text-white">
                  {participations.filter((p) => p.status === 'PROOF_PENDING').length}
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
                    <DollarSign className="text-white" size={24} />
                  </div>
                  <Award className="text-green-500" size={20} />
                </div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Total Earned</p>
                <p className="text-3xl font-black text-gray-900 dark:text-white">
                  {totalEarned}
                  <span className="text-base font-semibold text-gray-600 dark:text-gray-400 ml-1">PYUSD</span>
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
        {!loading && participations.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="space-y-6"
          >
            {participations.map((participation, index) => (
              <motion.div
                key={participation.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
                whileHover={{ y: -4, scale: 1.01 }}
                className="relative group"
              >
                <div className="absolute -inset-0.5 bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 rounded-2xl opacity-0 group-hover:opacity-100 blur transition-all duration-500"></div>
                <div className="relative bg-white dark:bg-gray-800 rounded-2xl p-6 border-2 border-gray-200 dark:border-gray-700 group-hover:border-transparent transition-all duration-300">
                  <div className="flex items-start space-x-4 mb-4">
                    <div className="flex-shrink-0 mt-1">
                      {getStatusIcon(participation.status)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 group-hover:text-orange-500 dark:group-hover:text-orange-400 transition-colors line-clamp-2">
                        {participation.challenge.title}
                      </h3>
                      
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                          participation.status === 'VERIFIED' 
                            ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white' 
                            : participation.status === 'PROOF_PENDING'
                            ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white'
                            : 'bg-gradient-to-r from-red-500 to-pink-500 text-white'
                        }`}>
                          {participation.status.replace('_', ' ')}
                        </span>
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-blue-500 to-cyan-500 text-white">
                          {participation.challenge.domain}
                        </span>
                        {participation.rewardReleased && (
                          <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-purple-500 to-pink-500 text-white animate-pulse">
                            <Trophy size={14} />
                            <span>PAID</span>
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <div className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                          <DollarSign size={18} className="text-green-600 dark:text-green-400" />
                          <span className="font-bold text-green-700 dark:text-green-300">{participation.challenge.reward} PYUSD</span>
                        </div>
                        
                        <div className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600">
                          <Clock size={18} className="text-gray-600 dark:text-gray-400" />
                          <span className="text-sm text-gray-600 dark:text-gray-300">
                            {new Date(participation.submittedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      {participation.rewardTxHash && (
                        <div className="mt-4 p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl">
                          <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 mb-1">
                            Transaction Hash
                          </p>
                          <p className="text-xs font-mono text-purple-700 dark:text-purple-300 truncate">
                            {participation.rewardTxHash}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
        {!loading && participations.length === 0 && !error && (
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
              No Participations Yet
            </h3>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
              Ready to showcase your skills? Explore exciting challenges and compete to earn PYUSD rewards!
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/')}
              className="px-8 py-4 rounded-xl font-bold text-lg text-white bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 hover:from-yellow-600 hover:via-orange-600 hover:to-red-600 shadow-xl hover:shadow-2xl transition-all duration-300 flex items-center space-x-3 mx-auto"
            >
              <Target size={24} />
              <span>Explore Challenges</span>
              <Sparkles size={20} />
            </motion.button>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default MyParticipations;
