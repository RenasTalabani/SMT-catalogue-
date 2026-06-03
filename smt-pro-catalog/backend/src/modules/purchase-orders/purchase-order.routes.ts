import { Router, RequestHandler } from 'express';
import * as poController from './purchase-order.controller';
import { protect }         from '../../shared/middlewares/auth.middleware';
import { restrictTo }      from '../../shared/middlewares/rbac.middleware';
import { auditMiddleware } from '../../shared/middlewares/audit.middleware';

const router = Router();

router.use(protect as RequestHandler, restrictTo('super_admin', 'admin', 'employee') as RequestHandler);

router.get('/stats',
  restrictTo('super_admin', 'admin') as RequestHandler,
  poController.getStats as unknown as RequestHandler,
);

router.get('/',   poController.getAll   as unknown as RequestHandler);
router.get('/:id', poController.getById as unknown as RequestHandler);

router.post('/',
  restrictTo('super_admin', 'admin') as RequestHandler,
  auditMiddleware('CREATE', 'PurchaseOrder') as RequestHandler,
  poController.create as unknown as RequestHandler,
);

router.patch('/:id/status',
  restrictTo('super_admin', 'admin') as RequestHandler,
  auditMiddleware('UPDATE', 'PurchaseOrder') as RequestHandler,
  poController.updateStatus as unknown as RequestHandler,
);

router.post('/:id/receive',
  restrictTo('super_admin', 'admin', 'employee') as RequestHandler,
  auditMiddleware('RECEIVE', 'PurchaseOrder') as RequestHandler,
  poController.receiveItems as unknown as RequestHandler,
);

export default router;
