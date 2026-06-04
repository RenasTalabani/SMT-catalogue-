import { Router, RequestHandler } from 'express';
import * as variantController from './variant.controller';
import { protect }    from '../../shared/middlewares/auth.middleware';
import { restrictTo } from '../../shared/middlewares/rbac.middleware';
import { auditMiddleware } from '../../shared/middlewares/audit.middleware';

const router = Router();

// Public reads
router.get('/low-stock',                  variantController.getLowStock   as RequestHandler);
router.get('/product/:productId',         variantController.getByProduct  as RequestHandler);
router.get('/:id',                        variantController.getById       as RequestHandler);

// Authenticated mutations
router.post('/product/:productId',
  protect as RequestHandler, restrictTo('super_admin', 'admin') as RequestHandler,
  auditMiddleware('CREATE', 'ProductVariant') as RequestHandler,
  variantController.create as unknown as RequestHandler,
);

router.post('/product/:productId/bulk',
  protect as RequestHandler, restrictTo('super_admin', 'admin') as RequestHandler,
  auditMiddleware('BULK_CREATE', 'ProductVariant') as RequestHandler,
  variantController.bulkCreate as unknown as RequestHandler,
);

router.put('/:id',
  protect as RequestHandler, restrictTo('super_admin', 'admin') as RequestHandler,
  auditMiddleware('UPDATE', 'ProductVariant') as RequestHandler,
  variantController.update as unknown as RequestHandler,
);

router.post('/:id/stock',
  protect as RequestHandler, restrictTo('super_admin', 'admin', 'employee') as RequestHandler,
  auditMiddleware('STOCK_ADJUST', 'ProductVariant') as RequestHandler,
  variantController.adjustStock as unknown as RequestHandler,
);

router.delete('/:id',
  protect as RequestHandler, restrictTo('super_admin', 'admin') as RequestHandler,
  auditMiddleware('DELETE', 'ProductVariant') as RequestHandler,
  variantController.remove as unknown as RequestHandler,
);

export default router;
