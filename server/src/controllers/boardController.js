const Board = require('../models/Board');
const Task = require('../models/Task');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const env = require('../config/env');
const { publicUser } = require('../utils/publicUser');
const { EMAIL_PATTERN } = require('../utils/patterns');

// Boards a single owner may hold at once. The client greys out "+ New Board" at
// this number; this is the check that actually enforces it.
const MAX_BOARDS = 5;

const isAdmin = (user) => user.username === env.adminUsername;

function requireAdmin(user) {
  if (!isAdmin(user)) {
    throw ApiError.forbidden('Only the board admin can create or delete boards.');
  }
}

/*
 * A URL-safe id derived from the board's name, so the client's routes read
 * /boards/q3-roadmap rather than an ObjectId. A numeric suffix is appended
 * until it is unique, which also covers two boards sharing a name.
 */
async function uniqueSlug(name) {
  const base =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'board';

  for (let n = 0; n < 50; n += 1) {
    const candidate = n === 0 ? base : `${base}-${n + 1}`;
    // eslint-disable-next-line no-await-in-loop -- candidates must be tried in order.
    if (!(await Board.exists({ slug: candidate }))) return candidate;
  }

  return `${base}-${Date.now()}`;
}

function boardSummary(board) {
  return {
    _id: String(board._id),
    slug: board.slug,
    name: board.name,
    description: board.description || '',
    owner: String(board.owner),
    memberCount: board.members?.length ?? 0,
    createdAt: board.createdAt,
  };
}

/*
 * Loads a board the caller is entitled to see.
 *
 * A non-member gets 404 rather than 403: confirming that a board exists is
 * itself information they have no claim to.
 */
async function loadBoardForMember(req) {
  const slug = String(req.params.boardId || '').trim().toLowerCase();
  const board = slug ? await Board.findOne({ slug }) : null;

  if (!board || !board.hasMember(req.user._id)) {
    throw ApiError.notFound('Board not found.');
  }

  return board;
}

/*
 * GET /api/boards
 * 200  { boards: [...], maxBoards, canCreate }
 *
 * Everything the caller can open, which is what the client renders as its tab
 * strip. Ordered oldest first so the tabs keep a stable order across reloads.
 */
async function listBoards(req, res) {
  const boards = await Board.find({ members: req.user._id }).sort({ createdAt: 1 });
  const owned = boards.filter((b) => String(b.owner) === String(req.user._id)).length;

  res.json({
    boards: boards.map(boardSummary),
    maxBoards: MAX_BOARDS,
    // Only the admin ever sees the create button, and only below the cap.
    canCreate: isAdmin(req.user) && owned < MAX_BOARDS,
  });
}

/*
 * POST /api/boards    Body { name, description? }
 * 201  { board }
 * 403  { message }   not the admin
 * 409  { message }   the cap is reached
 */
async function createBoard(req, res) {
  requireAdmin(req.user);

  const name = String(req.body.name || '').trim();
  const description = String(req.body.description || '').trim();

  if (!name) {
    throw ApiError.badRequest('Give the board a name.');
  }
  if (name.length > 80) {
    throw ApiError.badRequest('Board name must be 80 characters or fewer.');
  }
  if (description.length > 280) {
    throw ApiError.badRequest('Description must be 280 characters or fewer.');
  }

  const owned = await Board.countDocuments({ owner: req.user._id });
  if (owned >= MAX_BOARDS) {
    throw ApiError.conflict(
      `You have reached the maximum of ${MAX_BOARDS} boards. Delete one to create another.`,
    );
  }

  const board = await Board.create({
    slug: await uniqueSlug(name),
    name,
    description,
    owner: req.user._id,
    members: [req.user._id],
  });

  res.status(201).json({ board: boardSummary(board) });
}

/*
 * DELETE /api/boards/:boardId
 * 200  { deleted }
 * 403  { message }   not the admin, or not this board's owner
 *
 * Deletes the board and its tasks. Member accounts are untouched — they are
 * only referenced by the board, never owned by it.
 */
async function deleteBoard(req, res) {
  requireAdmin(req.user);

  const board = await loadBoardForMember(req);

  if (String(board.owner) !== String(req.user._id)) {
    throw ApiError.forbidden('Only the board owner can delete this board.');
  }

  await Task.deleteMany({ board: board._id });
  await Board.deleteOne({ _id: board._id });

  res.json({ deleted: board.slug });
}

/*
 * GET /api/boards/:boardId/members
 * 200  { members: [user] }
 */
async function listMembers(req, res) {
  const board = await loadBoardForMember(req);
  await board.populate('members');

  // populate() leaves an id in place for anything it could not resolve, so drop
  // entries whose account has since been deleted.
  const members = board.members.filter((m) => m && m.email).map(publicUser);

  res.json({ members });
}

/*
 * POST /api/boards/:boardId/members    Body { email }
 * 201  { user }
 * 404  { message }   'User not found.'  -> shown verbatim by the invite form
 * 409  { message }   already a member
 */
async function addMember(req, res) {
  const board = await loadBoardForMember(req);
  const email = String(req.body.email || '').trim().toLowerCase();

  if (!email) {
    throw ApiError.badRequest('Enter an email address to invite.');
  }
  if (!EMAIL_PATTERN.test(email)) {
    throw ApiError.badRequest('Enter a valid email address.');
  }

  const invitee = await User.findOne({ email });
  if (!invitee) {
    throw ApiError.notFound('User not found.');
  }
  if (board.hasMember(invitee._id)) {
    throw ApiError.conflict('That user is already a member of this board.');
  }

  // $addToSet rather than push + save: two simultaneous invites of the same
  // person cannot both append, so the array holds no duplicates.
  await Board.updateOne({ _id: board._id }, { $addToSet: { members: invitee._id } });

  res.status(201).json({ user: publicUser(invitee) });
}

/*
 * DELETE /api/boards/:boardId/members/:userId
 * 200  { removed }
 *
 * Removes the membership only. The account itself is never touched — a removed
 * member keeps their login and can be invited back.
 */
async function removeMember(req, res) {
  const board = await loadBoardForMember(req);
  const { userId } = req.params;

  if (!board.hasMember(userId)) {
    throw ApiError.notFound('That user is not a member of this board.');
  }
  if (String(board.owner) === String(userId)) {
    throw ApiError.forbidden('The board owner cannot be removed.');
  }

  await Board.updateOne({ _id: board._id }, { $pull: { members: userId } });

  res.json({ removed: String(userId) });
}

/*
 * GET /api/boards/search?q=...
 *
 * Backs the top search bar, which does one thing: open a board. So this answers
 * with the single board to open rather than a list of hits.
 *
 * A board whose name matches wins over a task, because someone typing a board's
 * name means that board even if a task elsewhere happens to contain the words.
 * Within either kind, the oldest board wins — the same order listBoards uses
 * for the tab strip, so "the first one" means the same thing in both places.
 *
 * Only boards the caller is a member of are searched: the result names a board,
 * and a hit on one they cannot open would tell them it exists.
 *
 * 200  { board, match: { type, title } }
 * 400  { message }   empty query
 * 401  { message }
 * 404  { message }   nothing matched
 */
async function searchBoards(req, res) {
  const query = String(req.query.q || '').trim();

  if (!query) {
    throw ApiError.badRequest('Type something to search for.');
  }

  const boards = await Board.find({ members: req.user._id }).sort({ createdAt: 1 });

  if (boards.length === 0) {
    throw ApiError.notFound('Nothing matches that search.');
  }

  // Substring, case-insensitive, so a partial name finds the board. The query
  // is escaped: it is user input, and an unescaped '(' would throw here.
  const pattern = new RegExp(escapeRegExp(query), 'i');

  const named = boards.find((board) => pattern.test(board.name));
  if (named) {
    return res.json({ board: boardSummary(named), match: { type: 'board', title: named.name } });
  }

  /*
   * Sorted by board rather than by task: the boards are already in the order
   * the tie is to be broken by, so the first task found walking them in that
   * order belongs to the board that should open. Doing it in one query and
   * sorting tasks by their own createdAt would answer a different question.
   */
  const ids = boards.map((board) => board._id);
  const tasks = await Task.find({ board: { $in: ids }, title: pattern })
    .select('board title')
    .lean();

  for (const board of boards) {
    const task = tasks.find((t) => String(t.board) === String(board._id));
    if (task) {
      return res.json({ board: boardSummary(board), match: { type: 'task', title: task.title } });
    }
  }

  throw ApiError.notFound('No board or task matches that search.');
}

// Neutralises the regex metacharacters, so the query is matched as typed.
function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = {
  listBoards,
  searchBoards,
  createBoard,
  deleteBoard,
  listMembers,
  addMember,
  removeMember,
  loadBoardForMember,
  MAX_BOARDS,
};
