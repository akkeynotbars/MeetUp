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
  : 'https://YOUR_RAILWAY_OR_RENDER_URL/api'; // ← replace this before deploying
