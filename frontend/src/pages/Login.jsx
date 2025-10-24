import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConnect, useAccount } from 'wagmi';
import { Mail, Trophy, Users, Target, Wallet } from 'lucide-react';
import { useWallet } from '../context/WalletContext';

const Login = () => {
  const navigate = useNavigate();
  const { connect, connectors, isPending } = useConnect();
  const { isConnected } = useAccount();
  const { email, saveEmail, isFullyAuthenticated } = useWallet();
  
  const [emailInput, setEmailInput] = useState('');
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);

  useEffect(() => {
    if (isFullyAuthenticated) {
      navigate('/');
    }
  }, [isFullyAuthenticated, navigate]);

  useEffect(() => {
    if (email) {
      setEmailInput(email);
      setStep(2);
    }
  }, [email]);

  const handleEmailSubmit = (e) => {
    e.preventDefault();
    
    if (!emailInput || !emailInput.trim()) {
      setError('Please enter your email address');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailInput)) {
      setError('Please enter a valid email address');
      return;
    }

    saveEmail(emailInput.trim());
    setError('');
    setStep(2);
  };

  const handleWalletConnect = async (connector) => {
    try {
      setError('');
      await connect({ connector });
    } catch (err) {
      console.error('Wallet connection error:', err);
      setError(err.message || 'Failed to connect wallet');
    }
  };

  const handleSkipWallet = () => {
    navigate('/');
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-6 py-12">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
            className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl mb-6 shadow-lg"
          >
            <Trophy className="w-10 h-10 text-white" />
          </motion.div>
          
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-500 to-primary-600 bg-clip-text text-transparent mb-3">
            Welcome to Gauntlet
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            AI-Powered Challenges with PYUSD Rewards
          </p>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card p-8"
        >
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6 text-center">
            {step === 1 ? 'Get Started' : 'Connect Your Wallet'}
          </h2>

          {step === 1 && (
            <form onSubmit={handleEmailSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-900 dark:text-gray-100">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => {
                      setEmailInput(e.target.value);
                      setError('');
                    }}
                    placeholder="your.email@example.com"
                    className="input-field pl-11"
                    autoFocus
                  />
                </div>
                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm text-red-600 dark:text-red-400 mt-2"
                  >
                    {error}
                  </motion.p>
                )}
              </div>
              <motion.button
                type="submit"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full btn-primary py-3 text-lg font-semibold"
              >
                Continue
              </motion.button>
            </form>
          )}
          {step === 2 && (
            <div className="space-y-6">
              <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                Logged in as: <span className="font-mono text-primary-600 dark:text-primary-400">{email}</span>
              </p>

              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 text-center">
                  Connect your wallet to create challenges and participate
                </p>

                <div className="space-y-3">
                  {connectors.map((connector) => (
                    <motion.button
                      key={connector.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleWalletConnect(connector)}
                      disabled={isPending}
                      className="w-full flex items-center justify-center space-x-3 px-6 py-3 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 hover:border-primary-500 dark:hover:border-primary-500 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Wallet className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                      <span className="font-semibold text-gray-900 dark:text-gray-100">
                        {connector.name}
                      </span>
                    </motion.button>
                  ))}
                </div>

                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm text-red-600 dark:text-red-400 mt-4 text-center"
                  >
                    {error}
                  </motion.p>
                )}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSkipWallet}
                  className="w-full mt-4 px-6 py-3 text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                >
                  Skip for now (Browse only)
                </motion.button>

                <p className="text-xs text-gray-500 dark:text-gray-500 text-center mt-4">
                  💡 You can connect your wallet later to create challenges or participate
                </p>
              </div>
            </div>
          )}
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8"
        >
          <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <Target className="w-8 h-8 text-primary-500 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Create Challenges
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              Post your problems
            </p>
          </div>
          <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <Users className="w-8 h-8 text-primary-500 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Participate
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              Solve challenges
            </p>
          </div>
          <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <Trophy className="w-8 h-8 text-primary-500 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Earn PYUSD
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              Win rewards
            </p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Login;
