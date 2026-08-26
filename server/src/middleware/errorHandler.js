const env = require('../config/env');

/*
 * The single place an error becomes a response.
 *
 * Contract: every failure answers with JSON carrying a `message`, because both
 * auth forms read `data.message` off a non-ok response (LoginForm.jsx:52,
 * RegisterForm.jsx:48) and would otherwise show "undefined".
 *
 * Only errors explicitly marked `expose` (i.e. ApiError) have their message
 * forwarded. Anything else is an unexpected fault: logged in full, reported as a
 * flat 500 so internal detail never reaches the client.
 */
// eslint-disable-next-line no-unused-vars -- Express identifies error middleware by arity.
function errorHandler(err, _req, res, _next) {
  const status = err.expose && err.status ? err.status : 500;

  if (status >= 500) {
    console.error('Unhandled error:', err);
  }

  const body = {
    message: err.expose ? err.message : 'Something went wrong. Please try again.',
  };

  if (err.expose && err.details) body.details = err.details;
  if (status >= 500 && !env.isProduction) body.stack = err.stack;

  res.status(status).json(body);
}

module.exports = { errorHandler };
