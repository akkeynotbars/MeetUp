// Supabase client (singleton).
// Used by every route/middleware that needs to talk to the database.

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    '[supabase] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env. ' +
    'Copy backend/.env.example to backend/.env and fill in the values from Min.'
  );
}

// Service-role key bypasses Row Level Security — it's the backend's key.
// Never expose this key to the browser.
const supabase = createClient(
  SUPABASE_URL || 'https://placeholder.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY || 'placeholder_key',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

module.exports = supabase;
