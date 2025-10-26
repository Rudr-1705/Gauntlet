import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, CheckCircle, XCircle, Clock, DollarSign, FileText, Award, TrendingUp, Target, Sparkles, Star, Zap, AlertCircle, Send } from 'lucide-react';
import { participantsAPI, handleApiError } from '../services/api';
import { useWallet } from '../context/WalletContext';

const MyParticipations = () => {
  const navigate = useNavigate();
  const { email, address } = useWallet();
  const [participations, setParticipations] = useState([]);
  const [selectedParticipation, setSelectedParticipation] = useState(null);
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
      if (!address) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const response = await participantsAPI.getByUserId(address); // Use wallet address
        const participationsData = Array.isArray(response.data) 
          ? response.data 
          : (response.data?.participants || []);
        const transformedParticipations = participationsData.map((participation) => {
          // Get the latest submission status
          const latestSubmission = participation.submissions?.[0]; // Submissions ordered by submittedAt DESC
          let displayStatus = 'JOINED';
          
          // Priority: participant.status (WINNER/LOSER from backend) > submission.status
          if (participation.status === 'WINNER') {
            displayStatus = 'VERIFIED';
          } else if (participation.status === 'LOSER') {
            displayStatus = 'REJECTED';
          } else if (latestSubmission) {
            // Check actual submission status from database
            displayStatus = latestSubmission.status; // PENDING, VERIFIED, or REJECTED
          }
          
          return {
            id: participation.id,
            challengeId: participation.challengeId,
            challenge: {
              title: participation.challenge?.title || 'Unknown Challenge',
              domain: participation.challenge?.domain || 'Other',
              reward: participation.challenge?.reward || 0,
              status: participation.challenge?.status || 'unknown',
            },
            submittedAt: participation.joinedAt,
            status: displayStatus,
            rewardReleased: participation.rewardTxHash ? true : false,
            rewardTxHash: participation.rewardTxHash || null,
            stakeAmount: participation.stakeAmount || 0,
            hasSubmitted: participation.submissionCount > 0,
            submissionCount: participation.submissionCount || 0,
            submissions: participation.submissions || [],
            latestSubmission: latestSubmission,
            participantStatus: participation.status, // Store original status
          };
        });
        
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
      case 'PENDING':
        return <Clock className="text-yellow-500" size={20} />;
      case 'PROOF_PENDING':
        return <Clock className="text-yellow-500" size={20} />;
      case 'REJECTED':
        return <XCircle className="text-red-500" size={20} />;
      case 'JOINED':
        return <FileText className="text-blue-500" size={20} />;
      default:
        return <FileText className="text-gray-500" size={20} />;
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      VERIFIED: 'badge-success',
      PENDING: 'badge-warning',
      PROOF_PENDING: 'badge-warning',
      REJECTED: 'badge-error',
      JOINED: 'badge-info',
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
                className="relative group cursor-pointer"
                onClick={() => setSelectedParticipation(participation)}
              >
                <div className="absolute -inset-0.5 bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 rounded-2xl opacity-0 group-hover:opacity-100 blur transition-all duration-500"></div>
                <div className="relative bg-white dark:bg-gray-800 rounded-2xl p-6 border-2 border-gray-200 dark:border-gray-700 group-hover:border-transparent transition-all duration-300">
                  <div className="flex items-start justify-between space-x-4 mb-4">
                    <div className="flex items-start space-x-4">
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
                              : (participation.status === 'PENDING' || participation.status === 'PROOF_PENDING')
                              ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white'
                              : participation.status === 'JOINED'
                              ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white'
                              : 'bg-gradient-to-r from-red-500 to-pink-500 text-white'
                          }`}>
                            {participation.status === 'VERIFIED' ? '✅ Correct!' : 
                             participation.status === 'PENDING' ? '⏳ Verifying...' :
                             participation.status === 'PROOF_PENDING' ? '⏳ Verifying...' :
                             participation.status === 'REJECTED' ? '❌ Incorrect' :
                             participation.status === 'JOINED' ? '📝 Not Submitted' :
                             participation.status.replace('_', ' ')}
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
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedParticipation(participation);
                      }}
                      className="flex-shrink-0 px-4 py-2 rounded-xl font-semibold text-white bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 shadow-lg hover:shadow-xl transition-all duration-300 flex items-center space-x-2"
                    >
                      <FileText size={18} />
                      <span>Details</span>
                    </motion.button>
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
        
        {/* Participation Details Modal */}
        <AnimatePresence>
          {selectedParticipation && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4"
              onClick={() => setSelectedParticipation(null)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex justify-between items-start mb-6">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      {getStatusIcon(selectedParticipation.status)}
                      <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                        {selectedParticipation.challenge.title}
                      </h2>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                        selectedParticipation.status === 'VERIFIED' 
                          ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white' 
                          : selectedParticipation.status === 'PROOF_PENDING'
                          ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white'
                          : selectedParticipation.status === 'JOINED'
                          ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white'
                          : 'bg-gradient-to-r from-red-500 to-pink-500 text-white'
                      }`}>
                        {selectedParticipation.status.replace('_', ' ')}
                      </span>
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                        {selectedParticipation.challenge.domain}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedParticipation(null)}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-3xl font-bold"
                  >
                    ×
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Challenge Status */}
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                    <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-1">Challenge Status</p>
                    <p className="text-2xl font-bold text-blue-700 dark:text-blue-300 capitalize">
                      {selectedParticipation.challenge.status}
                    </p>
                  </div>

                  {/* Reward & Stake Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
                      <DollarSign className="text-green-500 mb-2" size={24} />
                      <p className="text-sm font-semibold text-green-600 dark:text-green-400">Reward</p>
                      <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                        {selectedParticipation.challenge.reward} PYUSD
                      </p>
                    </div>

                    <div className="p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl">
                      <Award className="text-purple-500 mb-2" size={24} />
                      <p className="text-sm font-semibold text-purple-600 dark:text-purple-400">Your Stake</p>
                      <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                        {selectedParticipation.stakeAmount} PYUSD
                      </p>
                    </div>
                  </div>

                  {/* Submission Count */}
                  <div className="p-4 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">Submissions</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                          {selectedParticipation.submissionCount} submitted
                        </p>
                      </div>
                      {selectedParticipation.hasSubmitted ? (
                        <CheckCircle className="text-green-500" size={32} />
                      ) : (
                        <Clock className="text-yellow-500" size={32} />
                      )}
                    </div>
                  </div>

                  {/* Joined Date */}
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl">
                    <Clock className="text-gray-500 mb-2" size={20} />
                    <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">Joined On</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      {new Date(selectedParticipation.submittedAt).toLocaleString()}
                    </p>
                  </div>

                  {/* Reward Status */}
                  {selectedParticipation.rewardReleased && (
                    <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-800 rounded-xl">
                      <div className="flex items-center space-x-2 mb-2">
                        <Trophy className="text-purple-600 dark:text-purple-400" size={24} />
                        <p className="text-lg font-bold text-purple-700 dark:text-purple-300">Reward Released!</p>
                      </div>
                      {selectedParticipation.rewardTxHash && (
                        <div className="mt-2">
                          <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 mb-1">
                            Transaction Hash
                          </p>
                          <p className="text-xs font-mono text-purple-700 dark:text-purple-300 break-all">
                            {selectedParticipation.rewardTxHash}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex space-x-3 pt-4">
                    <button
                      onClick={() => setSelectedParticipation(null)}
                      className="flex-1 px-6 py-3 rounded-xl font-semibold text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                    >
                      Close
                    </button>
                    <button
                      onClick={() => navigate(`/challenge/${selectedParticipation.challengeId}/join`)}
                      className="flex-1 px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      View Challenge
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

export default MyParticipations;
