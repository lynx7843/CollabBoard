const bcrypt = require('bcryptjs');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const env = require('../config/env');
const { signAuthToken } = require('../utils/token');
const { publicUser } = require('../utils/publicUser');
const { avatarColorFor } = require('../utils/avatarColor');
const { validateRegister } = require('../validators/authValidator');

/*
 * POST /api/auth/register
 *
 * Body    { name | username, email, password, confirmPassword? }
 * 201     { token, user }   -> RegisterForm.jsx:52 feeds both to loginSession()
 * 400     { message, details }
 * 409     { message, details }   username or email already taken
 */
async function register(req, res) {
  const { name, username, email, password } = validateRegister(req.body);

  // Cheap pre-check purely so the common case gets a precise message naming the
  // field that clashed. It is NOT the uniqueness guarantee — two simultaneous
  // registrations can both pass it. The unique indexes are the guarantee, and
  // the E11000 branch below turns a lost race into the same 409.
  const existing = await User.findOne({ $or: [{ username }, { email }] })
    .select('username email')
    .lean();

  if (existing) {
    throw duplicateError(existing.username === username ? 'username' : 'email');
  }

  const passwordHash = await bcrypt.hash(password, env.bcryptRounds);

  let user;
  try {
    user = await User.create({
      name,
      username,
      email,
      passwordHash,
      avatarColor: avatarColorFor(username),
    });
  } catch (err) {
    throw translateWriteError(err);
  }

  res.status(201).json({
    token: signAuthToken(user),
    user: publicUser(user),
  });
}

function duplicateError(field) {
  const message =
    field === 'username'
      ? 'That username is already taken.'
      : 'An account with that email already exists.';
  return ApiError.conflict(message, { [field]: message });
}

/*
 * Turn a Mongoose write failure into an ApiError the client can act on.
 * Anything unrecognised is returned as-is so the error handler reports it as an
 * unexpected 500 rather than dressing it up as a client mistake.
 */
function translateWriteError(err) {
  if (err && err.code === 11000) {
    // keyPattern names the index that rejected the write, e.g. { email: 1 }.
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

module.exports = { register };
