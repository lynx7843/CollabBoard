import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';
import { AuthContext } from './context/AuthContext';

/*
 * Which page the app opens on.
 *
 * The entry point is the login screen, not the dashboard: a token in
 * localStorage has been checked by nothing at that point, and the boards page
 * it used to open straight into renders as an empty board while the API — a
 * free tier that sleeps — spends ~30 seconds waking up. A stored session is
 * still honoured on the routes themselves, so a shared /boards link is not
 * broken by this; only the redirect from "/" changed.
 *
 * The board page's own dependencies are stubbed: this is a test of the route
 * table, and it should not need a server, a socket or a queue to say which
 * component a URL resolves to.
 */
vi.mock('./hooks/useBoards', () => ({
  useBoards: () => ({
    boards: [], canCreate: false, maxBoards: 5, loading: false, error: '',
    refresh: vi.fn(), createBoard: vi.fn(), deleteBoard: vi.fn(),
  }),
}));

vi.mock('./utils/hooks/useBoardPersistence', () => ({
  useBoardPersistence: () => ({
    conflict: null, resolveConflict: vi.fn(), submitAction: vi.fn(),
    isOnline: true, isSyncing: false, message: '', pendingCount: 0, revision: 0,
  }),
}));

const SIGNED_IN = { user: { _id: 'u1', username: 'dilan_amantha' }, loading: false };
const SIGNED_OUT = { user: null, loading: false };

const renderAt = (path, auth) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <AuthContext.Provider value={{ ...auth, loginSession: vi.fn(), logout: vi.fn() }}>
        <App />
      </AuthContext.Provider>
    </MemoryRouter>,
  );

const loginScreen = () => screen.queryByRole('heading', { name: /^log in$/i });

describe('App routing', () => {
  it('opens the login screen at the root', () => {
    renderAt('/', SIGNED_OUT);
    expect(loginScreen()).toBeInTheDocument();
  });

  it('opens the login screen at the root even with a stored session', () => {
    renderAt('/', SIGNED_IN);
    expect(loginScreen()).toBeInTheDocument();
  });

  it('sends a signed-out visitor at a board URL to the login screen', () => {
    renderAt('/boards/group-13', SIGNED_OUT);
    expect(loginScreen()).toBeInTheDocument();
  });

  it('still opens a board link with a stored session', () => {
    renderAt('/boards/group-13', SIGNED_IN);
    expect(loginScreen()).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /log out/i })).toBeInTheDocument();
  });
});
