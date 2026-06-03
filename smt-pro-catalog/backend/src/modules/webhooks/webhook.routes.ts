import { Router, RequestHandler } from 'express';
import * as webhookController from './webhook.controller';
import { protect }    from '../../shared/middlewares/auth.middleware';
import { restrictTo } from '../../shared/middlewares/rbac.middleware';

const router = Router();

router.use(protect as RequestHandler, restrictTo('super_admin', 'admin') as RequestHandler);

router.get('/events', webhookController.getEvents as unknown as RequestHandler);
router.get('/',       webhookController.getAll    as unknown as RequestHandler);
router.get('/:id',    webhookController.getById   as unknown as RequestHandler);
router.get('/:id/stats', webhookController.getDeliveryStats as unknown as RequestHandler);

router.post('/',   webhookController.create as unknown as RequestHandler);
router.put('/:id', webhookController.update as unknown as RequestHandler);
router.delete('/:id', webhookController.remove as unknown as RequestHandler);

router.post('/:id/resend', webhookController.resend as unknown as RequestHandler);

export default router;
