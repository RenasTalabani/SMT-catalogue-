const { verifyToken } = require('../utils/jwt.util');
const { error }       = require('../utils/response.util');

const protect = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return error(res, 'No token provided', 401);

  try {
    req.user = verifyToken(header.split(' ')[1]);
    next();
  } catch {
    return error(res, 'Invalid or expired token', 401);
  }
};

module.exports = { protect };
