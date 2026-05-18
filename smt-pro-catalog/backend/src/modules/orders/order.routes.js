const router           = require('express').Router();
const orderController  = require('./order.controller');
const { protect }      = require('../../shared/middlewares/auth.middleware');
const { restrictTo }   = require('../../shared/middlewares/rbac.middleware');
const { auditMiddleware } = require('../../shared/middlewares/audit.middleware');
const { validateOrder, validateStatusUpdate } = require('./order.validation');

// All order routes require authentication
router.use(protect);

router.get('/my', orderController.getMyOrders);

router.get('/',    restrictTo('admin', 'employee'), orderController.getAll);
router.get('/:id', orderController.getById);

router.post('/',
  validateOrder,
  auditMiddleware('CREATE', 'Order'),
  orderController.create,
);

router.patch('/:id/status',
  restrictTo('admin', 'employee'),
  validateStatusUpdate,
  auditMiddleware('UPDATE', 'Order'),
  orderController.updateStatus,
);

module.exports = router;
