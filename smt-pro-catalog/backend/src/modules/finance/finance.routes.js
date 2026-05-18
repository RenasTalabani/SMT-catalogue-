const router             = require('express').Router();
const financeController  = require('./finance.controller');
const { protect }        = require('../../shared/middlewares/auth.middleware');
const { restrictTo }     = require('../../shared/middlewares/rbac.middleware');
const { auditMiddleware }= require('../../shared/middlewares/audit.middleware');
const { validateExpense, validateIncome } = require('./finance.validation');

router.use(protect, restrictTo('admin', 'employee'));

// P&L
router.get('/profit-loss', financeController.getProfitLoss);

// Expenses
router.get('/expenses',  financeController.getExpenses);
router.post('/expenses',
  validateExpense,
  auditMiddleware('CREATE', 'Expense'),
  financeController.createExpense,
);
router.delete('/expenses/:id',
  restrictTo('admin'),
  auditMiddleware('DELETE', 'Expense'),
  financeController.deleteExpense,
);

// Incomes
router.get('/incomes',  financeController.getIncomes);
router.post('/incomes',
  validateIncome,
  auditMiddleware('CREATE', 'Income'),
  financeController.createIncome,
);
router.delete('/incomes/:id',
  restrictTo('admin'),
  auditMiddleware('DELETE', 'Income'),
  financeController.deleteIncome,
);

module.exports = router;
