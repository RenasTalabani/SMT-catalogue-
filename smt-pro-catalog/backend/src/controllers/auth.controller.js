const authService = require('../services/auth.service');
const { success, error } = require('../utils/response.util');

const ERROR_MAP = {
  EMAIL_TAKEN: { status: 409, message: 'This email is already registered' },
  INVALID_CREDENTIALS: { status: 401, message: 'Invalid email or password' },
};

const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const result = await authService.register({ name, email, password });
    return success(res, result, 'Account created successfully', 201);
  } catch (err) {
    const mapped = ERROR_MAP[err.message];
    return error(res, mapped?.message ?? 'Registration failed', mapped?.status ?? 500);
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login({ email, password });
    return success(res, result, 'Login successful');
  } catch (err) {
    const mapped = ERROR_MAP[err.message];
    return error(res, mapped?.message ?? 'Login failed', mapped?.status ?? 500);
  }
};

module.exports = { register, login };
