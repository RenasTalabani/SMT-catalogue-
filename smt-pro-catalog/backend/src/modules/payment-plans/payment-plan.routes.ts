import { Router, RequestHandler } from 'express';
import * as planController from './payment-plan.controller';
import { protect }    from '../../shared/middlewares/auth.middleware';
import { restrictTo } from '../../shared/middlewares/rbac.middleware';
import { auditMiddleware } from '../../shared/middlewares/audit.middleware';

const router = Router();
router.use(protect as RequestHandler, restrictTo('super_admin', 'admin', 'employee') as RequestHandler);

router.get('/stats',
  restrictTo('super_admin', 'admin') as RequestHandler,
  planController.getStats as unknown as RequestHandler,
);
router.post('/mark-overdue',
  restrictTo('super_admin', 'admin') as RequestHandler,
  planController.markOverdue as unknown as RequestHandler,
);

router.get('/',                         planController.getAll     as unknown as RequestHandler);
router.get('/order/:orderId',           planController.getByOrder as unknown as RequestHandler);
router.get('/:id',                      planController.getById    as unknown as RequestHandler);

router.post('/',
  auditMiddleware('CREATE', 'PaymentPlan') as RequestHandler,
  planController.create as unknown as RequestHandler,
);
router.post('/installments/:installmentId/pay',
  auditMiddleware('PAY', 'PaymentInstallment') as RequestHandler,
  planController.recordPayment as unknown as RequestHandler,
);

export default router;
