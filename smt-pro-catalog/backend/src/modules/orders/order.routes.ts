import { Router, RequestHandler } from 'express';
import * as orderController from './order.controller';
import { protect } from '../../shared/middlewares/auth.middleware';
import { restrictTo } from '../../shared/middlewares/rbac.middleware';
import { auditMiddleware } from '../../shared/middlewares/audit.middleware';
import { validateOrder, validateStatusUpdate } from './order.validation';

const router = Router();

router.use(protect as RequestHandler);

router.get('/my', orderController.getMyOrders as unknown as RequestHandler);
router.get('/',    restrictTo('admin', 'employee') as RequestHandler, orderController.getAll as unknown as RequestHandler);
router.get('/:id', orderController.getById as unknown as RequestHandler);

router.post('/',
  validateOrder,
  auditMiddleware('CREATE', 'Order') as RequestHandler,
  orderController.create as unknown as RequestHandler,
);

router.patch('/:id/status',
  restrictTo('admin', 'employee') as RequestHandler,
  validateStatusUpdate,
  auditMiddleware('UPDATE', 'Order') as RequestHandler,
  orderController.updateStatus as unknown as RequestHandler,
);

export default router;
