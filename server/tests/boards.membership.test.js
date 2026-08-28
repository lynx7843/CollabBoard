const request = require('supertest');

const { createApp } = require('../src/app');
const env = require('../src/config/env');

const app = createApp();

// The admin username is read from the environment, so the privileged account in
// these tests registers under whatever that is set to.
const ADMIN = {
  username: env.adminUsername,
  email: 'admin@collabboard.app',
  password: 'correct-horse-battery',
};

const INVITEE = {
  username: 'sayuni',
  email: 'sayuni@collabboard.app',
  password: 'correct-horse-battery',
};

const OUTSIDER = {
  username: 'kavindu',
  email: 'kavindu@collabboard.app',
  password: 'correct-horse-battery',
};

// Registers the account and returns its bearer token.
async function signUp(account) {
  const res = await request(app).post('/api/auth/register').send(account).expect(201);
  return res.body.token;
}

const auth = (token) => ({ Authorization: `Bearer ${token}` });

describe('board membership', () => {
  let adminToken;
  let inviteeToken;
  let board;

  beforeEach(async () => {
    adminToken = await signUp(ADMIN);
    inviteeToken = await signUp(INVITEE);

    const res = await request(app)
      .post('/api/boards')
      .set(auth(adminToken))
      .send({ name: 'Q3 Roadmap', description: 'Everything shipping this quarter' })
      .expect(201);

    board = res.body.board;
  });

  it('does not show the board to someone who was never invited', async () => {
    const res = await request(app).get('/api/boards').set(auth(inviteeToken)).expect(200);

    expect(res.body.boards).toEqual([]);
  });

  /*
   * The point of the invite: the board the admin created has to appear on the
   * invitee's own boards page the next time they sign in, under their own
   * credentials rather than a shared session.
   */
  it('shows the board to an invited member when they sign in', async () => {
    await request(app)
      .post(`/api/boards/${board.slug}/members`)
      .set(auth(adminToken))
      .send({ email: INVITEE.email })
      .expect(201);

    // A fresh login, so this proves the membership is read from the database
    // and not carried over in the token minted before the invite.
    const { body: session } = await request(app)
      .post('/api/auth/login')
      .send({ username: INVITEE.username, password: INVITEE.password })
      .expect(200);

    const res = await request(app).get('/api/boards').set(auth(session.token)).expect(200);

    expect(res.body.boards).toHaveLength(1);
    expect(res.body.boards[0]).toMatchObject({
      slug: board.slug,
      name: 'Q3 Roadmap',
      description: 'Everything shipping this quarter',
      memberCount: 2,
    });
    // Only the admin may create boards, however many they can see.
    expect(res.body.canCreate).toBe(false);
  });

  it('lets an invited member open the board and its tasks', async () => {
    await request(app)
      .post(`/api/boards/${board.slug}/members`)
      .set(auth(adminToken))
      .send({ email: INVITEE.email })
      .expect(201);

    await request(app).get(`/api/boards/${board.slug}/tasks`).set(auth(inviteeToken)).expect(200);

    const members = await request(app)
      .get(`/api/boards/${board.slug}/members`)
      .set(auth(inviteeToken))
      .expect(200);

    expect(members.body.members.map((m) => m.email).sort()).toEqual(
      [ADMIN.email, INVITEE.email].sort(),
    );
  });

  it('hides the board again once the member is removed', async () => {
    const { body: added } = await request(app)
      .post(`/api/boards/${board.slug}/members`)
      .set(auth(adminToken))
      .send({ email: INVITEE.email })
      .expect(201);

    await request(app)
      .delete(`/api/boards/${board.slug}/members/${added.user._id}`)
      .set(auth(adminToken))
      .expect(200);

    const res = await request(app).get('/api/boards').set(auth(inviteeToken)).expect(200);

    expect(res.body.boards).toEqual([]);
  });

  it('keeps a non-member out of the board entirely', async () => {
    const outsiderToken = await signUp(OUTSIDER);

    // 404 rather than 403 — that a board exists is itself not their business.
    await request(app)
      .get(`/api/boards/${board.slug}/members`)
      .set(auth(outsiderToken))
      .expect(404);
  });
});
