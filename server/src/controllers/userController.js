const bcrypt = require('bcryptjs');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const env = require('../config/env');
const { publicUser } = require('../utils/publicUser');
const { EMAIL_PATTERN } = require('../utils/patterns');
const { validateProfileUpdate, validatePasswordChange } = require('../validators/userValidator');

/*
 * GET /api/users/lookup?email=...
 *
 * Resolves the email typed into the board's invite field to a registered
 * account, so MemberManager.jsx can add a real user rather than a bare string.
 *
 * 200   { user }
 * 400   { message }   missing or malformed email
 * 401   { message }   not signed in
 * 404   { message }   'User not found.' -> rendered verbatim by the invite form
 *
 * Requires a signed-in caller: an open endpoint that answers "does this address
 * have an account?" is an account-enumeration oracle for anyone on the internet.
 */
async function lookupByEmail(req, res) {
  const email = String(req.query.email || '').trim().toLowerCase();

  if (!email) {
    throw ApiError.badRequest('Enter an email address to invite.');
  }
  if (!EMAIL_PATTERN.test(email)) {
    throw ApiError.badRequest('Enter a valid email address.');
  }

  // Emails are stored lowercased at registration, so this matches regardless of
  // how the inviter typed it.
  const user = await User.findOne({ email }).lean();

  if (!user) {
    throw ApiError.notFound('User not found.');
  }

  res.json({ user: publicUser(user) });
}

/*
 * GET /api/users/me
 *
 * The signed-in account, read fresh from the database. The client stores the
 * user it was handed at login in localStorage, so this is how SettingsPage.jsx
 * shows what the server actually holds rather than a copy that may be stale.
 *
 * 200   { user }
 * 401   { message }
 */
async function getMe(req, res) {
  res.json({ user: publicUser(req.user) });
}

/*
 * PATCH /api/users/me
 *
 * Body    { username | name, email }   either may be omitted
 * 200     { user }   -> SettingsPage.jsx feeds it to AuthContext.updateUser()
 * 400     { message, details }
 * 401     { message }
 * 409     { message, details }   username or email already taken
 */
async function updateProfile(req, res) {
  const update = validateProfileUpdate(req.body);
  const user = req.user;

  /*
   * isAdmin is derived from the username matching env.adminUsername
   * (utils/publicUser.js), so taking that username would take the admin's
   * board-creation rights with it. Only the admin may hold it.
   */
  if (update.username && update.username === env.adminUsername && user.username !== env.adminUsername) {
    throw duplicateError('username');
  }

  // Same pre-check as register: a precise message in the common case, with the
  // unique indexes below as the actual guarantee against a lost race.
  const clash = await User.findOne({
    _id: { $ne: user._id },
    $or: [
      ...(update.username ? [{ username: update.username }] : []),
      ...(update.email ? [{ email: update.email }] : []),
    ],
  })
    .select('username email')
    .lean();

  if (clash) {
    throw duplicateError(clash.username === update.username ? 'username' : 'email');
  }

  Object.assign(user, update);

  try {
    await user.save();
  } catch (err) {
    throw translateWriteError(err);
  }

  res.json({ user: publicUser(user) });
}

/*
 * PATCH /api/users/me/password
 *
 * Body    { currentPassword, newPassword, confirmPassword? }
 * 200     { message }
 * 400     { message, details }
 * 401     { message }   not signed in, or the current password is wrong
 *
 * The existing token stays valid: it carries only the user id, so a changed
 * password does not make it stale and the user is not signed out mid-edit.
 */
async function changePassword(req, res) {
  const { currentPassword, newPassword } = validatePasswordChange(req.body);

  // requireAuth loads the user without the hash (`select: false` on the model),
  // so re-read it with the hash for the comparison.
  const user = await User.findById(req.user._id).select('+passwordHash');
  if (!user) {
    throw ApiError.unauthorized('Your session has expired. Please sign in again.');
  }

  const matches = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!matches) {
    // Named field: unlike login, the caller is already authenticated, so this
    // says nothing about which accounts exist.
    throw ApiError.unauthorized('Your current password is incorrect.', {
      currentPassword: 'Your current password is incorrect.',
    });
  }

  user.passwordHash = await bcrypt.hash(newPassword, env.bcryptRounds);
  await user.save();

  res.json({ message: 'Password updated.' });
}

function duplicateError(field) {
  const message =
    field === 'username'
      ? 'That username is already taken.'
      : 'An account with that email already exists.';
  return ApiError.conflict(message, { [field]: message });
}

/*
 * Turn a Mongoose write failure into an ApiError the client can render.
 * Anything unrecognised is returned as-is, so it surfaces as a 500 rather than
 * being dressed up as a client mistake.
 */
function translateWriteError(err) {
  if (err && err.code === 11000) {
    const field = Object.keys(err.keyPattern || err.keyValue || {})[0];
    return duplicateError(field === 'username' ? 'username' : 'email');
  }

  if (err && err.name === 'ValidationError') {
    const details = {};
    for (const [path, detail] of Object.entries(err.errors)) {
      details[path] = detail.message;
    }
    const messages = Object.values(details);
    return ApiError.badRequest(
      messages.length === 1 ? messages[0] : 'Please correct the highlighted fields.',
      details,
    );
  }

  return err;
}

module.exports = { lookupByEmail, getMe, updateProfile, changePassword };
