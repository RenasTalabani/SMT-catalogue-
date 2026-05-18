import { Router } from 'express';
import * as authController from './auth.controller';
import { validateRegister, validateLogin } from './auth.validation';
import { authLimiter } from '../../shared/middlewares/rateLimiter.middleware';

const router = Router();

router.post('/register', authLimiter, validateRegister, authController.register);
router.post('/login',    authLimiter, validateLogin,    authController.login);

export default router;
