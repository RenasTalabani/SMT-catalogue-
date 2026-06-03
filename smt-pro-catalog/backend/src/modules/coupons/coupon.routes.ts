import { Router, RequestHandler } from 'express';
import * as couponController from './coupon.controller';
import { protect }         from '../../shared/middlewares/auth.middleware';
import { restrictTo }      from '../../shared/middlewares/rbac.middleware';
import { auditMiddleware } from '../../shared/middlewares/audit.middleware';

const router = Router();

router.use(protect as RequestHandler, restrictTo('super_admin', 'admin', 'employee') as RequestHandler);

router.get('/stats',
  restrictTo('super_admin', 'admin') as RequestHandler,
  couponController.getStats as unknown as RequestHandler,
);

// Validate a coupon code before applying it to an order
router.get('/validate',
  couponController.validateCoupon as unknown as RequestHandler,
);

router.get('/',    couponController.getAll   as unknown as RequestHandler);
router.get('/:id', couponController.getById  as unknown as RequestHandler);

router.post('/',
  restrictTo('super_admin', 'admin') as RequestHandler,
  auditMiddleware('CREATE', 'Coupon') as RequestHandler,
  couponController.create as unknown as RequestHandler,
);

router.put('/:id',
  restrictTo('super_admin', 'admin') as RequestHandler,
  auditMiddleware('UPDATE', 'Coupon') as RequestHandler,
  couponController.update as unknown as RequestHandler,
);

router.delete('/:id',
  restrictTo('super_admin', 'admin') as RequestHandler,
  auditMiddleware('DELETE', 'Coupon') as RequestHandler,
  couponController.remove as unknown as RequestHandler,
);

export default router;
