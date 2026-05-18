const { error } = require('../utils/response.util');

const restrictTo = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role)) {
    return error(res, 'You do not have permission to perform this action', 403);
  }
  next();
};

module.exports = { restrictTo };
