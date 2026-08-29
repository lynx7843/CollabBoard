const request = require('supertest');

const { createApp } = require('../src/app');
const env = require('../src/config/env');

const app = createApp();

const ACCOUNT = {
  username: 'sayuni',
  email: 'sayuni@collabboard.app',
  password: 'correct-horse-battery',
};

const OTHER = {
  username: 'kavindu',
  email: 'kavindu@collabboard.app',
  password: 'correct-horse-battery',
};

async function signUp(account = ACCOUNT) {
  const res = await request(app).post('/api/auth/register').send(account).expect(201);
  return res.body.token;
}

const auth = (token) => ({ Authorization: `Bearer ${token}` });
const login = (body) => request(app).post('/api/auth/login').send(body);

describe('the signed-in account', () => {
  let token;

  beforeEach(async () => {
    token = await signUp();
  });

  describe('GET /api/users/me', () => {
    it('returns the account behind the token', async () => {
      const res = await request(app).get('/api/users/me').set(auth(token)).expect(200);

      expect(res.body.user).toMatchObject({
        name: 'sayuni',
        username: 'sayuni',
        email: ACCOUNT.email,
        isAdmin: false,
      });
      expect(res.body.user.passwordHash).toBeUndefined();
    });

    it('rejects a caller with no token', async () => {
      await request(app).get('/api/users/me').expect(401);
    });
  });

  describe('PATCH /api/users/me', () => {
    it('updates the username and email, and the new username can sign in', async () => {
      const res = await request(app)
        .patch('/api/users/me')
        .set(auth(token))
        .send({ username: 'Sayuni.P', email: 'NEW@collabboard.app' })
        .expect(200);

      // The display name keeps the typed casing; the login key is lowercased.
      expect(res.body.user).toMatchObject({
        name: 'Sayuni.P',
        username: 'sayuni.p',
        email: 'new@collabboard.app',
      });

      await login({ username: 'sayuni.p', password: ACCOUNT.password }).expect(200);
      await login({ username: 'sayuni', password: ACCOUNT.password }).expect(401);
    });

    it('accepts a partial update', async () => {
      const res = await request(app)
        .patch('/api/users/me')
        .set(auth(token))
        .send({ email: 'only-email@collabboard.app' })
        .expect(200);

      expect(res.body.user.username).toBe('sayuni');
      expect(res.body.user.email).toBe('only-email@collabboard.app');
    });

    it('rejects an empty body rather than reporting a silent no-op', async () => {
      const res = await request(app).patch('/api/users/me').set(auth(token)).send({}).expect(400);
      expect(res.body.message).toBe('Nothing to update.');
    });

    it('rejects a malformed username and a malformed email', async () => {
      const res = await request(app)
        .patch('/api/users/me')
        .set(auth(token))
        .send({ username: 'no spaces', email: 'not-an-email' })
        .expect(400);

      expect(res.body.details).toEqual({
        username: expect.any(String),
        email: 'Enter a valid email address.',
      });
    });

    it('409s on a username or email another account already holds', async () => {
      await signUp(OTHER);

      const username = await request(app)
        .patch('/api/users/me')
        .set(auth(token))
        .send({ username: OTHER.username })
        .expect(409);
      expect(username.body.details.username).toBe('That username is already taken.');

      const email = await request(app)
        .patch('/api/users/me')
        .set(auth(token))
        .send({ email: OTHER.email })
        .expect(409);
      expect(email.body.details.email).toBe('An account with that email already exists.');
    });

    it('lets an account keep its own username while changing its email', async () => {
      await request(app)
        .patch('/api/users/me')
        .set(auth(token))
        .send({ username: ACCOUNT.username, email: 'same-name@collabboard.app' })
        .expect(200);
    });

    /*
     * isAdmin is derived from the username, so this is the escalation path:
     * an ordinary user renaming itself to the configured admin username.
     */
    it('refuses to hand out the admin username', async () => {
      const res = await request(app)
        .patch('/api/users/me')
        .set(auth(token))
        .send({ username: env.adminUsername })
        .expect(409);

      expect(res.body.details.username).toBe('That username is already taken.');

      const after = await request(app).get('/api/users/me').set(auth(token)).expect(200);
      expect(after.body.user.isAdmin).toBe(false);
    });

    it('rejects a caller with no token', async () => {
      await request(app).patch('/api/users/me').send({ username: 'nobody' }).expect(401);
    });
  });

  describe('PATCH /api/users/me/password', () => {
    const NEW_PASSWORD = 'a-brand-new-password';

    it('changes the password, and only the new one signs in afterwards', async () => {
      await request(app)
        .patch('/api/users/me/password')
        .set(auth(token))
        .send({ currentPassword: ACCOUNT.password, newPassword: NEW_PASSWORD })
        .expect(200);

      await login({ username: ACCOUNT.username, password: NEW_PASSWORD }).expect(200);
      await login({ username: ACCOUNT.username, password: ACCOUNT.password }).expect(401);
    });

    it('leaves the existing token usable', async () => {
      await request(app)
        .patch('/api/users/me/password')
        .set(auth(token))
        .send({ currentPassword: ACCOUNT.password, newPassword: NEW_PASSWORD })
        .expect(200);

      await request(app).get('/api/users/me').set(auth(token)).expect(200);
    });

    it('401s on a wrong current password and leaves the password alone', async () => {
      const res = await request(app)
        .patch('/api/users/me/password')
        .set(auth(token))
        .send({ currentPassword: 'not-the-password', newPassword: NEW_PASSWORD })
        .expect(401);

      expect(res.body.message).toBe('Your current password is incorrect.');
      await login({ username: ACCOUNT.username, password: ACCOUNT.password }).expect(200);
    });

    it('rejects a new password that is too short, unchanged, or mistyped twice', async () => {
      const short = await request(app)
        .patch('/api/users/me/password')
        .set(auth(token))
        .send({ currentPassword: ACCOUNT.password, newPassword: 'short' })
        .expect(400);
      expect(short.body.details.newPassword).toMatch(/at least 8/);

      const same = await request(app)
        .patch('/api/users/me/password')
        .set(auth(token))
        .send({ currentPassword: ACCOUNT.password, newPassword: ACCOUNT.password })
        .expect(400);
      expect(same.body.details.newPassword).toMatch(/different/);

      const mismatch = await request(app)
        .patch('/api/users/me/password')
        .set(auth(token))
        .send({
          currentPassword: ACCOUNT.password,
          newPassword: NEW_PASSWORD,
          confirmPassword: 'something-else',
        })
        .expect(400);
      expect(mismatch.body.details.confirmPassword).toBe('Passwords do not match.');
    });

    it('rejects a caller with no token', async () => {
      await request(app)
        .patch('/api/users/me/password')
        .send({ currentPassword: ACCOUNT.password, newPassword: NEW_PASSWORD })
        .expect(401);
    });
  });
});
