import { Router, RequestHandler } from 'express';
import { protect } from '../../shared/middlewares/auth.middleware';
import * as ctrl from './notification.controller';

const router = Router();

router.use(protect as RequestHandler);

router.get('/',           ctrl.list        as unknown as RequestHandler);
router.get('/unread',     ctrl.unreadCount as unknown as RequestHandler);
router.patch('/read-all', ctrl.readAll     as unknown as RequestHandler);
router.patch('/:id/read', ctrl.readOne     as unknown as RequestHandler);

export default router;
