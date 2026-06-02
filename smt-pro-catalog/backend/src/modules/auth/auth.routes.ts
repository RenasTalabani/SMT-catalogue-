import { Router, RequestHandler } from 'express';
import * as authController from './auth.controller';
import { validateRegister, validateLogin } from './auth.validation';
import { authLimiter } from '../../shared/middlewares/rateLimiter.middleware';
import { protect }    from '../../shared/middlewares/auth.middleware';
import { restrictTo } from '../../shared/middlewares/rbac.middleware';
import { asyncHandler } from '../../shared/utils/asyncHandler.util';

const router = Router();

// Public signup is disabled — accounts are created by admins via /api/users
router.post('/register',
  protect    as RequestHandler,
  restrictTo('super_admin') as RequestHandler,
  validateRegister,
  authController.register,
);
router.post('/login',     authLimiter, validateLogin, authController.login);
router.post('/fcm-token', protect as RequestHandler, authController.updateFcmToken as unknown as RequestHandler);

export default router;
