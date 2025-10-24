import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, AlertCircle, CheckCircle, Loader, Lock, Eye, EyeOff, Hash, Info } from 'lucide-react';
import { useWallet } from '../context/WalletContext';
import { challengesAPI, submissionsAPI, participantsAPI, handleApiError } from '../services/api';
import { generateSHA256Hash } from '../utils/hashUtils';
import { pollSubmissionStatus, getEventMessage } from '../utils/eventPolling';

const SubmitAnswer = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { email, address, isFullyAuthenticated } = useWallet();
  
  const [challenge, setChallenge] = useState(null);
  const [participant, setParticipant] = useState(null);
  const [answer, setAnswer] = useState('');
  const [showAnswer, setShowAnswer] = useState(false);
  const [answerHash, setAnswerHash] = useState('');
  const [proofURI, setProofURI] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [submissionResult, setSubmissionResult] = useState(null);
  const [verificationStatus, setVerificationStatus] = useState('pending'); // pending, verifying, verified, rejected
  const [events, setEvents] = useState([]);
  const [isWinner, setIsWinner] = useState(false);

  useEffect(() => {
    if (!isFullyAuthenticated) {
      navigate('/login');
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch challenge
        const challengeResponse = await challengesAPI.getById(id);
        const challengeData = challengeResponse.data.challenge || challengeResponse.data;
        setChallenge(challengeData);

        // Check if user has joined this challenge
        const participantsResponse = await participantsAPI.getByUserId(email);
        const userParticipations = participantsResponse.data.participants || participantsResponse.data.records || [];
        
        const participation = userParticipations.find(p => p.challengeId === id);
        
        if (!participation) {
          setError('You must join this challenge before submitting an answer.');
          return;
        }

        setParticipant(participation);

        // Check if already submitted
        if (participation.hasSubmitted || participation.submissionCount > 0) {
          setError('You have already submitted an answer for this challenge.');
        }

      } catch (err) {
        console.error('Error fetching data:', err);
        setError(handleApiError(err));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, email, isFullyAuthenticated, navigate]);

  // Generate hash whenever answer changes
  useEffect(() => {
    const generateHash = async () => {
      if (answer.trim()) {
        const hash = await generateSHA256Hash(answer.trim());
        setAnswerHash(hash);
      } else {
        setAnswerHash('');
      }
    };
    
    generateHash();
  }, [answer]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!answer.trim()) {
      setError('Please enter your answer');
      return;
    }

    if (!participant) {
      setError('Participant record not found');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      // Submit answer to backend
      const response = await submissionsAPI.submit({
        challengeId: id,
        participantEmail: email,
        answer: answer.trim(),
        proofURI: proofURI || undefined
      });

      const { submission, result, nextSteps } = response.data;
      
      setSuccess(true);
      setSubmissionResult(submission);

      // Smart contract returns result immediately
      if (result && result.isCorrect !== undefined) {
        setVerificationStatus(result.isCorrect ? 'verified' : 'rejected');
      } else {
        setVerificationStatus('verifying');
      }

      console.log('Submission created:', submission);
      console.log('Verification result:', result);
      console.log('Next steps:', nextSteps);

      // Start polling for additional events (challenge completion, winner announcement)
      const stopPolling = pollSubmissionStatus(
        submission.id,
        (statusData) => {
          console.log('Status update:', statusData);
          
          // Update events
          if (statusData.events && statusData.events.length > 0) {
            setEvents(statusData.events);
            
            // Check if challenge is completed
            const completedEvent = statusData.events.find(e => e.eventType === 'CHALLENGE_COMPLETED');
            if (completedEvent) {
              console.log('Challenge completed!', completedEvent);
            }
            
            // Check if user won (PYUSD transferred)
            const winnerEvent = statusData.events.find(e => 
              e.eventType === 'WINNER_FOUND' && 
              e.eventData?.participantEmail === email
            );
            if (winnerEvent) {
              setIsWinner(true);
              console.log('🏆 Winner! PYUSD transferred:', winnerEvent.eventData);
            }
          }
          
          // Update verification status from polling
          if (statusData.submission.status === 'VERIFIED') {
            setVerificationStatus('verified');
          } else if (statusData.submission.status === 'REJECTED') {
            setVerificationStatus('rejected');
          }
        },
        {
          onError: (err) => {
            console.error('Polling error:', err);
          }
        }
      );

      // Clean up polling when component unmounts
      return () => stopPolling();

    } catch (err) {
      console.error('Error submitting answer:', err);
      setError(handleApiError(err));
    } finally {
      setSubmitting(false);
    }
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
        <button
          onClick={() => navigate(`/challenge/${id}`)}
          className="mt-4 text-indigo-600 hover:text-indigo-800 flex items-center gap-2"
        >
          <ArrowLeft size={20} />
          Back to Challenge
        </button>
      </div>
    );
  }

  if (success) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white border border-gray-200 rounded-lg p-8"
        >
          {/* Submission Success Header */}
          <div className="text-center mb-6">
            <CheckCircle className="text-green-600 mx-auto mb-4" size={64} />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Answer Submitted Successfully!
            </h2>
            <p className="text-gray-600">
              Your answer has been hashed and submitted for validation.
            </p>
          </div>

          {/* Submission Details */}
          {submissionResult && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-sm font-medium text-gray-700 mb-3">Submission Details:</p>
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <Hash className="text-gray-400 mt-0.5" size={16} />
                  <div className="flex-1">
                    <p className="text-xs text-gray-500">Answer Hash:</p>
                    <p className="text-xs font-mono text-gray-800 break-all">
                      {submissionResult.answerHash}
                    </p>
                  </div>
                </div>
                {submissionResult.validatorTxHash && (
                  <div className="flex items-start gap-2">
                    <CheckCircle className="text-gray-400 mt-0.5" size={16} />
                    <div className="flex-1">
                      <p className="text-xs text-gray-500">Validator TX:</p>
                      <p className="text-xs font-mono text-gray-800 break-all">
                        {submissionResult.validatorTxHash}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Verification Status */}
          <div className="border border-gray-200 rounded-lg p-6 mb-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Loader className={verificationStatus === 'verifying' ? 'animate-spin' : ''} size={20} />
              Verification Status
            </h3>
            
            <div className="space-y-3">
              {/* Status Indicator */}
              <div className="flex items-center gap-3">
                {verificationStatus === 'pending' || verificationStatus === 'verifying' ? (
                  <>
                    <Loader className="animate-spin text-blue-600" size={24} />
                    <p className="text-gray-700">Verifying your answer with validators...</p>
                  </>
                ) : verificationStatus === 'verified' ? (
                  <>
                    <CheckCircle className="text-green-600" size={24} />
                    <p className="text-green-700 font-medium">✅ Your answer is CORRECT!</p>
                  </>
                ) : verificationStatus === 'rejected' ? (
                  <>
                    <AlertCircle className="text-red-600" size={24} />
                    <p className="text-red-700 font-medium">❌ Your answer was incorrect</p>
                  </>
                ) : null}
              </div>

              {/* Winner Status */}
              {isWinner && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-300 rounded-lg p-4 mt-4"
                >
                  <p className="text-lg font-bold text-yellow-900 mb-1">
                    🏆 Congratulations! You're a Winner!
                  </p>
                  <p className="text-sm text-yellow-800">
                    Your reward will be distributed shortly.
                  </p>
                </motion.div>
              )}
            </div>
          </div>

          {/* Events Timeline */}
          {events.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">Event Timeline:</h3>
              <div className="space-y-2">
                {events.map((event, index) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-start gap-3 text-sm"
                  >
                    <div className="w-2 h-2 rounded-full bg-indigo-600 mt-1.5"></div>
                    <div>
                      <p className="text-gray-700">{getEventMessage(event)}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(event.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/my-participations')}
              className="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition"
            >
              View My Participations
            </button>
            <button
              onClick={() => navigate('/')}
              className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition"
            >
              Explore Challenges
            </button>
          </div>
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
        {/* Challenge Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6 text-white">
          <h1 className="text-3xl font-bold mb-2">{challenge?.title}</h1>
          <p className="text-purple-100 mb-4">{challenge?.description}</p>
          <div className="flex items-center gap-6">
            <div className="bg-white/20 px-3 py-1 rounded-full text-sm">
              {challenge?.domain}
            </div>
            {participant && (
              <div className="flex items-center gap-2">
                <Lock size={16} />
                <span className="text-sm">Staked: {participant.stakeAmount} PYUSD</span>
              </div>
            )}
          </div>
        </div>

        {/* Submit Form */}
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
              <Info className="text-blue-600 flex-shrink-0" size={20} />
              <div className="text-sm text-blue-800">
                <p className="font-semibold mb-1">How Answer Submission Works:</p>
                <p>Your answer will be hashed using SHA-256 for security. The hash is compared with the correct answer hash. You'll know immediately if you got it right!</p>
              </div>
            </div>

            {/* Judging Criteria (if available) */}
            {challenge?.judgingCriteria && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h3 className="font-semibold text-purple-900 mb-2">Judging Criteria:</h3>
                <p className="text-purple-800 text-sm">{challenge.judgingCriteria}</p>
              </div>
            )}

            {/* Answer Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Answer
              </label>
              <div className="relative">
                <textarea
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  rows={6}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                  placeholder="Enter your answer here..."
                  required
                  disabled={submitting}
                />
                <button
                  type="button"
                  onClick={() => setShowAnswer(!showAnswer)}
                  className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
                  title={showAnswer ? 'Hide answer' : 'Show answer'}
                >
                  {showAnswer ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {!showAnswer && answer && (
                <p className="text-xs text-gray-500 mt-1">
                  Answer hidden for security
                </p>
              )}
            </div>

            {/* Answer Hash Preview */}
            {answerHash && (
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2 mb-2">
                  <Hash className="text-purple-600" size={20} />
                  <span className="font-medium text-gray-700">Answer Hash Preview:</span>
                </div>
                <div className="bg-white rounded p-3 font-mono text-xs break-all text-gray-800 border border-gray-200">
                  {answerHash}
                </div>
                <p className="text-xs text-gray-500">
                  This hash will be compared with the correct answer hash. Your actual answer is never stored.
                </p>
              </div>
            )}

            {/* Proof URI (Optional) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Proof URI (Optional)
              </label>
              <input
                type="text"
                value={proofURI}
                onChange={(e) => setProofURI(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="ipfs://... or https://..."
                disabled={submitting}
              />
              <p className="text-xs text-gray-500 mt-1">
                Optional: Link to additional proof or documentation (IPFS, GitHub, etc.)
              </p>
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
              disabled={submitting || !answer.trim() || !!error}
              className={`w-full py-3 rounded-lg font-semibold text-white transition-all flex items-center justify-center gap-2 ${
                submitting || !answer.trim() || !!error
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700'
              }`}
            >
              {submitting ? (
                <>
                  <Loader className="animate-spin" size={20} />
                  <span>Submitting Answer...</span>
                </>
              ) : (
                <>
                  <Send size={20} />
                  <span>Submit Answer</span>
                </>
              )}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default SubmitAnswer;
