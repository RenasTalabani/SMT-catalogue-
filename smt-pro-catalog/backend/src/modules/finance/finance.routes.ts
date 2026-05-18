import { Router, RequestHandler } from 'express';
import * as financeController from './finance.controller';
import { protect } from '../../shared/middlewares/auth.middleware';
import { restrictTo } from '../../shared/middlewares/rbac.middleware';
import { auditMiddleware } from '../../shared/middlewares/audit.middleware';
import { validateExpense, validateIncome } from './finance.validation';

const router = Router();

router.use(protect as RequestHandler, restrictTo('admin', 'employee') as RequestHandler);

router.get('/profit-loss', financeController.getProfitLoss as unknown as RequestHandler);

router.get('/expenses',  financeController.getExpenses as unknown as RequestHandler);
router.post('/expenses',
  validateExpense,
  auditMiddleware('CREATE', 'Expense') as RequestHandler,
  financeController.createExpense as unknown as RequestHandler,
);
router.delete('/expenses/:id',
  restrictTo('admin') as RequestHandler,
  auditMiddleware('DELETE', 'Expense') as RequestHandler,
  financeController.deleteExpense as unknown as RequestHandler,
);

router.get('/incomes',  financeController.getIncomes as unknown as RequestHandler);
router.post('/incomes',
  validateIncome,
  auditMiddleware('CREATE', 'Income') as RequestHandler,
  financeController.createIncome as unknown as RequestHandler,
);
router.delete('/incomes/:id',
  restrictTo('admin') as RequestHandler,
  auditMiddleware('DELETE', 'Income') as RequestHandler,
  financeController.deleteIncome as unknown as RequestHandler,
);

export default router;
