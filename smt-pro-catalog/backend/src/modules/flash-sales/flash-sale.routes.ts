import { Router, RequestHandler } from 'express';
import * as flashSaleController from './flash-sale.controller';
import { protect }         from '../../shared/middlewares/auth.middleware';
import { restrictTo }      from '../../shared/middlewares/rbac.middleware';
import { auditMiddleware } from '../../shared/middlewares/audit.middleware';

const router = Router();

// Public endpoint — active flash sales visible to shop / cart
router.get('/active', flashSaleController.getActive as unknown as RequestHandler);

// All other routes require authentication
router.use(protect as RequestHandler, restrictTo('super_admin', 'admin', 'employee') as RequestHandler);

router.get('/stats',
  restrictTo('super_admin', 'admin') as RequestHandler,
  flashSaleController.getStats as unknown as RequestHandler,
);

router.get('/',    flashSaleController.getAll   as unknown as RequestHandler);
router.get('/:id', flashSaleController.getById  as unknown as RequestHandler);

router.post('/',
  restrictTo('super_admin', 'admin') as RequestHandler,
  auditMiddleware('CREATE', 'FlashSale') as RequestHandler,
  flashSaleController.create as unknown as RequestHandler,
);

router.put('/:id',
  restrictTo('super_admin', 'admin') as RequestHandler,
  auditMiddleware('UPDATE', 'FlashSale') as RequestHandler,
  flashSaleController.update as unknown as RequestHandler,
);

router.delete('/:id',
  restrictTo('super_admin', 'admin') as RequestHandler,
  auditMiddleware('DELETE', 'FlashSale') as RequestHandler,
  flashSaleController.remove as unknown as RequestHandler,
);

export default router;
