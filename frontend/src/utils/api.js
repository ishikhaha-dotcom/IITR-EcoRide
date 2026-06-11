// ─── Axios API Instance ───────────────────────────────────────────────
// Centralised HTTP client. Automatically attaches the JWT from
// localStorage to every outgoing request.
// ─────────────────────────────────────────────────────────────────────

import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  headers: { 'Content-Type': 'application/json' },
});

// Inject JWT before every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('crToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Global 401 handler — clear stale tokens
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('crToken');
      localStorage.removeItem('crUser');
    }
    return Promise.reject(err);
  },
);

export default api;
