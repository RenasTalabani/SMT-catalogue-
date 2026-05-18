const router                          = require('express').Router();
const authController                  = require('./auth.controller');
const { validateRegister,
        validateLogin }               = require('./auth.validation');
const { authLimiter }                 = require('../../shared/middlewares/rateLimiter.middleware');

router.post('/register', authLimiter, validateRegister, authController.register);
router.post('/login',    authLimiter, validateLogin,    authController.login);

module.exports = router;
