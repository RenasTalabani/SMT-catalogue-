const router                              = require('express').Router();
const productController                   = require('./product.controller');
const { protect }                         = require('../../shared/middlewares/auth.middleware');
const { restrictTo }                      = require('../../shared/middlewares/rbac.middleware');
const { uploadLimiter }                   = require('../../shared/middlewares/rateLimiter.middleware');
const { auditMiddleware }                 = require('../../shared/middlewares/audit.middleware');
const { validateProduct,
        validateProductUpdate }           = require('./product.validation');
const { upload }                          = require('../../config/cloudinary');

const handleUploadError = (err, req, res, next) => {
  if (err) return res.status(400).json({ status: 'error', message: err.message });
  next();
};

router.get('/',    productController.getAll);
router.get('/:id', productController.getById);

router.post('/',
  protect, restrictTo('admin', 'employee'), uploadLimiter,
  upload.single('image'), handleUploadError,
  validateProduct, auditMiddleware('CREATE', 'Product'),
  productController.create,
);

router.put('/:id',
  protect, restrictTo('admin', 'employee'), uploadLimiter,
  upload.single('image'), handleUploadError,
  validateProductUpdate, auditMiddleware('UPDATE', 'Product'),
  productController.update,
);

router.delete('/:id',
  protect, restrictTo('admin'),
  auditMiddleware('DELETE', 'Product'),
  productController.remove,
);

module.exports = router;
