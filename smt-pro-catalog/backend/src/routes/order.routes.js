const express = require('express');
const router = express.Router();

const orderController = require('../controllers/order.controller');
const { protect, restrictTo } = require('../middlewares/auth.middleware');
const { validateCreateOrder, validateStatusUpdate } = require('../middlewares/validateOrder.middleware');

// All order routes require authentication
router.use(protect);

// /my MUST be declared before /:id so Express does not treat "my" as an id
router.get('/my', orderController.getMyOrders);

router.post('/', validateCreateOrder, orderController.createOrder);

router.get('/', restrictTo('admin', 'employee'), orderController.getAllOrders);

router.get('/:id', orderController.getOrderById);

router.patch(
  '/:id/status',
  restrictTo('admin'),
  validateStatusUpdate,
  orderController.updateStatus,
);

module.exports = router;
