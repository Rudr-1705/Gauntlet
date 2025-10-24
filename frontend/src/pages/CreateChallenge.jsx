import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { PlusCircle, Sparkles, Wallet as WalletIcon, DollarSign, Target, FileText, Tag, Mail, CheckCircle, AlertCircle, Info, Zap, TrendingUp } from 'lucide-react';
import { challengesAPI, handleApiError } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '../context/WalletContext';
import { useConnect } from 'wagmi';

const CreateChallenge = () => {
  const navigate = useNavigate();
  const { email, address, isConnected, isFullyAuthenticated } = useWallet();
  const { connect, connectors } = useConnect();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    reward: '',
    domain: 'AI/ML',
    correctAnswer: '',  // NEW: For hash-based validation
    judgingCriteria: '',
    creatorEmail: '',
    walletAddress: '',
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [mlProcessing, setMlProcessing] = useState(false);
  const [processingSteps, setProcessingSteps] = useState([]);
  const [createdChallengeId, setCreatedChallengeId] = useState(null);

  const domains = ['AI/ML', 'Blockchain', 'Security', 'Health', 'Other'];

  useEffect(() => {
    if (!email || !email.trim()) {
      navigate('/login');
    }
  }, [email, navigate]);

  useEffect(() => {
    if (email && !formData.creatorEmail) {
      setFormData(prev => ({ 
        ...prev, 
        creatorEmail: email,
        walletAddress: address || ''
      }));
    }
    if (address && !formData.walletAddress) {
      setFormData(prev => ({ ...prev, walletAddress: address }));
    }
  }, [email, address]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    
    if (name === 'creatorEmail' && value) {
      localStorage.setItem('creatorEmail', value);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.creatorEmail || !formData.creatorEmail.trim()) {
      setError('Please enter your email address to create a challenge.');
      return;
    }

    if (!isConnected || !address) {
      setError('Please connect your wallet to create a challenge. You need a wallet to stake PYUSD rewards.');
      return;
    }

    if (!formData.correctAnswer || !formData.correctAnswer.trim()) {
      setError('Please provide the correct answer. It will be securely hashed and stored.');
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      // Use NEW /create endpoint with hash-based validation
      const response = await challengesAPI.create({
        title: formData.title,
        description: formData.description,
        reward: parseFloat(formData.reward),
        domain: formData.domain,
        correctAnswer: formData.correctAnswer, // Will be hashed by backend
        judgingCriteria: formData.judgingCriteria || 'Exact match',
        creator: formData.creatorEmail,
        walletAddress: address,
      });

      setSuccess(true);
      console.log('Challenge created:', response.data);

      // Check if ML processing info is included
      if (response.data.info && response.data.info.steps) {
        setMlProcessing(true);
        setProcessingSteps(response.data.info.steps);
        setCreatedChallengeId(response.data.challenge.id);
        
        // Poll challenge status to check when it goes live
        pollChallengeStatus(response.data.challenge.id);
      } else {
        // Old flow - redirect after 2 seconds
        setTimeout(() => {
          navigate('/my-challenges');
        }, 2000);
      }
    } catch (err) {
      console.error('Error creating challenge:', err);
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  };

  // Poll challenge status to check when ML processing is complete
  const pollChallengeStatus = async (challengeId) => {
    let attempts = 0;
    const maxAttempts = 10; // Poll for up to 20 seconds (10 attempts x 2 sec)
    
    const checkStatus = async () => {
      try {
        const response = await challengesAPI.getById(challengeId);
        const challenge = response.data.challenge || response.data;
        
        if (challenge.status === 'live' || challenge.status === 'funded') {
          // Success! Challenge is live
          setMlProcessing(false);
          setTimeout(() => {
            navigate('/my-challenges');
          }, 2000);
          return;
        } else if (challenge.status === 'rejected') {
          // Challenge was rejected by ML model
          setMlProcessing(false);
          setError('Challenge was not approved by our AI model. Please try again with a clearer description.');
          return;
        }
        
        // Still pending, check again
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(checkStatus, 2000); // Check every 2 seconds
        } else {
          // Timeout - redirect anyway
          setMlProcessing(false);
          navigate('/my-challenges');
        }
      } catch (err) {
        console.error('Error polling challenge status:', err);
        setMlProcessing(false);
        navigate('/my-challenges');
      }
    };
    
    // Start polling after 1 second
    setTimeout(checkStatus, 1000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-purple-50/30 to-pink-50/30 dark:from-gray-900 dark:via-purple-950/20 dark:to-pink-950/20">
      <div className="relative overflow-hidden bg-gradient-to-r from-purple-600 via-pink-600 to-orange-600 dark:from-purple-700 dark:via-pink-700 dark:to-orange-700">
        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:32px_32px]"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
        
        <div className="relative container mx-auto px-6 py-16 md:py-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-3xl mx-auto"
          >
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", delay: 0.2 }}
              className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm border-4 border-white/30 mb-6"
            >
              <Target className="text-white" size={40} />
            </motion.div>

            <h1 className="text-5xl md:text-6xl font-black mb-4 text-white">
              Create Your
              <span className="block bg-gradient-to-r from-yellow-300 via-pink-300 to-purple-300 bg-clip-text text-transparent">
                Challenge
              </span>
            </h1>
            
            <p className="text-xl text-white/90 mb-8 font-light">
              Set a challenge, stake PYUSD rewards, and let innovators compete
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4 text-white">
              <div className="flex items-center space-x-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full border border-white/30">
                <Sparkles className="text-yellow-300" size={20} />
                <span className="font-semibold">AI-Powered Classification</span>
              </div>
              <div className="flex items-center space-x-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full border border-white/30">
                <Zap className="text-green-300" size={20} />
                <span className="font-semibold">Instant Review</span>
              </div>
              <div className="flex items-center space-x-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full border border-white/30">
                <TrendingUp className="text-blue-300" size={20} />
                <span className="font-semibold">Global Reach</span>
              </div>
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
        <AnimatePresence>
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              className="mb-6 p-6 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-2xl shadow-2xl flex items-center space-x-4"
            >
              <div className="flex-shrink-0 w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <CheckCircle size={28} />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold">Challenge Created Successfully!</h3>
                <p className="text-green-100">Redirecting to your challenges...</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-6 p-6 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-2xl shadow-2xl flex items-center space-x-4"
            >
              <div className="flex-shrink-0 w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <AlertCircle size={28} />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold">Oops! Something went wrong</h3>
                <p className="text-red-100">{error}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {!isConnected && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-6"
            >
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 p-1">
                <div className="bg-white dark:bg-gray-900 rounded-xl p-6">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 w-16 h-16 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
                      <WalletIcon className="text-white" size={32} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                        Connect Your Wallet
                      </h3>
                      <p className="text-gray-700 dark:text-gray-300 mb-4">
                        To create a challenge and stake PYUSD rewards, you need to connect your Web3 wallet. Your wallet will hold the reward funds until the challenge is completed.
                      </p>
                      <div className="flex flex-wrap gap-3">
                        {connectors.map((connector) => (
                          <motion.button
                            key={connector.id}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={async () => {
                              try {
                                await connect({ connector });
                              } catch (error) {
                                console.error('Connection error:', error);
                              }
                            }}
                            className="px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white rounded-xl font-bold transition-all shadow-lg hover:shadow-xl flex items-center space-x-2"
                          >
                            <WalletIcon size={20} />
                            <span>Connect {connector.name}</span>
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="lg:col-span-2"
          >
            <div className="card p-8 bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg border-2 border-gray-200 dark:border-gray-700">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="flex items-center space-x-2 text-sm font-bold mb-3 text-gray-900 dark:text-gray-100">
                    <Target className="text-primary-500" size={20} />
                    <span>Challenge Title *</span>
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    required
                    placeholder="e.g., Build an AI-Powered Medical Diagnosis System"
                    className="w-full px-4 py-4 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:border-primary-500 dark:focus:border-primary-400 focus:ring-4 focus:ring-primary-500/20 transition-all duration-300 font-medium"
                  />
                </div>

                <div>
                  <label className="flex items-center space-x-2 text-sm font-bold mb-3 text-gray-900 dark:text-gray-100">
                    <FileText className="text-blue-500" size={20} />
                    <span>Challenge Description *</span>
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    required
                    rows={6}
                    placeholder="Describe your challenge in detail. What problem needs to be solved? What are the requirements and deliverables?"
                    className="w-full px-4 py-4 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-4 focus:ring-blue-500/20 transition-all duration-300 resize-none"
                  />
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    Tip: Be specific about success criteria and submission requirements
                  </p>
                </div>

                {/* NEW: Correct Answer Field */}
                <div>
                  <label className="flex items-center space-x-2 text-sm font-bold mb-3 text-gray-900 dark:text-gray-100">
                    <CheckCircle className="text-green-500" size={20} />
                    <span>Correct Answer *</span>
                  </label>
                  <input
                    type="text"
                    name="correctAnswer"
                    value={formData.correctAnswer}
                    onChange={handleChange}
                    required
                    placeholder="Enter the correct answer (will be securely hashed)"
                    className="w-full px-4 py-4 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:border-green-500 dark:focus:border-green-400 focus:ring-4 focus:ring-green-500/20 transition-all duration-300 font-medium"
                  />
                  <div className="mt-2 flex items-start space-x-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    <Info className="text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" size={16} />
                    <p className="text-xs text-green-700 dark:text-green-300">
                      <strong>Security:</strong> Your answer will be hashed using SHA-256 before storage. 
                      Participants' answers will be compared against this hash, ensuring fairness and security.
                    </p>
                  </div>
                </div>

                {/* Optional: Judging Criteria */}
                <div>
                  <label className="flex items-center space-x-2 text-sm font-bold mb-3 text-gray-900 dark:text-gray-100">
                    <Target className="text-indigo-500" size={20} />
                    <span>Judging Criteria (Optional)</span>
                  </label>
                  <input
                    type="text"
                    name="judgingCriteria"
                    value={formData.judgingCriteria}
                    onChange={handleChange}
                    placeholder="e.g., Exact match, Case insensitive, etc."
                    className="w-full px-4 py-4 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/20 transition-all duration-300 font-medium"
                  />
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    Specify how answers should be evaluated (default: Exact match)
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="flex items-center space-x-2 text-sm font-bold mb-3 text-gray-900 dark:text-gray-100">
                      <Tag className="text-purple-500" size={20} />
                      <span>Domain *</span>
                    </label>
                    <select
                      name="domain"
                      value={formData.domain}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-4 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-purple-500 dark:focus:border-purple-400 focus:ring-4 focus:ring-purple-500/20 transition-all duration-300 font-medium appearance-none cursor-pointer"
                    >
                      {domains.map((domain) => (
                        <option key={domain} value={domain}>
                          {domain}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="flex items-center space-x-2 text-sm font-bold mb-3 text-gray-900 dark:text-gray-100">
                      <DollarSign className="text-green-500" size={20} />
                      <span>Reward (PYUSD) *</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        name="reward"
                        value={formData.reward}
                        onChange={handleChange}
                        required
                        min="1"
                        step="0.01"
                        placeholder="500"
                        className="w-full px-4 py-4 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:border-green-500 dark:focus:border-green-400 focus:ring-4 focus:ring-green-500/20 transition-all duration-300 font-bold text-lg"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">
                        PYUSD
                      </span>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="flex items-center space-x-2 text-sm font-bold mb-3 text-gray-900 dark:text-gray-100">
                    <Mail className="text-orange-500" size={20} />
                    <span>Your Email *</span>
                  </label>
                  <input
                    type="email"
                    name="creatorEmail"
                    value={formData.creatorEmail}
                    onChange={handleChange}
                    required
                    placeholder="creator@example.com"
                    className="w-full px-4 py-4 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:border-orange-500 dark:focus:border-orange-400 focus:ring-4 focus:ring-orange-500/20 transition-all duration-300 font-medium"
                    readOnly={!!email}
                  />
                </div>
                {isConnected && address && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative overflow-hidden rounded-xl bg-gradient-to-r from-green-400 to-emerald-400 p-1"
                  >
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center">
                          <CheckCircle className="text-white" size={20} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-1">
                            Wallet Connected
                          </h4>
                          <p className="font-mono text-sm text-gray-600 dark:text-gray-300 truncate">
                            {address}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                            💡 Rewards will be staked from this wallet
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
                <motion.button
                  whileHover={{ scale: loading || success ? 1 : 1.02 }}
                  whileTap={{ scale: loading || success ? 1 : 0.98 }}
                  type="submit"
                  disabled={loading || success || !isConnected}
                  className={`w-full py-5 px-6 rounded-xl font-bold text-lg transition-all duration-300 shadow-lg hover:shadow-2xl flex items-center justify-center space-x-3 ${
                    success
                      ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
                      : !isConnected
                      ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-primary-500 via-purple-500 to-pink-500 text-white hover:from-primary-600 hover:via-purple-600 hover:to-pink-600'
                  } disabled:opacity-50`}
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                      <span>Creating Challenge...</span>
                    </>
                  ) : success ? (
                    <>
                      <CheckCircle size={24} />
                      <span>Challenge Created Successfully!</span>
                    </>
                  ) : !isConnected ? (
                    <>
                      <WalletIcon size={24} />
                      <span>Connect Wallet to Create</span>
                    </>
                  ) : (
                    <>
                      <PlusCircle size={24} />
                      <span>Create Challenge</span>
                      <Sparkles size={20} />
                    </>
                  )}
                </motion.button>
              </form>

              {/* ML Processing Modal */}
              <AnimatePresence>
                {mlProcessing && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                  >
                    <motion.div
                      initial={{ scale: 0.9, y: 20 }}
                      animate={{ scale: 1, y: 0 }}
                      exit={{ scale: 0.9, y: 20 }}
                      className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-md w-full shadow-2xl"
                    >
                      <div className="text-center mb-6">
                        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                          <Zap className="text-white animate-pulse" size={40} />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                          AI Processing Your Challenge
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400">
                          Our ML model is classifying and validating your challenge...
                        </p>
                      </div>

                      <div className="space-y-3 mb-6">
                        {processingSteps.map((step, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.2 }}
                            className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700"
                          >
                            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-500 text-white flex items-center justify-center text-xs font-bold mt-0.5">
                              {index + 1}
                            </div>
                            <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">
                              {step}
                            </span>
                            <div className="flex-shrink-0">
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-purple-500 border-t-transparent"></div>
                            </div>
                          </motion.div>
                        ))}
                      </div>

                      <div className="flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                        <div className="animate-bounce">⏱️</div>
                        <span>This usually takes 10-15 seconds</span>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="space-y-6"
          >
            <div className="card p-6 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border-2 border-blue-200 dark:border-blue-800">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                  <Info className="text-white" size={20} />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  How It Works
                </h3>
              </div>
              <ul className="space-y-3">
                <li className="flex items-start space-x-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-bold">1</span>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    AI classifies your challenge domain
                  </span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-bold">2</span>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    DAO reviews and approves it
                  </span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-bold">3</span>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Stake PYUSD rewards from your wallet
                  </span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-bold">4</span>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Challenge goes live for participants
                  </span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-bold">5</span>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Winners receive automatic payouts
                  </span>
                </li>
              </ul>
            </div>

            <div className="card p-6 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-2 border-purple-200 dark:border-purple-800">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <Sparkles className="text-white" size={20} />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  Pro Tips
                </h3>
              </div>
              <ul className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
                <li className="flex items-start space-x-2">
                  <span className="text-purple-500 mt-0.5"></span>
                  <span>Be specific about deliverables and success criteria</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-purple-500 mt-0.5"></span>
                  <span>Higher rewards attract more participants</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-purple-500 mt-0.5"></span>
                  <span>Clear requirements reduce disputes</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-purple-500 mt-0.5"></span>
                  <span>Include examples or references if possible</span>
                </li>
              </ul>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default CreateChallenge;
