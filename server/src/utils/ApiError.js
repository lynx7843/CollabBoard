/*
 * An error the API is willing to describe to the client.
 *
 * Anything thrown that is NOT an ApiError is treated as unexpected by the error
 * handler and reported as a generic 500, so internal details never leak.
 */
class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.expose = true;
    if (details) this.details = details;
    Error.captureStackTrace(this, ApiError);
  }

  static badRequest(message, details) {
    return new ApiError(400, message, details);
  }

  // `details` is optional here and unused by the sign-in paths, which say as
  // little as possible; it is for an already-authenticated caller getting a
  // credential wrong on a specific field (changing a password, say).
  static unauthorized(message = 'Not authenticated.', details) {
    return new ApiError(401, message, details);
  }

  static forbidden(message = 'Not allowed.') {
    return new ApiError(403, message);
  }

  static notFound(message = 'Not found.') {
    return new ApiError(404, message);
  }

  static conflict(message, details) {
    return new ApiError(409, message, details);
  }
}

module.exports = ApiError;
