const Board = require('../models/Board');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { publicUser } = require('../utils/publicUser');
const { EMAIL_PATTERN } = require('../utils/patterns');

/*
 * Board membership.
 *
 * There is no "create board" screen yet — the client addresses a single board by
 * the slug hardcoded in App.jsx:12. So the first signed-in user to open that
 * slug creates it and becomes its owner; everyone else is added by invitation.
 * Replace loadOrCreateBoard with a plain lookup once boards can be created in
 * the UI.
 */
async function loadOrCreateBoard(slug, user) {
  const existing = await Board.findOne({ slug });
  if (existing) return existing;

  try {
    return await Board.create({
      slug,
      name: slug,
      owner: user._id,
      members: [user._id],
    });
  } catch (err) {
    // Two first-visits raced; the unique index rejected the loser, so read the
    // winner's document rather than failing a request that can still be served.
    if (err && err.code === 11000) return Board.findOne({ slug });
    throw err;
  }
}

/*
 * Every route here needs the same two things: the board, and the guarantee that
 * the caller belongs to it. A non-member gets 404 rather than 403 — telling them
 * the board exists is itself information they have no claim to.
 */
async function loadBoardForMember(req) {
  const slug = String(req.params.boardId || '').trim().toLowerCase();

  // Checked before it reaches the model, so a junk slug is a 404 rather than a
  // schema validation error surfacing as a 500.
  if (!/^[a-z0-9_-]{1,60}$/.test(slug)) {
    throw ApiError.notFound('Board not found.');
  }

  const board = await loadOrCreateBoard(slug, req.user);

  if (!board || !board.hasMember(req.user._id)) {
    throw ApiError.notFound('Board not found.');
  }

  return board;
}

function membersOf(board) {
  // populate() returns the ids unchanged for anything it could not resolve, so
  // drop entries whose account has since been deleted.
  return board.members.filter((m) => m && m.email).map(publicUser);
}

/*
 * GET /api/boards/:boardId/members
 * 200  { members: [user] }
 */
async function listMembers(req, res) {
  const board = await loadBoardForMember(req);
  await board.populate('members');

  res.json({ members: membersOf(board) });
}

/*
 * POST /api/boards/:boardId/members    Body { email }
 * 201  { user }          the account just added
 * 404  { message }       'User not found.'  -> shown verbatim by the invite form
 * 409  { message }       already a member
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
 * 403  { message }   the owner cannot be removed
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

module.exports = { listMembers, addMember, removeMember };
