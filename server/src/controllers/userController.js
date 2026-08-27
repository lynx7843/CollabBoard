const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { publicUser } = require('../utils/publicUser');
const { EMAIL_PATTERN } = require('../utils/patterns');

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

module.exports = { lookupByEmail };
