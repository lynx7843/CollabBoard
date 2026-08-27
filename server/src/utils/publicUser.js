/*
 * The user shape the client stores in localStorage and renders.
 *
 * AuthContext.loginSession(token, user) JSON-stringifies this straight into
 * localStorage, so keep it small and free of anything sensitive. Built by hand
 * rather than by deleting fields, so a field added to the model later is opt-in
 * rather than accidentally exposed.
 */
const env = require('../config/env');

function publicUser(user) {
  return {
    _id: String(user._id),
    name: user.name,
    username: user.username,
    email: user.email,
    avatarColor: user.avatarColor,
    // Drives whether the client shows "+ New Board" at all. The server checks
    // the same thing again on every write, so hiding it is convenience, not
    // the control.
    isAdmin: user.username === env.adminUsername,
    createdAt: user.createdAt,
  };
}

module.exports = { publicUser };
