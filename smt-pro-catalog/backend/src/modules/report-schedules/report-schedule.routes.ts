import { Router, RequestHandler } from 'express';
import * as scheduleController from './report-schedule.controller';
import { protect }    from '../../shared/middlewares/auth.middleware';
import { restrictTo } from '../../shared/middlewares/rbac.middleware';

const router = Router();

router.use(protect as RequestHandler, restrictTo('super_admin', 'admin') as RequestHandler);

router.get('/',          scheduleController.getAll   as unknown as RequestHandler);
router.post('/',         scheduleController.upsert   as unknown as RequestHandler);
router.delete('/:type',  scheduleController.remove   as unknown as RequestHandler);

// Trigger a report send immediately (with optional override recipients in body)
router.post('/send/:type', scheduleController.sendNow as unknown as RequestHandler);

export default router;
