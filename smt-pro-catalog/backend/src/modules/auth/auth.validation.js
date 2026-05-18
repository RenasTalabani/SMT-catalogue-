const { error } = require('../../shared/utils/response.util');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const validateRegister = (req, res, next) => {
  const { name, email, password } = req.body;
  if (!name || name.trim().length < 2)       return error(res, 'Name must be at least 2 characters', 400);
  if (!email || !EMAIL_RE.test(email))       return error(res, 'A valid email is required', 400);
  if (!password || password.length < 8)      return error(res, 'Password must be at least 8 characters', 400);
  req.body.name  = name.trim();
  req.body.email = email.toLowerCase().trim();
  next();
};

const validateLogin = (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !EMAIL_RE.test(email)) return error(res, 'A valid email is required', 400);
  if (!password)                       return error(res, 'Password is required', 400);
  req.body.email = email.toLowerCase().trim();
  next();
};

module.exports = { validateRegister, validateLogin };
