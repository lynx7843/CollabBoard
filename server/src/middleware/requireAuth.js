const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { verifyAuthToken } = require('../utils/token');

/*
 * Gate for any route that needs to know who is asking.
 *
 * The token carries only the user id (utils/token.js), so the account is loaded
 * fresh here and attached as req.user. A token for a deleted account is
 * therefore rejected rather than trusted on the strength of its signature.
 */
async function requireAuth(req, _res, next) {
  try {
    const header = req.get('authorization') || '';
    const [scheme, token] = header.split(' ');

    if (scheme !== 'Bearer' || !token) {
      throw ApiError.unauthorized('Sign in to continue.');
    }

    let payload;
    try {
      payload = verifyAuthToken(token);
    } catch {
      // Expired and tampered-with are the same to the client: sign in again.
      throw ApiError.unauthorized('Your session has expired. Please sign in again.');
    }

    const user = await User.findById(payload.sub);
    if (!user) {
      throw ApiError.unauthorized('Your session has expired. Please sign in again.');
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { requireAuth };
