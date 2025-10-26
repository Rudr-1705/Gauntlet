import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, DollarSign, AlertCircle, CheckCircle, Loader, TrendingUp, Shield, Info } from 'lucide-react';
import { useWallet } from '../context/WalletContext';
import { challengesAPI, participantsAPI, handleApiError } from '../services/api';

const JoinChallenge = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { email, address, isFullyAuthenticated } = useWallet();
  
  const [challenge, setChallenge] = useState(null);
  const [answer, setAnswer] = useState('');
  const [stakeAmount, setStakeAmount] = useState('10'); // Default 10 PYUSD
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [txHash, setTxHash] = useState('');

  useEffect(() => {
    if (!isFullyAuthenticated) {
      navigate('/login');
      return;
    }

    const fetchChallenge = async () => {
      try {
        setLoading(true);
        const response = await challengesAPI.getById(id);
        const challengeData = response.data.challenge || response.data;
        setChallenge(challengeData);
      } catch (err) {
        console.error('Error fetching challenge:', err);
        setError(handleApiError(err));
      } finally {
        setLoading(false);
      }
    };

    fetchChallenge();
  }, [id, isFullyAuthenticated, navigate]);

  const handleJoin = async (e) => {
    e.preventDefault();
    
    if (!answer || answer.trim().length === 0) {
      setError('Please enter your answer to the challenge');
      return;
    }
    
    if (!stakeAmount || parseFloat(stakeAmount) <= 0) {
      setError('Please enter a valid stake amount greater than 0 PYUSD');
      return;
    }

    // Check if challenge is on blockchain
    if (!challenge?.chainChallengeId) {
      setError('This challenge is not yet deployed on the blockchain. Please wait for the sponsor to complete the blockchain deployment.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      // STEP 1: Stake PYUSD on blockchain FIRST
      console.log('🔗 Staking PYUSD on blockchain...', {
        chainChallengeId: challenge.chainChallengeId,
        stakeAmount: stakeAmount
      });
      
      const { fundChallenge } = await import('../services/contractService');
      
      let fundingResult;
      try {
        fundingResult = await fundChallenge(challenge.chainChallengeId, stakeAmount);
        console.log('✅ Blockchain staking successful:', fundingResult);
      } catch (blockchainError) {
        console.error('❌ Blockchain staking failed:', blockchainError);
        
        // Enhanced error messages
        if (blockchainError.message?.includes('Insufficient PYUSD')) {
          throw new Error(`You don't have enough PYUSD tokens. Required: ${stakeAmount} PYUSD. Please acquire PYUSD tokens to participate.`);
        } else if (blockchainError.code === 4001 || blockchainError.message?.includes('rejected')) {
          throw new Error('Transaction rejected. Please approve both PYUSD approval and staking transactions in MetaMask.');
        } else if (blockchainError.message?.includes('network')) {
          throw new Error('Network error. Please make sure you are connected to Sepolia testnet.');
        } else {
          throw new Error('Blockchain staking failed: ' + blockchainError.message);
        }
      }

      // STEP 2: Send to backend with blockchain tx hash
      console.log('📤 Submitting to backend with tx hash:', fundingResult.txHash);
      
      const response = await participantsAPI.join({
        userEmail: address,
        challengeId: id,
        stakeAmount: parseFloat(stakeAmount),
        walletAddress: address,
        answer: answer.trim(),
        fundingTxHash: fundingResult.txHash // Include blockchain tx hash
      });

      const { participant } = response.data;

      // Step 3: Show success
      setSuccess(true);
      setTxHash(fundingResult.txHash);
      
      console.log('✅ Participant joined successfully:', participant);
      console.log('🔗 Blockchain TX:', fundingResult.txHash);

      setTimeout(() => {
        navigate('/my-participations');
      }, 3000);

    } catch (err) {
      console.error('❌ Error joining challenge:', err);
      setError(err.message || handleApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const calculateConfidenceLevel = () => {
    if (!challenge) return 'Low';
    const amount = parseFloat(stakeAmount);
    const reward = challenge.reward;
    
    if (amount >= reward * 0.5) return 'Very High';
    if (amount >= reward * 0.3) return 'High';
    if (amount >= reward * 0.15) return 'Medium';
    return 'Low';
  };

  const calculatePotentialReturn = () => {
    if (!challenge) return 0;
    const stake = parseFloat(stakeAmount) || 0;
    const reward = challenge.reward;
    return (reward - stake).toFixed(2);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="animate-spin text-indigo-600" size={48} />
      </div>
    );
  }

  if (error && !challenge) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="text-red-600" size={24} />
          <p className="text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-green-50 border border-green-200 rounded-lg p-8 text-center"
        >
          <CheckCircle className="text-green-600 mx-auto mb-4" size={64} />
          <h2 className="text-2xl font-bold text-green-900 mb-2">
            Successfully Joined Challenge!
          </h2>
          <p className="text-green-700 mb-4">
            You've staked {stakeAmount} PYUSD on this challenge.
          </p>
          {txHash && (
            <p className="text-sm text-green-600 mb-4 font-mono">
              Transaction: {txHash.substring(0, 20)}...
            </p>
          )}
          <p className="text-green-600">Redirecting to your participations...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft size={20} />
        <span>Back</span>
      </button>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-lg shadow-lg overflow-hidden"
      >
        {/* Challenge Info Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
          <h1 className="text-3xl font-bold mb-2">{challenge?.title}</h1>
          <p className="text-indigo-100 mb-4">{challenge?.description}</p>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <DollarSign size={20} />
              <span className="text-xl font-semibold">{challenge?.reward} PYUSD Reward</span>
            </div>
            <div className="bg-white/20 px-3 py-1 rounded-full text-sm">
              {challenge?.domain}
            </div>
          </div>
        </div>

        {/* Stake Form */}
        <div className="p-6">
          <form onSubmit={handleJoin} className="space-y-6">
            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
              <Info className="text-blue-600 flex-shrink-0" size={20} />
              <div className="text-sm text-blue-800">
                <p className="font-semibold mb-1">How It Works:</p>
                <p>1. Submit your answer (it will be hashed for privacy)</p>
                <p>2. Stake PYUSD to show your confidence</p>
                <p>3. If correct, win the reward + get your stake back!</p>
              </div>
            </div>

            {/* Answer Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Answer *
              </label>
              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                placeholder="Enter your answer to this challenge..."
                rows="4"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Your answer will be securely hashed. You can prove it later if you win!
              </p>
            </div>

            {/* Stake Amount Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Stake Amount (PYUSD)
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={stakeAmount}
                  onChange={(e) => setStakeAmount(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Enter stake amount"
                  required
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Minimum stake: 0.01 PYUSD
              </p>
            </div>

            {/* Quick Stake Options */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quick Select:
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[5, 10, 25, 50].map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => setStakeAmount(amount.toString())}
                    className={`py-2 px-4 rounded-lg border-2 transition-all ${
                      parseFloat(stakeAmount) === amount
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                        : 'border-gray-200 hover:border-indigo-300'
                    }`}
                  >
                    {amount} PYUSD
                  </button>
                ))}
              </div>
            </div>

            {/* Confidence Indicator */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="text-indigo-600" size={20} />
                  <span className="font-medium text-gray-700">Confidence Level:</span>
                </div>
                <span className="text-lg font-bold text-indigo-600">
                  {calculateConfidenceLevel()}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="text-green-600" size={20} />
                  <span className="font-medium text-gray-700">Potential Return:</span>
                </div>
                <span className="text-lg font-bold text-green-600">
                  +{calculatePotentialReturn()} PYUSD
                </span>
              </div>

              <div className="text-xs text-gray-500 pt-2 border-t">
                <p>• You stake: {stakeAmount} PYUSD</p>
                <p>• Challenge reward: {challenge?.reward} PYUSD</p>
                <p>• If you win: Get back stake + reward = {(parseFloat(stakeAmount) + parseFloat(challenge?.reward || 0)).toFixed(2)} PYUSD</p>
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
                <AlertCircle className="text-red-600" size={20} />
                <p className="text-red-800">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting || !stakeAmount || !answer}
              className={`w-full py-3 rounded-lg font-semibold text-white transition-all flex items-center justify-center gap-2 ${
                submitting || !stakeAmount || !answer
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700'
              }`}
            >
              {submitting ? (
                <>
                  <Loader className="animate-spin" size={20} />
                  <span>Joining Challenge...</span>
                </>
              ) : (
                <>
                  <Shield size={20} />
                  <span>Submit Answer & Stake {stakeAmount} PYUSD</span>
                </>
              )}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default JoinChallenge;
