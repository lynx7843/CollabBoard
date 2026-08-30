const { Server } = require('socket.io');
const User = require('./models/User');
const Board = require('./models/Board');
const env = require('./config/env');
const { verifyAuthToken } = require('./utils/token');

/*
 * The real-time layer.
 *
 * Every board is a room, so a change only reaches the people looking at that
 * board rather than everyone connected. The rooms are keyed by board slug —
 * the same id the REST routes address a board by (:boardId), which is what the
 * client already has in its URL.
 *
 * The io instance is module state rather than an export of index.js: a
 * controller needs to emit, and importing index.js from a controller would
 * start the server a second time under the test suite.
 */
let io = null;

// Socket.IO resolves a room name against socket ids too, so board rooms are
// namespaced to keep a slug from ever addressing a single connection.
const roomFor = (slug) => `board:${String(slug || '').trim().toLowerCase()}`;

function initSocket(httpServer) {
  io = new Server(httpServer, {
    // The same allowlist the REST side uses, wildcards included. This is the
    // one place the deployed client is genuinely cross-origin: REST goes
    // through the Vercel rewrite and arrives same-origin, but a WebSocket
    // cannot, so a preview URL missing from CLIENT_ORIGIN breaks real-time
    // there and nothing else.
    cors: { origin: (origin, callback) => callback(null, env.isAllowedOrigin(origin)), credentials: true },
  });

  /*
   * The socket carries the same JWT as the REST calls (sent in the handshake
   * rather than a header, which is all a WebSocket allows). Without this the
   * connection would be anonymous and anyone could listen to a board's traffic
   * by guessing its slug — the REST side answers a non-member with 404
   * precisely so that cannot happen.
   */
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;

    if (!token) {
      next(new Error('Sign in to continue.'));
      return;
    }

    try {
      const payload = verifyAuthToken(token);
      // Loaded rather than trusted from the token, so a deleted account cannot
      // keep a live connection (requireAuth.js does the same on every request).
      const user = await User.findById(payload.sub).select('_id');
      if (!user) {
        next(new Error('Your session has expired. Please sign in again.'));
        return;
      }

      socket.data.userId = String(user._id);
      next();
    } catch {
      next(new Error('Your session has expired. Please sign in again.'));
    }
  });

  io.on('connection', (socket) => {
    /*
     * Membership is checked here, not on emit: joining is the only moment a
     * connection can widen what it sees, so one lookup per join covers every
     * event the room will ever deliver. A non-member is ignored silently for
     * the same reason the API returns 404 — refusing out loud would confirm
     * that the board exists.
     */
    socket.on('join-board', async (slug) => {
      const board = await Board.findOne({ slug: String(slug || '').trim().toLowerCase() });
      if (!board || !board.hasMember(socket.data.userId)) return;

      socket.join(roomFor(board.slug));
    });

    socket.on('leave-board', (slug) => {
      socket.leave(roomFor(slug));
    });
  });

  return io;
}

/*
 * Fire-and-forget: a task write must not fail because nobody is listening, and
 * the tests drive the REST API with no socket server attached at all, so this
 * is a no-op until initSocket has run.
 */
function emitToBoard(slug, event, payload) {
  if (!io) return;
  io.to(roomFor(slug)).emit(event, payload);
}

function getIO() {
  return io;
}

async function closeSocket() {
  if (!io) return;
  await io.close();
  io = null;
}

module.exports = { initSocket, emitToBoard, getIO, closeSocket };
