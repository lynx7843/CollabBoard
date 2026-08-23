/*
 * PRESENTATION STUB LAYER — REMOVE WHEN THE BACKEND EXISTS.
 *
 * There is no server yet, so every /api call and the socket connection to
 * :5000 fail. Demo mode short-circuits exactly those calls so the UI can be
 * presented standalone. It fakes nothing else.
 *
 * Turn it off with either:
 *   - VITE_DEMO_MODE=false in client/.env, or
 *   - flip the default below to `=== 'true'`
 *
 * WARNING: while this is on, login accepts ANY credentials without a server.
 */
export const DEMO_MODE = import.meta.env.VITE_DEMO_MODE !== 'false';

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
