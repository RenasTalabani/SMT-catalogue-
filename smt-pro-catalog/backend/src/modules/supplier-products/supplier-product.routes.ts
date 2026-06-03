import { Router, RequestHandler } from 'express';
import * as spController  from './supplier-product.controller';
import { protect }         from '../../shared/middlewares/auth.middleware';
import { restrictTo }      from '../../shared/middlewares/rbac.middleware';

const router = Router();

router.use(protect as RequestHandler, restrictTo('super_admin', 'admin', 'employee') as RequestHandler);

// Suggest best supplier before creating a PO
router.get('/suggest', spController.suggestSupplier as unknown as RequestHandler);

// View all suppliers for a product
router.get('/product/:productId',  spController.getByProduct  as unknown as RequestHandler);

// View all products a supplier carries
router.get('/supplier/:supplierId', spController.getBySupplier as unknown as RequestHandler);

// Upsert a supplier→product link
router.put('/supplier/:supplierId/product/:productId',
  restrictTo('super_admin', 'admin') as RequestHandler,
  spController.upsert as unknown as RequestHandler,
);

// Remove a link
router.delete('/supplier/:supplierId/product/:productId',
  restrictTo('super_admin', 'admin') as RequestHandler,
  spController.remove as unknown as RequestHandler,
);

// Set preferred supplier for a product
router.patch('/supplier/:supplierId/product/:productId/preferred',
  restrictTo('super_admin', 'admin') as RequestHandler,
  spController.setPreferred as unknown as RequestHandler,
);

// Bulk import a supplier's catalog
router.post('/supplier/:supplierId/bulk',
  restrictTo('super_admin', 'admin') as RequestHandler,
  spController.bulkUpsert as unknown as RequestHandler,
);

export default router;
