const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const { createApp } = require('../src/app');
const User = require('../src/models/User');

const app = createApp();

const VALID = {
  name: 'sayuni',
  email: 'Sayuni@CollabBoard.app',
  password: 'correct-horse-battery',
};

const post = (body) => request(app).post('/api/auth/register').send(body);

describe('POST /api/auth/register', () => {
  describe('success', () => {
    it('creates the account and returns { token, user }', async () => {
      const res = await post(VALID);

      expect(res.status).toBe(201);
      expect(res.body).toEqual({
        token: expect.any(String),
        user: {
          _id: expect.any(String),
          name: 'sayuni',
          username: 'sayuni',
          email: 'sayuni@collabboard.app',
          avatarColor: expect.stringMatching(/^#[0-9A-F]{6}$/i),
          isAdmin: false,
          createdAt: expect.any(String),
        },
      });
    });

    it('persists the user with a bcrypt hash, never the plaintext', async () => {
      await post(VALID);

      const stored = await User.findOne({ username: 'sayuni' }).select('+passwordHash');

      expect(stored.passwordHash).not.toBe(VALID.password);
      expect(stored.passwordHash).toMatch(/^\$2[aby]\$/);
      await expect(bcrypt.compare(VALID.password, stored.passwordHash)).resolves.toBe(true);
    });

    it('issues a JWT that verifies and identifies the new user', async () => {
      const res = await post(VALID);
      const payload = jwt.verify(res.body.token, process.env.JWT_SECRET);

      expect(payload.sub).toBe(res.body.user._id);
      expect(payload.exp - payload.iat).toBe(7 * 24 * 60 * 60);
    });

    it('lowercases the username and email but keeps the typed name', async () => {
      const res = await post({ ...VALID, name: 'SayUni.Perera' });

      expect(res.body.user.name).toBe('SayUni.Perera');
      expect(res.body.user.username).toBe('sayuni.perera');
      expect(res.body.user.email).toBe('sayuni@collabboard.app');
    });

    it('accepts an explicit `username` field, as Create_account.jsx sends', async () => {
      const res = await post({
        username: 'kavindu',
        name: 'ignored-when-username-is-present',
        email: 'kavindu@collabboard.app',
        password: VALID.password,
      });

      expect(res.status).toBe(201);
      expect(res.body.user.username).toBe('kavindu');
    });

    it('accepts a matching confirmPassword', async () => {
      const res = await post({ ...VALID, confirmPassword: VALID.password });
      expect(res.status).toBe(201);
    });

    it('never leaks passwordHash in the response body', async () => {
      const res = await post(VALID);
      expect(JSON.stringify(res.body)).not.toContain('passwordHash');
      expect(JSON.stringify(res.body)).not.toContain(VALID.password);
    });
  });

  describe('duplicates', () => {
    it('rejects a taken username with 409', async () => {
      await post(VALID);
      const res = await post({ ...VALID, email: 'someone.else@collabboard.app' });

      expect(res.status).toBe(409);
      expect(res.body.message).toMatch(/username is already taken/i);
      expect(res.body.details).toHaveProperty('username');
    });

    it('rejects a taken email with 409', async () => {
      await post(VALID);
      const res = await post({ ...VALID, name: 'different' });

      expect(res.status).toBe(409);
      expect(res.body.message).toMatch(/email already exists/i);
      expect(res.body.details).toHaveProperty('email');
    });

    it('treats usernames differing only in case as the same account', async () => {
      await post(VALID);
      const res = await post({ ...VALID, name: 'SAYUNI', email: 'other@collabboard.app' });

      expect(res.status).toBe(409);
    });

    it('treats emails differing only in case as the same account', async () => {
      await post(VALID);
      const res = await post({ ...VALID, name: 'other', email: 'SAYUNI@collabboard.app' });

      expect(res.status).toBe(409);
    });

    it('creates exactly one account when the same signup is sent concurrently', async () => {
      // Both requests can pass the pre-check, so this is the unique index and
      // the E11000 branch being exercised, not the lookup.
      const results = await Promise.all([post(VALID), post(VALID), post(VALID)]);
      const statuses = results.map((r) => r.status).sort();

      expect(statuses).toEqual([201, 409, 409]);
      await expect(User.countDocuments({ username: 'sayuni' })).resolves.toBe(1);
    });
  });

  describe('validation', () => {
    const cases = [
      ['missing username', { ...VALID, name: undefined }, /username is required/i],
      ['blank username', { ...VALID, name: '   ' }, /username is required/i],
      ['short username', { ...VALID, name: 'ab' }, /at least 3 characters/i],
      ['long username', { ...VALID, name: 'a'.repeat(31) }, /30 characters or fewer/i],
      ['illegal username character', { ...VALID, name: 'has space' }, /letters, numbers/i],
      ['missing email', { ...VALID, email: undefined }, /email is required/i],
      ['malformed email', { ...VALID, email: 'not-an-email' }, /valid email/i],
      ['missing password', { ...VALID, password: undefined }, /password is required/i],
      ['short password', { ...VALID, password: 'short12' }, /at least 8 characters/i],
      ['over-long password', { ...VALID, password: 'a'.repeat(73) }, /72 bytes or fewer/i],
      [
        'mismatched confirmPassword',
        { ...VALID, confirmPassword: 'something-else' },
        /do not match/i,
      ],
    ];

    it.each(cases)('rejects %s with 400', async (_label, body, expected) => {
      const res = await post(body);

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(expected);
      await expect(User.countDocuments({})).resolves.toBe(0);
    });

    it('names every offending field in details', async () => {
      const res = await post({});

      expect(res.status).toBe(400);
      expect(res.body.details).toEqual({
        username: expect.any(String),
        email: expect.any(String),
        password: expect.any(String),
      });
      expect(res.body.message).toMatch(/correct the highlighted fields/i);
    });

    it('rejects a non-string password rather than coercing it', async () => {
      const res = await post({ ...VALID, password: { $ne: null } });
      expect(res.status).toBe(400);
    });

    it('rejects an email longer than 254 characters', async () => {
      const res = await post({ ...VALID, email: `${'a'.repeat(250)}@x.co` });
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/254 characters or fewer/i);
    });

    it('counts password length in bytes, so multi-byte characters are not truncated', async () => {
      // 24 x 3-byte characters = 72 bytes exactly: allowed.
      const res = await post({ ...VALID, password: '密'.repeat(24) });
      expect(res.status).toBe(201);

      // 25 would be 75 bytes, past what bcrypt hashes.
      const tooLong = await post({
        ...VALID,
        name: 'other',
        email: 'other@collabboard.app',
        password: '密'.repeat(25),
      });
      expect(tooLong.status).toBe(400);
    });
  });

  describe('response shape', () => {
    it('always answers JSON with a message the form can render', async () => {
      const res = await post({});
      expect(res.headers['content-type']).toMatch(/application\/json/);
      expect(typeof res.body.message).toBe('string');
    });

    it('answers unknown /api routes with JSON, not an HTML 404', async () => {
      const res = await request(app).get('/api/nope');

      expect(res.status).toBe(404);
      expect(res.headers['content-type']).toMatch(/application\/json/);
      expect(res.body.message).toMatch(/no route/i);
    });
  });
});

describe('GET /api/health', () => {
  it('reports ok and the database state', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.db).toBe('connected');
  });
});
