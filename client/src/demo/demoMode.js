/*
 * PRESENTATION STUB LAYER — REMOVE WHEN THE BACKEND EXISTS.
 *
 * There is no server yet, so every /api call and the socket connection to
 * :5000 fail. Demo mode short-circuits exactly those calls so the UI can be
 * presented standalone. It fakes nothing else.
 *
 * OFF unless explicitly switched on, so a forgotten env var in a deployed
 * build fails safe (real API, real socket) instead of shipping a fake app.
 *
 * Turn it on for a standalone UI demo with VITE_DEMO_MODE=true in client/.env.
 * Vite bakes this in at build time, so changing it needs a rebuild/redeploy.
 *
 * WARNING: while this is on, login accepts ANY credentials without a server.
 */
export const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

export const DEMO_TOKEN = 'demo-token';

// The only credentials the demo login accepts, shown as a hint on the form.
export const DEMO_CREDENTIALS = {
  username: 'user',
  password: 'password',
};

export const DEMO_USER = {
  _id: 'demo-user',
  name: 'Demo User',
  email: 'demo@collabboard.app',
};

export const DEMO_MEMBERS = [
  'Dilan',
  'Samitha',
  'Buddhima',
  'Kumuditha',
  'Kavindu',
  'Nithila',
  'Sayuni',
  'Upeka',
  'Pabasari',
].map((name) => ({
  _id: `member-${name.toLowerCase()}`,
  name,
  email: `${name.toLowerCase()}@collabboard.app`,
}));
