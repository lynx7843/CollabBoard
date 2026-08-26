const jwt = require('jsonwebtoken');
const env = require('../config/env');

/*
 * The JWT carries only the user id. Everything else (name, email, role) is read
 * from the database on the request that needs it, so a token cannot go stale or
 * be used to assert a claim the database disagrees with.
 */
function signAuthToken(user) {
  return jwt.sign({ sub: String(user._id) }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });
}

function verifyAuthToken(token) {
  return jwt.verify(token, env.jwtSecret);
}

module.exports = { signAuthToken, verifyAuthToken };
