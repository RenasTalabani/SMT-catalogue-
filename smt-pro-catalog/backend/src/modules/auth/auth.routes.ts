import { Router, RequestHandler } from 'express';
import * as authController from './auth.controller';
import { validateRegister, validateLogin } from './auth.validation';
import { authLimiter } from '../../shared/middlewares/rateLimiter.middleware';
import { protect } from '../../shared/middlewares/auth.middleware';
import { asyncHandler } from '../../shared/utils/asyncHandler.util';

const router = Router();

router.post('/register',  authLimiter, validateRegister, authController.register);
router.post('/login',     authLimiter, validateLogin,    authController.login);
router.post('/fcm-token', protect as RequestHandler, authController.updateFcmToken as unknown as RequestHandler);

export default router;
