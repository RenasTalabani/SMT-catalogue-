const express = require('express');
const router = express.Router();
const ctrl = require('./category.controller');

router.get('/', ctrl.getCategories);
router.get('/:id', ctrl.getCategoryById);
router.post('/', ctrl.categoryValidation, ctrl.createCategory);
router.put('/:id', ctrl.updateCategory);
router.delete('/:id', ctrl.deleteCategory);

module.exports = router;
