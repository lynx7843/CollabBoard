const http = require('http');
const request = require('supertest');
const { io: ioClient } = require('socket.io-client');

const { createApp } = require('../src/app');
const { initSocket, closeSocket } = require('../src/socket');
const env = require('../src/config/env');

/*
 * The real-time layer, driven the way the browser drives it: a socket connects
 * with the session's JWT, joins a board, and the assertions are about what a
 * REST write on that board makes arrive on the wire.
 *
 * The server here is a real listening one rather than supertest's, because a
 * WebSocket needs a port to upgrade on.
 */
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

const OUTSIDER = {
  username: 'kavindu',
  email: 'kavindu@collabboard.app',
  password: 'correct-horse-battery',
};

const auth = (token) => ({ Authorization: `Bearer ${token}` });

let app;
let server;
let baseUrl;
const openSockets = [];

beforeAll(async () => {
  app = createApp();
  server = http.createServer(app);
  initSocket(server);

  await new Promise((resolve) => server.listen(0, resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

afterAll(async () => {
  await closeSocket();
  await new Promise((resolve) => server.close(resolve));
});

afterEach(() => {
  // A socket left open would hold the suite (and the server) alive.
  while (openSockets.length) openSockets.pop().disconnect();
});

async function signUp(account) {
  const res = await request(app).post('/api/auth/register').send(account).expect(201);
  return res.body.token;
}

// Connects a client the way client/src/socket.js does, and resolves once the
// handshake has been accepted.
function connect(token) {
  const socket = ioClient(baseUrl, {
    autoConnect: false,
    transports: ['websocket'],
    auth: { token },
  });
  openSockets.push(socket);

  return new Promise((resolve, reject) => {
    socket.on('connect', () => resolve(socket));
    socket.on('connect_error', reject);
    socket.connect();
  });
}

// Resolves with the event's payload, or rejects if nothing arrives — an event
// that never comes is the failure this suite exists to catch.
function nextEvent(socket, event, timeoutMs = 2000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`No ${event} within ${timeoutMs}ms`)), timeoutMs);
    socket.once(event, (payload) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
}

// Nothing acknowledges join-board, so this gives the join a tick to land before
// a write is made that the room is expected to receive.
const settle = () => new Promise((resolve) => setTimeout(resolve, 50));

describe('real-time task events', () => {
  let adminToken;
  let memberToken;
  let board;

  beforeEach(async () => {
    adminToken = await signUp(ADMIN);
    memberToken = await signUp(MEMBER);

    const created = await request(app)
      .post('/api/boards')
      .set(auth(adminToken))
      .send({ name: 'Q3 Roadmap' })
      .expect(201);
    board = created.body.board;

    await request(app)
      .post(`/api/boards/${board.slug}/members`)
      .set(auth(adminToken))
      .send({ email: MEMBER.email })
      .expect(201);
  });

  describe('the handshake', () => {
    it('rejects a connection with no token', async () => {
      await expect(connect(undefined)).rejects.toThrow('Sign in to continue.');
    });

    it('rejects a token that was not signed by this server', async () => {
      await expect(connect('not.a.real.token')).rejects.toThrow('session has expired');
    });

    it('accepts the token the API issued', async () => {
      const socket = await connect(memberToken);
      expect(socket.connected).toBe(true);
    });
  });

  describe('a member watching the board', () => {
    it('is told about a task someone else creates', async () => {
      const socket = await connect(memberToken);
      socket.emit('join-board', board.slug);
      await settle();

      const arriving = nextEvent(socket, 'task:created');

      const res = await request(app)
        .post(`/api/boards/${board.slug}/tasks`)
        .set(auth(adminToken))
        .send({ title: 'Ship the socket layer', status: 'todo' })
        .expect(201);

      const broadcast = await arriving;
      // The same payload the writer got back, so neither client is holding a
      // different version of the task.
      expect(broadcast).toEqual(res.body.task);
      expect(broadcast.title).toBe('Ship the socket layer');
    });

    it('is told when a task is edited, and when it moves column', async () => {
      const { body } = await request(app)
        .post(`/api/boards/${board.slug}/tasks`)
        .set(auth(adminToken))
        .send({ title: 'Draft the README' })
        .expect(201);

      const socket = await connect(memberToken);
      socket.emit('join-board', board.slug);
      await settle();

      const edited = nextEvent(socket, 'task:updated');
      await request(app)
        .patch(`/api/boards/${board.slug}/tasks/${body.task._id}`)
        .set(auth(adminToken))
        .send({ title: 'Rewrite the README' })
        .expect(200);
      expect(await edited).toMatchObject({ _id: body.task._id, title: 'Rewrite the README' });

      // A move is a status change, and reaches the room as the same event.
      const moved = nextEvent(socket, 'task:updated');
      await request(app)
        .patch(`/api/boards/${board.slug}/tasks/${body.task._id}`)
        .set(auth(adminToken))
        .send({ status: 'done' })
        .expect(200);
      expect(await moved).toMatchObject({ _id: body.task._id, status: 'done' });
    });

    it('is told the id of a deleted task', async () => {
      const { body } = await request(app)
        .post(`/api/boards/${board.slug}/tasks`)
        .set(auth(adminToken))
        .send({ title: 'Temporary' })
        .expect(201);

      const socket = await connect(memberToken);
      socket.emit('join-board', board.slug);
      await settle();

      const deleted = nextEvent(socket, 'task:deleted');
      await request(app)
        .delete(`/api/boards/${board.slug}/tasks/${body.task._id}`)
        .set(auth(adminToken))
        .expect(200);

      expect(await deleted).toBe(body.task._id);
    });
  });

  describe("who the board's traffic reaches", () => {
    it('does not reach a signed-in user who is not on the board', async () => {
      const outsiderToken = await signUp(OUTSIDER);
      const outsider = await connect(outsiderToken);

      // Knowing the slug is not enough: the join is checked against membership.
      outsider.emit('join-board', board.slug);
      await settle();

      const arriving = nextEvent(outsider, 'task:created', 300);

      await request(app)
        .post(`/api/boards/${board.slug}/tasks`)
        .set(auth(adminToken))
        .send({ title: 'Confidential' })
        .expect(201);

      await expect(arriving).rejects.toThrow('No task:created');
    });

    it('does not reach a member who has left the board room', async () => {
      const socket = await connect(memberToken);
      socket.emit('join-board', board.slug);
      await settle();
      socket.emit('leave-board', board.slug);
      await settle();

      const arriving = nextEvent(socket, 'task:created', 300);

      await request(app)
        .post(`/api/boards/${board.slug}/tasks`)
        .set(auth(adminToken))
        .send({ title: 'After leaving' })
        .expect(201);

      await expect(arriving).rejects.toThrow('No task:created');
    });

    it('does not reach a member watching a different board', async () => {
      const other = await request(app)
        .post('/api/boards')
        .set(auth(adminToken))
        .send({ name: 'Personal Notes' })
        .expect(201);

      const socket = await connect(adminToken);
      socket.emit('join-board', other.body.board.slug);
      await settle();

      const arriving = nextEvent(socket, 'task:created', 300);

      await request(app)
        .post(`/api/boards/${board.slug}/tasks`)
        .set(auth(adminToken))
        .send({ title: 'Belongs to the other board' })
        .expect(201);

      await expect(arriving).rejects.toThrow('No task:created');
    });
  });
});
