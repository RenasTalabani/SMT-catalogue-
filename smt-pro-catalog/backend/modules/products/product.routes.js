const express = require('express');
const router = express.Router();
const ctrl = require('./product.controller');

router.get('/', ctrl.getProducts);
router.get('/dashboard', ctrl.getDashboardProducts);
router.get('/slug/:slug', ctrl.getProductBySlug);
router.get('/:id', ctrl.getProductById);
router.post('/', ctrl.productValidation, ctrl.createProduct);
router.put('/:id', ctrl.updateProduct);
router.delete('/:id', ctrl.deleteProduct);

module.exports = router;
