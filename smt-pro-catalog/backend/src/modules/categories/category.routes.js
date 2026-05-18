const router = require('express').Router();
const ctrl   = require('./category.controller');
const { protect } = require('../../shared/middlewares/auth.middleware');
const { restrictTo } = require('../../shared/middlewares/rbac.middleware');
const { createRules, updateRules, listRules } = require('./category.validation');

// Public: list and single category read
router.get('/',    listRules, ctrl.list);
router.get('/:id', ctrl.getOne);

// Protected: write operations (admin only)
router.use(protect);
router.post('/',    restrictTo('admin'), createRules, ctrl.create);
router.put('/:id',  restrictTo('admin'), updateRules, ctrl.update);
router.delete('/:id', restrictTo('admin'), ctrl.remove);

module.exports = router;
