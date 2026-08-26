// Shared between the Mongoose schema and the request validator so the rules the
// API enforces and the rules the database enforces cannot drift apart.
const USERNAME_PATTERN = /^[a-zA-Z0-9_.-]+$/;

// Deliberately permissive: the authority on whether an address exists is a
// delivered email, not a regex. This only rejects the obviously malformed.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const USERNAME_MIN = 3;
const USERNAME_MAX = 30;
const NAME_MAX = 60;
const PASSWORD_MIN = 8;
// bcrypt hashes at most 72 BYTES and silently ignores the rest, so a longer
// password would give a false sense of strength. Reject it instead.
const PASSWORD_MAX_BYTES = 72;

module.exports = {
  USERNAME_PATTERN,
  EMAIL_PATTERN,
  USERNAME_MIN,
  USERNAME_MAX,
  NAME_MAX,
  PASSWORD_MIN,
  PASSWORD_MAX_BYTES,
};
