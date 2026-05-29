/* Public Supabase anon configuration. Keep this file public-only: never put service-role keys here. */
// Public Supabase client configuration.
// This keeps the same project URL and anon key as the uploaded working version.
window.__WORKSPACE_SUPABASE_URL__ = 'https://mqvohqvpygenijdivkzn.supabase.co';
window.__WORKSPACE_SUPABASE_KEY__ = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xdm9ocXZweWdlbmlqZGl2a3puIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyMTc1NTksImV4cCI6MjA5Mjc5MzU1OX0.9j6zZcU5_R4cy5wX_TNIkrNKvhaIyeADe8JrII0xGYo';

try {
  localStorage.setItem('pt_workspace_supabase_cfg_v2', JSON.stringify({
    url: window.__WORKSPACE_SUPABASE_URL__,
    key: window.__WORKSPACE_SUPABASE_KEY__,
    saved_at: new Date().toISOString(),
    source: 'bundled-pro'
  }));
} catch (error) {
  console.warn('Supabase config was not persisted to localStorage', error);
}
