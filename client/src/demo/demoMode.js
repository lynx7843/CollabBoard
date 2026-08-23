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

export const DEMO_USER = {
  _id: 'demo-user',
  name: 'Demo User',
  email: 'demo@collabboard.app',
};

export const DEMO_MEMBERS = [
  { _id: 'demo-user', name: 'Demo User', email: 'demo@collabboard.app' },
  { _id: '1', name: 'Sarah Connor', email: 'sarah@example.com' },
  { _id: '2', name: 'John Smith', email: 'john@example.com' },
];
