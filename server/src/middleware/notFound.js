const ApiError = require('../utils/ApiError');

// Any /api path that matched no route. Reaching the SPA's catch-all with an
// HTML 404 would break the client's `await response.json()`, so answer in JSON.
function notFound(req, _res, next) {
  next(ApiError.notFound(`No route for ${req.method} ${req.originalUrl}`));
}

module.exports = { notFound };
