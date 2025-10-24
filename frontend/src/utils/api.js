import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4444/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Challenge APIs
export const challengeAPI = {
  getAll: () => api.get('/challenges/live'),
  getMy: (creatorEmail) => api.get(`/challenges/my/${creatorEmail}`),
  create: (data) => api.post('/challenges/propose', data),
  updateStatus: (id, status) => api.patch(`/challenges/status/${id}`, { status }),
};

// Participant APIs
export const participantAPI = {
  join: (data) => api.post('/participants/join', data),
  submit: (data) => api.post('/participants/submit', data),
  getByChallenge: (challengeId) => api.get(`/participants/challenge/${challengeId}`),
  getByUser: (userId) => api.get(`/participants/user/${userId}`),
};

// Dashboard APIs
export const dashboardAPI = {
  getOverview: () => api.get('/dashboard/overview'),
  getChallenge: (challengeId) => api.get(`/dashboard/challenge/${challengeId}`),
  getUser: (userId) => api.get(`/dashboard/user/${userId}`),
};

export default api;
