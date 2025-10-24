import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Users, Clock, DollarSign, ArrowRight, Search, Sparkles, TrendingUp, Award, Filter } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { challengesAPI, handleApiError } from '../services/api';

const Home = () => {
  const navigate = useNavigate();
  const [challenges, setChallenges] = useState([]);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchChallenges = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch only funded and live challenges for public explore page
        const [fundedResponse, liveResponse] = await Promise.all([
          challengesAPI.getAll({ status: 'funded' }),
          challengesAPI.getAll({ status: 'live' })
        ]);
        
        const fundedData = Array.isArray(fundedResponse.data) 
          ? fundedResponse.data 
          : (fundedResponse.data?.challenges || []);
        
        const liveData = Array.isArray(liveResponse.data)
          ? liveResponse.data
          : (liveResponse.data?.challenges || []);
        
        const allChallengesData = [...fundedData, ...liveData];
        
        const transformedChallenges = allChallengesData.map((challenge) => ({
          id: challenge.id,
          title: challenge.title,
          description: challenge.description,
          domain: challenge.domain || 'Other',
          reward: challenge.reward,
          status: challenge.status,
          participants: challenge.participantCount || challenge.participants?.length || 0,
          deadline: challenge.deadline || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          creator: challenge.creator,
        }));
        
        setChallenges(transformedChallenges);
      } catch (err) {
        console.error('Error fetching challenges:', err);
        setError(handleApiError(err));
        setChallenges(getMockChallenges());
      } finally {
        setLoading(false);
      }
    };

    fetchChallenges();
  }, []);

  const getMockChallenges = () => [
    {
      id: 1,
      title: 'Build a Decentralized Voting System',
      description: 'Create a secure voting system using blockchain technology',
      domain: 'Blockchain',
      reward: 500,
      status: 'funded',
      participants: 12,
      deadline: '2025-11-15',
      creator: { walletAddress: '0x1234...5678' },
    },
    {
      id: 2,
      title: 'AI Model for Medical Diagnosis',
      description: 'Develop an AI model to assist in medical image analysis',
      domain: 'AI/ML',
      reward: 750,
      status: 'funded',
      participants: 8,
      deadline: '2025-11-30',
      creator: { walletAddress: '0x9876...5432' },
    },
    {
      id: 3,
      title: 'Smart Contract Security Audit',
      description: 'Identify vulnerabilities in DeFi smart contracts',
      domain: 'Security',
      reward: 1000,
      status: 'funded',
      participants: 5,
      deadline: '2025-12-10',
      creator: { walletAddress: '0xabcd...efgh' },
    },
  ];

  const domains = ['All', 'AI/ML', 'Blockchain', 'Security', 'Health', 'Other'];

  const filteredChallenges = challenges.filter((challenge) => {
    const matchesDomain = filter === 'all' || challenge.domain === filter;
    const matchesSearch = challenge.title.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesDomain && matchesSearch;
  });

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 },
  };

  const handleJoinChallenge = (challengeId) => {
    const email = localStorage.getItem('creatorEmail');
    if (!email) {
      navigate('/login');
      return;
    }
    
    // Navigate to the join challenge page
    navigate(`/challenge/${challengeId}/join`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30 dark:from-gray-900 dark:via-blue-950/20 dark:to-purple-950/20">
      <div className="relative overflow-hidden bg-gradient-to-r from-primary-600 via-blue-600 to-purple-600 dark:from-primary-700 dark:via-blue-700 dark:to-purple-700">
        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:32px_32px]"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
        
        <div className="relative container mx-auto px-6 py-16 md:py-24">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-4xl mx-auto"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="inline-flex items-center space-x-2 bg-white/20 dark:bg-black/20 backdrop-blur-sm px-4 py-2 rounded-full mb-6 border border-white/30"
            >
              <Sparkles className="text-yellow-300" size={20} />
              <span className="text-white font-medium">Powered by PYUSD & AI</span>
            </motion.div>

            <h1 className="text-5xl md:text-7xl font-black mb-6 text-white">
              Explore Epic
              <span className="block bg-gradient-to-r from-yellow-300 via-pink-300 to-purple-300 bg-clip-text text-transparent">
                Challenges
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-white/90 mb-8 font-light">
              Compete. Innovate. Earn Crypto Rewards.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-6 text-white/80">
              <div className="flex items-center space-x-2">
                <Award className="text-yellow-300" size={24} />
                <span className="font-semibold">{challenges.length} Active Challenges</span>
              </div>
              <div className="flex items-center space-x-2">
                <TrendingUp className="text-green-300" size={24} />
                <span className="font-semibold">{challenges.reduce((sum, c) => sum + c.reward, 0)} PYUSD Pool</span>
              </div>
              <div className="flex items-center space-x-2">
                <Users className="text-blue-300" size={24} />
                <span className="font-semibold">{challenges.reduce((sum, c) => sum + c.participants, 0)} Participants</span>
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

      <div className="container mx-auto px-6 -mt-8 relative z-10">
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-6 p-4 bg-gradient-to-r from-yellow-400 to-orange-400 text-white rounded-2xl shadow-xl flex items-center space-x-3"
            >
              <div className="flex-shrink-0 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                ⚠️
              </div>
              <div className="flex-1">
                <p className="font-semibold">{error}</p>
                <p className="text-sm text-white/80">Showing cached data</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card p-6 mb-8 bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg border-2 border-gray-200 dark:border-gray-700"
        >
          <div className="flex flex-col lg:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search challenges by title, description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:border-primary-500 dark:focus:border-primary-400 focus:ring-4 focus:ring-primary-500/20 transition-all duration-300"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="text-gray-500 dark:text-gray-400" size={20} />
              <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Filter:</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            {domains.map((domain) => (
              <motion.button
                key={domain}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setFilter(domain)}
                className={`px-5 py-2.5 rounded-full font-semibold transition-all duration-300 shadow-md ${
                  filter === domain
                    ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-primary-500/50 shadow-lg'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 border-2 border-gray-200 dark:border-gray-600'
                }`}
              >
                {domain}
              </motion.button>
            ))}
          </div>
        </motion.div>
        {loading && (
          <div className="flex flex-col justify-center items-center py-32">
            <div className="relative">
              <div className="animate-spin rounded-full h-24 w-24 border-t-4 border-b-4 border-primary-500"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Trophy className="text-primary-500 animate-pulse" size={32} />
              </div>
            </div>
            <p className="mt-6 text-lg font-medium text-gray-600 dark:text-gray-300 animate-pulse">
              Loading amazing challenges...
            </p>
          </div>
        )}
        {!loading && (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-16"
          >
        {filteredChallenges.map((challenge) => (
          <motion.div
            key={challenge.id}
            variants={itemVariants}
            whileHover={{ y: -8, scale: 1.02 }}
            className="relative group"
          >
            <div className="absolute -inset-0.5 bg-gradient-to-r from-primary-500 to-purple-500 rounded-2xl opacity-0 group-hover:opacity-100 blur transition-all duration-500"></div>
            <div className="relative card p-6 cursor-pointer bg-white dark:bg-gray-800 rounded-2xl border-2 border-gray-200 dark:border-gray-700 group-hover:border-transparent transition-all duration-300">
              <div className="flex items-start justify-between mb-4">
                <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg">
                  {challenge.domain}
                </span>
                <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg capitalize">
                  {challenge.status}
                </span>
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white group-hover:text-primary-500 dark:group-hover:text-primary-400 transition-colors duration-300 line-clamp-2 min-h-[3.5rem]">
                {challenge.title}
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6 line-clamp-2 min-h-[3rem]">
                {challenge.description}
              </p>
              <div className="space-y-3 mb-6">
                <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-lg bg-green-500 flex items-center justify-center">
                      <DollarSign className="text-white" size={18} />
                    </div>
                    <span className="text-sm text-gray-600 dark:text-gray-300">Reward</span>
                  </div>
                  <span className="text-lg font-bold text-green-600 dark:text-green-400">{challenge.reward} PYUSD</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center space-x-2 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                    <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
                      <Users className="text-white" size={16} />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Joined</p>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{challenge.participants}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 p-3 rounded-xl bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
                    <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center">
                      <Clock className="text-white" size={16} />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Days Left</p>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">
                        {Math.max(0, Math.ceil((new Date(challenge.deadline) - new Date()) / (1000 * 60 * 60 * 24)))}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleJoinChallenge(challenge.id)}
                className="w-full py-3 px-4 rounded-xl font-bold text-white bg-gradient-to-r from-primary-500 via-blue-500 to-purple-500 hover:from-primary-600 hover:via-blue-600 hover:to-purple-600 shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center space-x-2 group"
              >
                <Trophy size={18} className="group-hover:rotate-12 transition-transform duration-300" />
                <span>Join Challenge</span>
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform duration-300" />
              </motion.button>
            </div>
          </motion.div>
        ))}
      </motion.div>
      )}
      {!loading && filteredChallenges.length === 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-32"
        >
          <div className="mb-6">
            <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 mb-4">
              <Search className="text-gray-400 dark:text-gray-500" size={64} />
            </div>
          </div>
          <h3 className="text-3xl font-bold mb-3 text-gray-900 dark:text-white">No Challenges Found</h3>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-6 max-w-md mx-auto">
            We couldn't find any challenges matching your criteria. Try adjusting your filters or search terms.
          </p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              setFilter('all');
              setSearchTerm('');
            }}
            className="px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 shadow-lg transition-all duration-300"
          >
            Clear All Filters
          </motion.button>
        </motion.div>
      )}
    </div>
    </div>
  );
};

export default Home;
