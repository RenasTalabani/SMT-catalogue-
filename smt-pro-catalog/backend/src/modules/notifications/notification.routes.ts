import { Router } from 'express';
import { protect } from '../../shared/middlewares/auth.middleware';
import { asyncHandler } from '../../shared/utils/asyncHandler.util';
import * as ctrl from './notification.controller';

const router = Router();

router.use(protect);

router.get('/',           asyncHandler(ctrl.list));
router.get('/unread',     asyncHandler(ctrl.unreadCount));
router.patch('/read-all', asyncHandler(ctrl.readAll));
router.patch('/:id/read', asyncHandler(ctrl.readOne));

export default router;
