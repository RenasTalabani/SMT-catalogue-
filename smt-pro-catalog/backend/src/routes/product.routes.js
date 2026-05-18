const express = require('express');
const router = express.Router();

const productController = require('../controllers/product.controller');
const { protect, restrictTo } = require('../middlewares/auth.middleware');
const { validateProduct, validateProductUpdate } = require('../middlewares/validate.middleware');
const { upload } = require('../config/cloudinary');

const handleUploadError = (err, req, res, next) => {
  if (err) return res.status(400).json({ status: 'error', message: err.message });
  next();
};

// Public routes
router.get('/', productController.getAll);
router.get('/:id', productController.getById);

// Protected routes
router.post(
  '/',
  protect,
  restrictTo('admin', 'employee'),
  upload.single('image'),
  handleUploadError,
  validateProduct,
  productController.create,
);

router.put(
  '/:id',
  protect,
  restrictTo('admin', 'employee'),
  upload.single('image'),
  handleUploadError,
  validateProductUpdate,
  productController.update,
);

router.delete(
  '/:id',
  protect,
  restrictTo('admin'),
  productController.remove,
);

module.exports = router;
