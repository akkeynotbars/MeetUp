// MeetUp backend entry point.
// Run: npm start (or `npm run dev` for hot reload)

require('dotenv').config();

const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// ---- Middleware ----
app.use(cors());           // Allow the frontend (different port/origin) to call us
app.use(express.json());   // Parse JSON request bodies

// ---- Health check ----
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the MeetUp Backend API!', status: 'ok' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ---- Routes ----
app.use('/api/auth', authRoutes);
// (more routers will be mounted here as Week 3+ features come online)
// app.use('/api/jobs', jobsRoutes);
// app.use('/api/applications', applicationsRoutes);
// ...

// ---- 404 fallback ----
app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
});

// ---- Error handler (catches anything we forgot to handle) ----
// Must be last. Express recognizes 4-arg functions as error handlers.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[unhandled]', err);
  res.status(500).json({ error: 'Unexpected server error.' });
});

app.listen(PORT, () => {
  console.log(`🚀 MeetUp backend running on http://localhost:${PORT}`);
});
