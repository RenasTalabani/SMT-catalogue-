import { Router, RequestHandler } from 'express';
import * as loyaltyController from './loyalty.controller';
import { protect }         from '../../shared/middlewares/auth.middleware';
import { restrictTo }      from '../../shared/middlewares/rbac.middleware';
import { auditMiddleware } from '../../shared/middlewares/audit.middleware';

const router = Router();

router.use(protect as RequestHandler, restrictTo('super_admin', 'admin', 'employee') as RequestHandler);

router.get('/stats',
  restrictTo('super_admin', 'admin') as RequestHandler,
  loyaltyController.getStats as unknown as RequestHandler,
);

router.get('/account/:customerId',  loyaltyController.getAccount as unknown as RequestHandler);
router.get('/history/:customerId',  loyaltyController.getHistory as unknown as RequestHandler);

router.post('/earn',
  auditMiddleware('EARN', 'LoyaltyPoints') as RequestHandler,
  loyaltyController.earn as unknown as RequestHandler,
);

router.post('/redeem',
  auditMiddleware('REDEEM', 'LoyaltyPoints') as RequestHandler,
  loyaltyController.redeem as unknown as RequestHandler,
);

router.post('/adjust',
  restrictTo('super_admin', 'admin') as RequestHandler,
  auditMiddleware('ADJUST', 'LoyaltyPoints') as RequestHandler,
  loyaltyController.adjust as unknown as RequestHandler,
);

export default router;
