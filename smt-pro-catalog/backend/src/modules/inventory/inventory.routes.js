const router              = require('express').Router();
const inventoryController = require('./inventory.controller');
const { protect }         = require('../../shared/middlewares/auth.middleware');
const { restrictTo }      = require('../../shared/middlewares/rbac.middleware');
const { auditMiddleware } = require('../../shared/middlewares/audit.middleware');
const { validateStockMovement, validateSupplier } = require('./inventory.validation');

router.use(protect, restrictTo('admin', 'employee'));

// Stock movements
router.get('/movements',  inventoryController.getMovements);
router.post('/movements',
  validateStockMovement,
  auditMiddleware('CREATE', 'StockMovement'),
  inventoryController.recordMovement,
);

// Inventory value & low stock
router.get('/value', inventoryController.getInventoryValue);

// Suppliers
router.get('/suppliers',     inventoryController.getSuppliers);
router.post('/suppliers',
  restrictTo('admin'),
  validateSupplier,
  auditMiddleware('CREATE', 'Supplier'),
  inventoryController.createSupplier,
);
router.put('/suppliers/:id',
  restrictTo('admin'),
  validateSupplier,
  auditMiddleware('UPDATE', 'Supplier'),
  inventoryController.updateSupplier,
);
router.delete('/suppliers/:id',
  restrictTo('admin'),
  auditMiddleware('DELETE', 'Supplier'),
  inventoryController.deleteSupplier,
);

module.exports = router;
