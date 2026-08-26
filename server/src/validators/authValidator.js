const ApiError = require('../utils/ApiError');
const {
  USERNAME_PATTERN,
  EMAIL_PATTERN,
  USERNAME_MIN,
  USERNAME_MAX,
  NAME_MAX,
  PASSWORD_MIN,
  PASSWORD_MAX_BYTES,
} = require('../utils/patterns');

function asString(value) {
  return typeof value === 'string' ? value : '';
}

/*
 * Normalise and validate the body of POST /api/auth/register.
 *
 * On the field names: RegisterForm.jsx:42 posts { name: username, email,
 * password } — it sends the typed *username* in `name`. Create_account.jsx
 * collects a `username` field under its own name. Both are accepted here, and
 * `username` wins when both are present; the resulting user carries `name` and
 * `username` set to the same value, which is what LoginForm.jsx:46 then logs in
 * with.
 *
 * Returns clean values; throws ApiError(400) with `details` naming the offending
 * fields. Every message is written to be shown to the user as-is, because
 * RegisterForm.jsx:48 renders `data.message` verbatim.
 */
function validateRegister(body = {}) {
  const details = {};

  const rawHandle = asString(body.username).trim() || asString(body.name).trim();
  const email = asString(body.email).trim().toLowerCase();
  const password = asString(body.password);

  if (!rawHandle) {
    details.username = 'Username is required.';
  } else if (rawHandle.length < USERNAME_MIN) {
    details.username = `Username must be at least ${USERNAME_MIN} characters.`;
  } else if (rawHandle.length > USERNAME_MAX) {
    details.username = `Username must be ${USERNAME_MAX} characters or fewer.`;
  } else if (!USERNAME_PATTERN.test(rawHandle)) {
    details.username =
      'Username may only contain letters, numbers, dots, dashes and underscores.';
  }

  if (!email) {
    details.email = 'Email is required.';
  } else if (!EMAIL_PATTERN.test(email)) {
    details.email = 'Enter a valid email address.';
  } else if (email.length > 254) {
    details.email = 'Email must be 254 characters or fewer.';
  }

  if (!password) {
    details.password = 'Password is required.';
  } else if (password.length < PASSWORD_MIN) {
    details.password = `Password must be at least ${PASSWORD_MIN} characters.`;
  } else if (Buffer.byteLength(password, 'utf8') > PASSWORD_MAX_BYTES) {
    details.password = `Password must be ${PASSWORD_MAX_BYTES} bytes or fewer.`;
  }

  // confirmPassword is optional here: the form already compares the two fields
  // (RegisterForm.jsx:32). Check it when it is sent, so a caller that skips the
  // form does not get a typo'd password silently accepted.
  if (body.confirmPassword !== undefined && asString(body.confirmPassword) !== password) {
    details.confirmPassword = 'Passwords do not match.';
  }

  if (Object.keys(details).length) {
    // One field wrong -> that field's message, which is the common case and
    // reads better in the form's single error box.
    const messages = Object.values(details);
    const message = messages.length === 1 ? messages[0] : 'Please correct the highlighted fields.';
    throw ApiError.badRequest(message, details);
  }

  return {
    // The display name is the handle as typed (case preserved); `username` is
    // the lowercased login key the unique index is built on.
    name: rawHandle.slice(0, NAME_MAX),
    username: rawHandle.toLowerCase(),
    email,
    password,
  };
}

module.exports = { validateRegister };
