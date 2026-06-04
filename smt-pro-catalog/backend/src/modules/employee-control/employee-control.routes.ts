import { Router, RequestHandler } from 'express';
import * as empController from './employee-control.controller';
import { protect }         from '../../shared/middlewares/auth.middleware';
import { restrictTo }      from '../../shared/middlewares/rbac.middleware';
import { auditMiddleware } from '../../shared/middlewares/audit.middleware';

const router = Router();
router.use(protect as RequestHandler, restrictTo('super_admin', 'admin') as RequestHandler);

// Performance overview
router.get('/performance', empController.getPerformance as unknown as RequestHandler);

// Discount requests
router.get('/discounts/pending', empController.getPendingDiscounts as unknown as RequestHandler);
router.post('/discounts/request',
  restrictTo('super_admin', 'admin', 'employee') as RequestHandler,
  empController.requestDiscount as unknown as RequestHandler,
);
router.patch('/discounts/:id/review',
  auditMiddleware('REVIEW', 'DiscountRequest') as RequestHandler,
  empController.reviewDiscount as unknown as RequestHandler,
);

// Employee CRUD
router.get('/',    empController.getAll   as unknown as RequestHandler);
router.get('/:id', empController.getDetail as unknown as RequestHandler);

router.post('/',
  restrictTo('super_admin') as RequestHandler,
  auditMiddleware('CREATE', 'User') as RequestHandler,
  empController.create as unknown as RequestHandler,
);

router.patch('/:id/active',
  auditMiddleware('SET_ACTIVE', 'User') as RequestHandler,
  empController.setActive as unknown as RequestHandler,
);

router.patch('/:id/password',
  restrictTo('super_admin') as RequestHandler,
  auditMiddleware('RESET_PASSWORD', 'User') as RequestHandler,
  empController.resetPassword as unknown as RequestHandler,
);

router.patch('/:id/role',
  restrictTo('super_admin') as RequestHandler,
  auditMiddleware('UPDATE_ROLE', 'User') as RequestHandler,
  empController.updateRole as unknown as RequestHandler,
);

router.delete('/:id',
  restrictTo('super_admin') as RequestHandler,
  auditMiddleware('DELETE', 'User') as RequestHandler,
  empController.remove as unknown as RequestHandler,
);

export default router;
