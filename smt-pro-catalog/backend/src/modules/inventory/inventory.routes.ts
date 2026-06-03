import { Router, RequestHandler } from 'express';
import * as inventoryController from './inventory.controller';
import { protect } from '../../shared/middlewares/auth.middleware';
import { restrictTo } from '../../shared/middlewares/rbac.middleware';
import { auditMiddleware } from '../../shared/middlewares/audit.middleware';
import { validateStockMovement, validateSupplier } from './inventory.validation';

const router = Router();

router.use(protect as RequestHandler, restrictTo('super_admin', 'admin', 'employee') as RequestHandler);

router.get('/movements',  inventoryController.getMovements as unknown as RequestHandler);
router.post('/movements',
  validateStockMovement,
  auditMiddleware('CREATE', 'StockMovement') as RequestHandler,
  inventoryController.recordMovement as unknown as RequestHandler,
);

router.get('/value', inventoryController.getInventoryValue as unknown as RequestHandler);

router.get('/suppliers', inventoryController.getSuppliers as unknown as RequestHandler);
router.post('/suppliers',
  restrictTo('super_admin', 'admin') as RequestHandler,
  validateSupplier,
  auditMiddleware('CREATE', 'Supplier') as RequestHandler,
  inventoryController.createSupplier as unknown as RequestHandler,
);
router.put('/suppliers/:id',
  restrictTo('super_admin', 'admin') as RequestHandler,
  validateSupplier,
  auditMiddleware('UPDATE', 'Supplier') as RequestHandler,
  inventoryController.updateSupplier as unknown as RequestHandler,
);
router.get('/suppliers/trash',
  restrictTo('super_admin', 'admin') as RequestHandler,
  inventoryController.getDeletedSuppliers as unknown as RequestHandler,
);

router.patch('/suppliers/:id/restore',
  restrictTo('super_admin', 'admin') as RequestHandler,
  auditMiddleware('RESTORE', 'Supplier') as RequestHandler,
  inventoryController.restoreSupplier as unknown as RequestHandler,
);

router.delete('/suppliers/:id',
  restrictTo('super_admin', 'admin') as RequestHandler,
  auditMiddleware('DELETE', 'Supplier') as RequestHandler,
  inventoryController.deleteSupplier as unknown as RequestHandler,
);

export default router;
