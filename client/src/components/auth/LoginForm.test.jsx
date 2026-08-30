import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import LoginForm from './LoginForm';
import { AuthContext } from '../../context/AuthContext';

/*
 * The login form's job on failure is to show what the server said, not a
 * generic message — the API writes every `message` to be shown to a person
 * (see the server's errorHandler), and swallowing it is how "Invalid username
 * or password" becomes "Something went wrong".
 */
const loginSession = vi.fn();

const renderForm = () =>
  render(
    <MemoryRouter>
      <AuthContext.Provider value={{ loginSession, user: null }}>
        <LoginForm />
      </AuthContext.Provider>
    </MemoryRouter>,
  );

const respondWith = (status, body) =>
  vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });

const signIn = async (username = 'dilan_amantha', password = 'wrong-password') => {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText(/username/i), username);
  await user.type(screen.getByLabelText(/^password$/i), password);
  await user.click(screen.getByRole('button', { name: /log in/i }));
};

beforeEach(() => {
  loginSession.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('LoginForm', () => {
  it("shows the server's own message when the credentials are refused", async () => {
    respondWith(401, { message: 'Invalid username or password.' });
    renderForm();

    await signIn();

    expect(await screen.findByText('Invalid username or password.')).toBeInTheDocument();
    expect(loginSession).not.toHaveBeenCalled();
  });

  it('shows the rate limiter\'s message rather than a generic failure', async () => {
    respondWith(429, { message: 'Too many login attempts. Try again in a few minutes.' });
    renderForm();

    await signIn();

    expect(await screen.findByText(/too many login attempts/i)).toBeInTheDocument();
  });

  it('falls back to a readable message when the response carries none', async () => {
    respondWith(500, {});
    renderForm();

    await signIn();

    expect(await screen.findByText(/invalid username or password/i)).toBeInTheDocument();
  });

  it('opens the session with the token and user the server returned', async () => {
    const user = { _id: 'u1', username: 'dilan_amantha' };
    respondWith(200, { token: 'a.b.c', user });
    renderForm();

    await signIn('dilan_amantha', 'correct-horse-battery');

    await waitFor(() => expect(loginSession).toHaveBeenCalledWith('a.b.c', user));
  });

  /*
   * The test-account shortcut is real, working credentials for the account
   * ADMIN_USERNAME points at, so it must never reach a deployed build. It is
   * gated on import.meta.env.DEV, which is true under the test runner as it is
   * in development — stubbing it is how the built behaviour gets asserted.
   */
  describe('the test-account hint', () => {
    it('is offered while developing', () => {
      renderForm();
      expect(screen.getByText(/test account/i)).toBeInTheDocument();
    });

    it('is gone from a production build', () => {
      vi.stubEnv('DEV', false);
      renderForm();

      expect(screen.queryByText(/test account/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/password123/)).not.toBeInTheDocument();

      vi.unstubAllEnvs();
    });
  });
});
