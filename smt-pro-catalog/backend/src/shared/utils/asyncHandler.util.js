/**
 * Wraps async route handlers — eliminates try/catch in every controller.
 * Forwards thrown errors to Express centralized error handler.
 */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;
