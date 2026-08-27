const request = require('supertest');
const jwt = require('jsonwebtoken');

const { createApp } = require('../src/app');
const User = require('../src/models/User');

const app = createApp();

const ACCOUNT = {
  name: 'Sayuni',
  email: 'sayuni@collabboard.app',
  password: 'correct-horse-battery',
};

const register = (body = ACCOUNT) => request(app).post('/api/auth/register').send(body);
const login = (body) => request(app).post('/api/auth/login').send(body);

beforeEach(async () => {
  await register();
});

describe('POST /api/auth/login', () => {
  describe('success', () => {
    it('logs in with the username and returns { token, user }', async () => {
      const res = await login({ username: 'sayuni', password: ACCOUNT.password });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        token: expect.any(String),
        user: {
          _id: expect.any(String),
          name: 'Sayuni',
          username: 'sayuni',
          email: 'sayuni@collabboard.app',
          avatarColor: expect.stringMatching(/^#[0-9A-F]{6}$/i),
          isAdmin: false,
          createdAt: expect.any(String),
        },
      });
    });

    it('accepts the email in the username field', async () => {
      const res = await login({ username: 'sayuni@collabboard.app', password: ACCOUNT.password });
      expect(res.status).toBe(200);
      expect(res.body.user.username).toBe('sayuni');
    });

    it('accepts an explicit email field', async () => {
      const res = await login({ email: 'sayuni@collabboard.app', password: ACCOUNT.password });
      expect(res.status).toBe(200);
    });

    it('is case-insensitive on username and email', async () => {
      await expect(login({ username: 'SAYUNI', password: ACCOUNT.password })).resolves.toMatchObject(
        { status: 200 },
      );
      await expect(
        login({ username: 'Sayuni@CollabBoard.app', password: ACCOUNT.password }),
      ).resolves.toMatchObject({ status: 200 });
    });

    it('ignores surrounding whitespace in the identifier', async () => {
      const res = await login({ username: '  sayuni  ', password: ACCOUNT.password });
      expect(res.status).toBe(200);
    });

    it('issues a JWT that verifies and identifies the user', async () => {
      const res = await login({ username: 'sayuni', password: ACCOUNT.password });
      const payload = jwt.verify(res.body.token, process.env.JWT_SECRET);

      expect(payload.sub).toBe(res.body.user._id);
      expect(payload.exp - payload.iat).toBe(7 * 24 * 60 * 60);
    });

    it('stamps lastLoginAt without touching it on a failed attempt', async () => {
      const before = await User.findOne({ username: 'sayuni' }).lean();
      expect(before.lastLoginAt).toBeUndefined();

      await login({ username: 'sayuni', password: 'wrong-password-here' });
      const afterFailure = await User.findOne({ username: 'sayuni' }).lean();
      expect(afterFailure.lastLoginAt).toBeUndefined();

      await login({ username: 'sayuni', password: ACCOUNT.password });
      const afterSuccess = await User.findOne({ username: 'sayuni' }).lean();
      expect(afterSuccess.lastLoginAt).toBeInstanceOf(Date);
    });

    it('never leaks passwordHash or the plaintext password', async () => {
      const res = await login({ username: 'sayuni', password: ACCOUNT.password });
      const body = JSON.stringify(res.body);

      expect(body).not.toContain('passwordHash');
      expect(body).not.toContain(ACCOUNT.password);
      expect(body).not.toContain('$2b$');
    });

    it('logs in with a password the register endpoint accepted at 72 bytes', async () => {
      const password = '密'.repeat(24);
      await register({ name: 'kavindu', email: 'kavindu@collabboard.app', password });

      const res = await login({ username: 'kavindu', password });
      expect(res.status).toBe(200);
    });
  });

  describe('rejected credentials', () => {
    it('rejects a wrong password with 401', async () => {
      const res = await login({ username: 'sayuni', password: 'not-the-password' });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Invalid username or password.');
    });

    it('rejects an unknown username with 401', async () => {
      const res = await login({ username: 'nobody', password: ACCOUNT.password });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Invalid username or password.');
    });

    it('gives a byte-identical answer for unknown user and wrong password', async () => {
      // Any difference here — message, status, extra key — tells an attacker
      // which usernames exist.
      const unknown = await login({ username: 'nobody', password: 'whatever-123' });
      const wrongPw = await login({ username: 'sayuni', password: 'whatever-123' });

      expect(unknown.status).toBe(wrongPw.status);
      expect(unknown.body).toEqual(wrongPw.body);
    });

    it('is case-sensitive on the password', async () => {
      const res = await login({ username: 'sayuni', password: ACCOUNT.password.toUpperCase() });
      expect(res.status).toBe(401);
    });

    it('does not accept the stored hash as a password', async () => {
      const stored = await User.findOne({ username: 'sayuni' }).select('+passwordHash').lean();
      const res = await login({ username: 'sayuni', password: stored.passwordHash });

      expect(res.status).toBe(401);
    });
  });

  describe('validation', () => {
    it.each([
      ['no body', {}],
      ['missing password', { username: 'sayuni' }],
      ['missing username', { password: ACCOUNT.password }],
      ['blank username', { username: '   ', password: ACCOUNT.password }],
      ['empty password', { username: 'sayuni', password: '' }],
    ])('rejects %s with 400', async (_label, body) => {
      const res = await login(body);

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/username and password are required/i);
    });

    it('refuses a query operator smuggled in as the username', async () => {
      // Without the string coercion this would match the first user in the
      // collection and hand back a token for someone else's account.
      const res = await login({ username: { $ne: null }, password: ACCOUNT.password });

      expect(res.status).toBe(400);
      expect(res.body.token).toBeUndefined();
    });

    it('refuses a query operator smuggled in as the password', async () => {
      const res = await login({ username: 'sayuni', password: { $ne: null } });

      expect(res.status).toBe(400);
      expect(res.body.token).toBeUndefined();
    });
  });

  describe('round trip', () => {
    it('logs in with an account just created through the register endpoint', async () => {
      const created = await register({
        name: 'Pabasari',
        email: 'pabasari@collabboard.app',
        password: 'another-good-password',
      });

      const loggedIn = await login({
        username: 'pabasari',
        password: 'another-good-password',
      });

      expect(loggedIn.status).toBe(200);
      expect(loggedIn.body.user._id).toBe(created.body.user._id);
      expect(loggedIn.body.user).toEqual(created.body.user);
    });
  });
});
