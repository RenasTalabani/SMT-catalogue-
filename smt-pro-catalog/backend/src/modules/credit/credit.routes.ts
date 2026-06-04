import { Router, RequestHandler } from 'express';
import * as creditController from './credit.controller';
import { protect }         from '../../shared/middlewares/auth.middleware';
import { restrictTo }      from '../../shared/middlewares/rbac.middleware';
import { auditMiddleware } from '../../shared/middlewares/audit.middleware';

const router = Router();
router.use(protect as RequestHandler, restrictTo('super_admin', 'admin', 'employee') as RequestHandler);

// Dashboard — admin only
router.get('/dashboard',
  restrictTo('super_admin', 'admin') as RequestHandler,
  creditController.getDashboard as unknown as RequestHandler,
);

// Mark overdue — admin only
router.post('/mark-overdue',
  restrictTo('super_admin', 'admin') as RequestHandler,
  creditController.markOverdue as unknown as RequestHandler,
);

// Add debt to order (called after credit sale)
router.post('/debt',
  auditMiddleware('DEBT', 'CreditAccount') as RequestHandler,
  creditController.addDebt as unknown as RequestHandler,
);

// Per-customer endpoints
router.get('/:customerId',                 creditController.getAccount       as unknown as RequestHandler);
router.get('/:customerId/payments',        creditController.getPaymentHistory as unknown as RequestHandler);

router.put('/:customerId/limit',
  restrictTo('super_admin', 'admin') as RequestHandler,
  auditMiddleware('SET_LIMIT', 'CreditAccount') as RequestHandler,
  creditController.setCreditLimit as unknown as RequestHandler,
);

router.post('/:customerId/payment',
  auditMiddleware('PAYMENT', 'CreditAccount') as RequestHandler,
  creditController.recordPayment as unknown as RequestHandler,
);

router.put('/:customerId/status',
  restrictTo('super_admin', 'admin') as RequestHandler,
  auditMiddleware('STATUS', 'CreditAccount') as RequestHandler,
  creditController.setAccountStatus as unknown as RequestHandler,
);

export default router;
