import { Router, RequestHandler } from 'express';
import * as plController  from './price-list.controller';
import { protect }         from '../../shared/middlewares/auth.middleware';
import { restrictTo }      from '../../shared/middlewares/rbac.middleware';
import { auditMiddleware } from '../../shared/middlewares/audit.middleware';

const router = Router();

router.use(protect as RequestHandler, restrictTo('super_admin', 'admin', 'employee') as RequestHandler);

// Effective price lookup — useful before creating an order
router.get('/effective-price', plController.getEffectivePrice as unknown as RequestHandler);

router.get('/',    plController.getAll   as unknown as RequestHandler);
router.get('/:id', plController.getById  as unknown as RequestHandler);

router.post('/',
  restrictTo('super_admin', 'admin') as RequestHandler,
  auditMiddleware('CREATE', 'PriceList') as RequestHandler,
  plController.create as unknown as RequestHandler,
);

router.put('/:id',
  restrictTo('super_admin', 'admin') as RequestHandler,
  auditMiddleware('UPDATE', 'PriceList') as RequestHandler,
  plController.update as unknown as RequestHandler,
);

router.delete('/:id',
  restrictTo('super_admin', 'admin') as RequestHandler,
  auditMiddleware('DELETE', 'PriceList') as RequestHandler,
  plController.remove as unknown as RequestHandler,
);

// Bulk upsert price list items
router.put('/:id/items',
  restrictTo('super_admin', 'admin') as RequestHandler,
  auditMiddleware('UPDATE', 'PriceList') as RequestHandler,
  plController.upsertItems as unknown as RequestHandler,
);

// Remove a single product from a price list
router.delete('/:id/items/:productId',
  restrictTo('super_admin', 'admin') as RequestHandler,
  plController.removeItem as unknown as RequestHandler,
);

// Assign/unassign price list to a customer
router.post('/assign',
  restrictTo('super_admin', 'admin') as RequestHandler,
  auditMiddleware('ASSIGN', 'PriceList') as RequestHandler,
  plController.assignToCustomer as unknown as RequestHandler,
);

export default router;
