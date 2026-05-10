// =====================
// API BASE URL CONFIG
// Change this to your deployed backend URL when going live
// e.g. 'https://meetup-backend.railway.app/api'
// =====================
const API_BASE_URL = (
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1' ||
  window.location.hostname === '' // file:// opened directly
) ? 'http://localhost:3000/api'
  : 'https://meetup-production-9287.up.railway.app/api';
