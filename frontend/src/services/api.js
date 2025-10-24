import axios from 'axios';

// Backend API base URL
const API_BASE_URL = 'http://localhost:4444/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Challenges API
export const challengesAPI = {
  // NEW: Create challenge with hash-based validation
  create: (challengeData) => api.post('/challenges/create', challengeData),
  
  // LEGACY: Get all live/funded challenges
  getLive: () => api.get('/challenges/live'),
  
  // NEW: Get all challenges with filters
  getAll: (filters = {}) => {
    const params = new URLSearchParams(filters).toString();
    return api.get(`/challenges${params ? '?' + params : ''}`);
  },
  
  // Get challenge by ID
  getById: (id) => api.get(`/challenges/${id}`),
  
  // LEGACY: Create/propose a new challenge (old format)
  propose: (challengeData) => api.post('/challenges/propose', challengeData),
  
  // Get challenges by creator email
  getByCreator: (creatorEmail) => api.get(`/challenges/creator/${creatorEmail}`),
  
  // Confirm blockchain transaction
  confirmBlockchain: (id, data) => api.patch(`/challenges/${id}/blockchain-confirm`, data),
  
  // Update challenge status
  updateStatus: (id, data) => api.patch(`/challenges/status/${id}`, data),
  
  // Get blockchain events for a challenge
  getEvents: (id) => api.get(`/challenges/${id}/events`),
};

// Participants API
export const participantsAPI = {
  // NEW: Join a challenge with PYUSD staking
  join: (joinData) => api.post('/participants/join', joinData),
  
  // Confirm stake transaction
  confirmStake: (participantId, txHash) => api.patch(`/participants/${participantId}/confirm-stake`, { txHash }),
  
  // LEGACY: Submit answer (old format, kept for backwards compatibility)
  submit: (submissionData) => api.post('/participants/submit', submissionData),
  
  // Get participants for a challenge
  getByChallengeId: (challengeId) => api.get(`/participants/challenge/${challengeId}`),
  
  // Get participant's submissions by user email
  getByUserId: (userId) => api.get(`/participants/user/${userId}`),
  
  // Get specific participant
  getById: (participantId) => api.get(`/participants/${participantId}`),
  
  // Verify participant (validator DAO)
  verify: (participantId, data) => api.patch(`/participants/${participantId}/verify`, data),
};

// Submissions API (NEW - hash-based answer validation)
export const submissionsAPI = {
  // Submit answer with hash validation
  submit: (submissionData) => api.post('/submissions/submit', submissionData),
  
  // Get all submissions for a challenge (creator only)
  getByChallenge: (challengeId, creatorEmail) => {
    return api.get(`/submissions/challenge/${challengeId}`, {
      params: { creatorEmail }
    });
  },
  
  // Get submissions by participant
  getByParticipant: (participantId) => api.get(`/submissions/participant/${participantId}`),
  
  // Get all submissions by user email
  getByUser: (userEmail) => api.get(`/submissions/user/${userEmail}`),
  
  // Get specific submission
  getById: (submissionId) => api.get(`/submissions/${submissionId}`),
  
  // Update submission status (validator DAO)
  updateStatus: (submissionId, data) => api.patch(`/submissions/${submissionId}/status`, data),
  
  // NEW: Get submission status with events (for polling)
  getStatus: (submissionId) => api.get(`/submissions/status/${submissionId}`),
  
  // NEW: Get challenge events (for polling)
  getEvents: (challengeId, eventTypes = null) => {
    const params = eventTypes ? { types: eventTypes.join(',') } : {};
    return api.get(`/submissions/events/${challengeId}`, { params });
  },
  
  // NEW: Manually verify submission (for testing)
  verify: (submissionId) => api.post(`/submissions/verify/${submissionId}`),
};

// Dashboard API
export const dashboardAPI = {
  // Get platform statistics
  getStats: () => api.get('/dashboard/overview'),
  
  // Get challenge details
  getChallengeDetails: (challengeId) => api.get(`/dashboard/challenge/${challengeId}`),
  
  // Get user details
  getUserDetails: (userId) => api.get(`/dashboard/user/${userId}`),
};

// Error handler helper
export const handleApiError = (error) => {
  if (error.response) {
    // Server responded with error status
    console.error('API Error:', error.response.data);
    return error.response.data.error || 'An error occurred';
  } else if (error.request) {
    // Request made but no response
    console.error('Network Error:', error.request);
    return 'Network error. Please check your connection.';
  } else {
    // Something else happened
    console.error('Error:', error.message);
    return error.message;
  }
};

export default api;
