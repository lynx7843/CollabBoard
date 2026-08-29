const request = require('supertest');

const { createApp } = require('../src/app');
const env = require('../src/config/env');

const app = createApp();

const ADMIN = {
  username: env.adminUsername,
  email: 'admin@collabboard.app',
  password: 'correct-horse-battery',
};

const OUTSIDER = {
  username: 'kavindu',
  email: 'kavindu@collabboard.app',
  password: 'correct-horse-battery',
};

async function signUp(account) {
  const res = await request(app).post('/api/auth/register').send(account).expect(201);
  return res.body.token;
}

const auth = (token) => ({ Authorization: `Bearer ${token}` });

const search = (token, q) =>
  request(app).get('/api/boards/search').query({ q }).set(auth(token));

describe('GET /api/boards/search', () => {
  let adminToken;
  let first;
  let second;

  async function createBoard(token, name) {
    const res = await request(app).post('/api/boards').set(auth(token)).send({ name }).expect(201);
    return res.body.board;
  }

  async function createTask(token, slug, title) {
    await request(app)
      .post(`/api/boards/${slug}/tasks`)
      .set(auth(token))
      .send({ title })
      .expect(201);
  }

  beforeEach(async () => {
    adminToken = await signUp(ADMIN);
    // Created in this order, so `first` is the older of the two and is what
    // "the first board" has to resolve to below.
    first = await createBoard(adminToken, 'Q3 Roadmap');
    second = await createBoard(adminToken, 'Design System');
  });

  it('opens the board whose name matches', async () => {
    const res = await search(adminToken, 'design').expect(200);

    expect(res.body.board.slug).toBe(second.slug);
    expect(res.body.match).toEqual({ type: 'board', title: 'Design System' });
  });

  it('matches a board name on a partial, case-insensitive fragment', async () => {
    const res = await search(adminToken, 'ROADM').expect(200);
    expect(res.body.board.slug).toBe(first.slug);
  });

  it('opens the board holding the matching task', async () => {
    await createTask(adminToken, second.slug, 'Audit the colour tokens');

    const res = await search(adminToken, 'colour tokens').expect(200);

    expect(res.body.board.slug).toBe(second.slug);
    expect(res.body.match).toEqual({ type: 'task', title: 'Audit the colour tokens' });
  });

  /*
   * The tie-break the search bar is specified by: the same task title on two
   * boards opens the older board, matching the order the tab strip lists them.
   */
  it('opens the first board when two boards share a task title', async () => {
    await createTask(adminToken, second.slug, 'Write the release notes');
    await createTask(adminToken, first.slug, 'Write the release notes');

    const res = await search(adminToken, 'release notes').expect(200);

    expect(res.body.board.slug).toBe(first.slug);
  });

  it('prefers a board name over a task title that also matches', async () => {
    await createTask(adminToken, second.slug, 'Q3 Roadmap review');

    const res = await search(adminToken, 'Q3 Roadmap').expect(200);

    expect(res.body.board.slug).toBe(first.slug);
    expect(res.body.match.type).toBe('board');
  });

  it('404s when nothing matches', async () => {
    const res = await search(adminToken, 'nothing here').expect(404);
    expect(res.body.message).toBe('No board or task matches that search.');
  });

  it('400s on an empty query', async () => {
    const res = await search(adminToken, '   ').expect(400);
    expect(res.body.message).toBe('Type something to search for.');
  });

  it('treats regex metacharacters as literal text', async () => {
    await createBoard(adminToken, 'Costs (2026)');

    await search(adminToken, '(2026)').expect(200);
    // A '.' must not match any character, or this would find a board.
    await search(adminToken, 'Q. Roadmap').expect(404);
  });

  /*
   * The result names a board, so a hit on one the caller cannot open would
   * disclose that it exists.
   */
  it('does not search boards the caller is not a member of', async () => {
    const outsiderToken = await signUp(OUTSIDER);
    await createTask(adminToken, first.slug, 'Secret task');

    await request(app).get('/api/boards/search').query({ q: 'roadmap' }).set(auth(outsiderToken)).expect(404);
    await request(app).get('/api/boards/search').query({ q: 'secret' }).set(auth(outsiderToken)).expect(404);
  });

  it('rejects a caller with no token', async () => {
    await request(app).get('/api/boards/search').query({ q: 'roadmap' }).expect(401);
  });
});
