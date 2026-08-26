/*
 * The user shape the client stores in localStorage and renders.
 *
 * AuthContext.loginSession(token, user) JSON-stringifies this straight into
 * localStorage, so keep it small and free of anything sensitive. Built by hand
 * rather than by deleting fields, so a field added to the model later is opt-in
 * rather than accidentally exposed.
 */
function publicUser(user) {
  return {
    _id: String(user._id),
    name: user.name,
    username: user.username,
    email: user.email,
    avatarColor: user.avatarColor,
    createdAt: user.createdAt,
  };
}

module.exports = { publicUser };
