const request = require('supertest');

const { createApp } = require('../src/app');
const Task = require('../src/models/Task');
const env = require('../src/config/env');

/*
 * Concurrent-edit detection.
 *
 * Two people open the same card, both save. Without a version check the second
 * write silently erases the first; with one, the second writer is told and gets
 * the server's copy back to choose from. These tests are written as that story:
 * "reads at version N, someone else writes, then saves".
 */
const app = createApp();

const ADMIN = {
  username: env.adminUsername,
  email: 'admin@collabboard.app',
  password: 'correct-horse-battery',
};

const MEMBER = {
  username: 'sayuni',
  email: 'sayuni@collabboard.app',
  password: 'correct-horse-battery',
};

const auth = (token) => ({ Authorization: `Bearer ${token}` });

describe('concurrent task edits', () => {
  let adminToken;
  let memberToken;
  let slug;
  let task;

  beforeEach(async () => {
    const admin = await request(app).post('/api/auth/register').send(ADMIN).expect(201);
    adminToken = admin.body.token;
    const member = await request(app).post('/api/auth/register').send(MEMBER).expect(201);
    memberToken = member.body.token;

    const board = await request(app)
      .post('/api/boards')
      .set(auth(adminToken))
      .send({ name: 'Q3 Roadmap' })
      .expect(201);
    slug = board.body.board.slug;

    await request(app)
      .post(`/api/boards/${slug}/members`)
      .set(auth(adminToken))
      .send({ email: MEMBER.email })
      .expect(201);

    const created = await request(app)
      .post(`/api/boards/${slug}/tasks`)
      .set(auth(adminToken))
      .send({ title: 'Write the report' })
      .expect(201);
    task = created.body.task;
  });

  const patch = (token, body) =>
    request(app).patch(`/api/boards/${slug}/tasks/${task._id}`).set(auth(token)).send(body);

  describe('the version', () => {
    it('starts at zero on a new task', () => {
      expect(task.version).toBe(0);
    });

    it('goes up by one on each change that sticks', async () => {
      const first = await patch(adminToken, { title: 'Write the report v2' }).expect(200);
      expect(first.body.task.version).toBe(1);

      const second = await patch(adminToken, { status: 'doing' }).expect(200);
      expect(second.body.task.version).toBe(2);
    });

    it('stays put when the patch changes nothing', async () => {
      // Otherwise a no-op save would invalidate everyone else's expectedVersion.
      const res = await patch(adminToken, { title: task.title }).expect(200);
      expect(res.body.task.version).toBe(0);
    });

    it('is visible on the board listing, so a client always has one to quote', async () => {
      const res = await request(app)
        .get(`/api/boards/${slug}/tasks`)
        .set(auth(memberToken))
        .expect(200);
      expect(res.body.columns.todo[0].version).toBe(0);
    });
  });

  describe('an edit that quotes the current version', () => {
    it('is applied', async () => {
      const res = await patch(memberToken, { title: 'Edited', expectedVersion: 0 }).expect(200);
      expect(res.body.task).toMatchObject({ title: 'Edited', version: 1 });
    });

    it('is applied when the version arrives as a string, as a JSON body may carry it', async () => {
      await patch(memberToken, { title: 'Edited', expectedVersion: '0' }).expect(200);
    });
  });

  describe('an edit based on a version someone else has moved past', () => {
    beforeEach(async () => {
      // The other editor gets there first: the task is now at version 1.
      await patch(adminToken, { title: 'Saved by the admin first' }).expect(200);
    });

    it('is refused with 409', async () => {
      const res = await patch(memberToken, { title: 'Saved second', expectedVersion: 0 }).expect(409);
      expect(res.body.message).toMatch(/changed by someone else/i);
    });

    it('answers with the server copy, so the client can show both versions', async () => {
      const res = await patch(memberToken, { title: 'Saved second', expectedVersion: 0 }).expect(409);
      expect(res.body.latest).toMatchObject({
        _id: task._id,
        title: 'Saved by the admin first',
        version: 1,
      });
    });

    it('writes nothing at all', async () => {
      await patch(memberToken, { title: 'Saved second', description: 'and a note', expectedVersion: 0 })
        .expect(409);

      const stored = await Task.findById(task._id);
      expect(stored.title).toBe('Saved by the admin first');
      expect(stored.description).toBe('');
      expect(stored.version).toBe(1);
    });

    it('succeeds once it quotes the version it was told about', async () => {
      const refused = await patch(memberToken, { title: 'Saved second', expectedVersion: 0 }).expect(409);

      const retried = await patch(memberToken, {
        title: 'Saved second',
        expectedVersion: refused.body.latest.version,
      }).expect(200);

      expect(retried.body.task).toMatchObject({ title: 'Saved second', version: 2 });
    });
  });

  describe('an edit that quotes no version', () => {
    it('is applied even though the task has moved on — last writer wins', async () => {
      await patch(adminToken, { title: 'Admin was here' }).expect(200);
      const res = await patch(memberToken, { title: 'Member was here' }).expect(200);
      expect(res.body.task).toMatchObject({ title: 'Member was here', version: 2 });
    });

    it('is how a move stays unobtrusive', async () => {
      await patch(adminToken, { title: 'Admin was here' }).expect(200);
      await patch(memberToken, { status: 'done' }).expect(200);
    });
  });

  describe('a malformed expectedVersion', () => {
    // Ignoring it would turn the check off exactly when the client believes it
    // is on, which is worse than refusing the request.
    it.each([['not-a-number'], [-1], [1.5], [true]])('is refused: %p', async (value) => {
      const res = await patch(memberToken, { title: 'Edited', expectedVersion: value }).expect(400);
      expect(res.body.message).toMatch(/expectedVersion/);
    });
  });

  describe('a task written before versioning existed', () => {
    it('is treated as version 0 rather than failing every edit', async () => {
      await Task.collection.updateOne({ _id: task._id }, { $unset: { version: '' } });

      const res = await patch(memberToken, { title: 'Edited', expectedVersion: 0 }).expect(200);
      expect(res.body.task.version).toBe(1);
    });
  });
});
