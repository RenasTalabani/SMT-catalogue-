const authService        = require('./auth.service');
const { success, error } = require('../../shared/utils/response.util');

const ERR = {
  EMAIL_TAKEN:          { s: 409, m: 'This email is already registered' },
  INVALID_CREDENTIALS:  { s: 401, m: 'Invalid email or password' },
};

const resolve = (e, res, fallback) => {
  const mapped = ERR[e.message];
  return error(res, mapped?.m ?? fallback, mapped?.s ?? 500);
};

const register = async (req, res) => {
  try {
    const result = await authService.register(req.body);
    return success(res, result, 'Account created successfully', 201);
  } catch (e) { return resolve(e, res, 'Registration failed'); }
};

const login = async (req, res) => {
  try {
    const result = await authService.login(req.body);
    return success(res, result, 'Login successful');
  } catch (e) { return resolve(e, res, 'Login failed'); }
};

module.exports = { register, login };
