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

function reject(details) {
  const messages = Object.values(details);
  throw ApiError.badRequest(
    messages.length === 1 ? messages[0] : 'Please correct the highlighted fields.',
    details,
  );
}

/*
 * Normalise and validate the body of PATCH /api/users/me.
 *
 * The same rules as registration, deliberately: an account edited here must
 * still satisfy every constraint the account could have been created under, or
 * the login form would stop accepting it. SettingsPage.jsx sends the handle as
 * `username`; `name` is accepted as an alias, the way validateRegister does it,
 * and both fields on the user are written from the one value.
 *
 * Both fields are optional — a caller changing only the email sends only the
 * email — but at least one must be present, so an empty body is a 400 rather
 * than a silent no-op the form would report as saved.
 */
function validateProfileUpdate(body = {}) {
  const details = {};
  const update = {};

  const hasHandle = body.username !== undefined || body.name !== undefined;
  const hasEmail = body.email !== undefined;

  if (!hasHandle && !hasEmail) {
    throw ApiError.badRequest('Nothing to update.');
  }

  if (hasHandle) {
    const handle = asString(body.username).trim() || asString(body.name).trim();

    if (!handle) {
      details.username = 'Username is required.';
    } else if (handle.length < USERNAME_MIN) {
      details.username = `Username must be at least ${USERNAME_MIN} characters.`;
    } else if (handle.length > USERNAME_MAX) {
      details.username = `Username must be ${USERNAME_MAX} characters or fewer.`;
    } else if (!USERNAME_PATTERN.test(handle)) {
      details.username =
        'Username may only contain letters, numbers, dots, dashes and underscores.';
    } else {
      update.name = handle.slice(0, NAME_MAX);
      update.username = handle.toLowerCase();
    }
  }

  if (hasEmail) {
    const email = asString(body.email).trim().toLowerCase();

    if (!email) {
      details.email = 'Email is required.';
    } else if (!EMAIL_PATTERN.test(email)) {
      details.email = 'Enter a valid email address.';
    } else if (email.length > 254) {
      details.email = 'Email must be 254 characters or fewer.';
    } else {
      update.email = email;
    }
  }

  if (Object.keys(details).length) reject(details);

  return update;
}

/*
 * Normalise and validate the body of PATCH /api/users/me/password.
 *
 * `currentPassword` is checked for presence only — its rules are whatever were
 * in force when it was set, and the controller's bcrypt compare is the real
 * verdict. The new password gets the full registration rules.
 */
function validatePasswordChange(body = {}) {
  const details = {};

  const currentPassword = asString(body.currentPassword);
  const newPassword = asString(body.newPassword);

  if (!currentPassword) {
    details.currentPassword = 'Enter your current password.';
  }

  if (!newPassword) {
    details.newPassword = 'New password is required.';
  } else if (newPassword.length < PASSWORD_MIN) {
    details.newPassword = `Password must be at least ${PASSWORD_MIN} characters.`;
  } else if (Buffer.byteLength(newPassword, 'utf8') > PASSWORD_MAX_BYTES) {
    details.newPassword = `Password must be ${PASSWORD_MAX_BYTES} bytes or fewer.`;
  } else if (newPassword === currentPassword) {
    details.newPassword = 'New password must be different from the current one.';
  }

  // Optional, like register's: the form compares the two itself, but a caller
  // that skips the form should not get a typo saved as its password.
  if (body.confirmPassword !== undefined && asString(body.confirmPassword) !== newPassword) {
    details.confirmPassword = 'Passwords do not match.';
  }

  if (Object.keys(details).length) reject(details);

  return { currentPassword, newPassword };
}

module.exports = { validateProfileUpdate, validatePasswordChange };
