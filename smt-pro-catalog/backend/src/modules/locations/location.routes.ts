import { Router, RequestHandler } from 'express';
import * as locationController from './location.controller';
import { protect }         from '../../shared/middlewares/auth.middleware';
import { restrictTo }      from '../../shared/middlewares/rbac.middleware';
import { auditMiddleware } from '../../shared/middlewares/audit.middleware';

const router = Router();
router.use(protect as RequestHandler, restrictTo('super_admin', 'admin', 'employee') as RequestHandler);

router.get('/transfers',          locationController.getTransfers    as unknown as RequestHandler);
router.get('/',                   locationController.getAll          as unknown as RequestHandler);
router.get('/:id',                locationController.getById         as unknown as RequestHandler);
router.get('/:id/inventory',      locationController.getInventory    as unknown as RequestHandler);

router.post('/',
  restrictTo('super_admin', 'admin') as RequestHandler,
  auditMiddleware('CREATE', 'Location') as RequestHandler,
  locationController.create as unknown as RequestHandler,
);
router.put('/:id',
  restrictTo('super_admin', 'admin') as RequestHandler,
  locationController.update as unknown as RequestHandler,
);
router.delete('/:id',
  restrictTo('super_admin', 'admin') as RequestHandler,
  locationController.remove as unknown as RequestHandler,
);
router.put('/:id/stock',
  restrictTo('super_admin', 'admin') as RequestHandler,
  locationController.setStock as unknown as RequestHandler,
);

// Transfers
router.post('/transfers/create',
  auditMiddleware('CREATE', 'StockTransfer') as RequestHandler,
  locationController.createTransfer as unknown as RequestHandler,
);
router.post('/transfers/:id/complete',
  restrictTo('super_admin', 'admin') as RequestHandler,
  auditMiddleware('COMPLETE', 'StockTransfer') as RequestHandler,
  locationController.completeTransfer as unknown as RequestHandler,
);
router.post('/transfers/:id/cancel',
  restrictTo('super_admin', 'admin') as RequestHandler,
  locationController.cancelTransfer as unknown as RequestHandler,
);

export default router;
