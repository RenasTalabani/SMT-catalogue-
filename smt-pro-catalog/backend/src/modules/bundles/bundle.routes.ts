import { Router, RequestHandler } from 'express';
import * as bundleController from './bundle.controller';
import { protect }         from '../../shared/middlewares/auth.middleware';
import { restrictTo }      from '../../shared/middlewares/rbac.middleware';
import { auditMiddleware } from '../../shared/middlewares/audit.middleware';

const router = Router();

router.use(protect as RequestHandler, restrictTo('super_admin', 'admin', 'employee') as RequestHandler);

router.get('/',    bundleController.getAll   as unknown as RequestHandler);
router.get('/:id', bundleController.getById  as unknown as RequestHandler);

router.get('/:id/stock',
  bundleController.checkStock as unknown as RequestHandler,
);

router.post('/',
  restrictTo('super_admin', 'admin') as RequestHandler,
  auditMiddleware('CREATE', 'Bundle') as RequestHandler,
  bundleController.create as unknown as RequestHandler,
);

router.put('/:id',
  restrictTo('super_admin', 'admin') as RequestHandler,
  auditMiddleware('UPDATE', 'Bundle') as RequestHandler,
  bundleController.update as unknown as RequestHandler,
);

router.delete('/:id',
  restrictTo('super_admin', 'admin') as RequestHandler,
  auditMiddleware('DELETE', 'Bundle') as RequestHandler,
  bundleController.remove as unknown as RequestHandler,
);

// Create an order from a bundle in one call
router.post('/:id/order',
  auditMiddleware('ORDER', 'Bundle') as RequestHandler,
  bundleController.orderBundle as unknown as RequestHandler,
);

export default router;
