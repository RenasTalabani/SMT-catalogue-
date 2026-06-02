import { Router, RequestHandler } from 'express';
import * as customerController from './customer.controller';
import { protect }         from '../../shared/middlewares/auth.middleware';
import { restrictTo }      from '../../shared/middlewares/rbac.middleware';
import { auditMiddleware } from '../../shared/middlewares/audit.middleware';

const router = Router();

router.use(protect as RequestHandler, restrictTo('super_admin', 'admin', 'employee') as RequestHandler);

router.get('/',      customerController.getAll    as unknown as RequestHandler);
router.get('/:id',   customerController.getById   as unknown as RequestHandler);
router.get('/:id/stats', customerController.getStats as unknown as RequestHandler);

router.post('/',
  restrictTo('super_admin', 'admin', 'employee') as RequestHandler,
  auditMiddleware('CREATE', 'Customer') as RequestHandler,
  customerController.create as unknown as RequestHandler,
);
router.put('/:id',
  restrictTo('super_admin', 'admin', 'employee') as RequestHandler,
  auditMiddleware('UPDATE', 'Customer') as RequestHandler,
  customerController.update as unknown as RequestHandler,
);
router.delete('/:id',
  restrictTo('super_admin', 'admin') as RequestHandler,
  auditMiddleware('DELETE', 'Customer') as RequestHandler,
  customerController.remove as unknown as RequestHandler,
);

export default router;
