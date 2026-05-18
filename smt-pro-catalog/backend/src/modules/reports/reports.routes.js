const router             = require('express').Router();
const reportsController  = require('./reports.controller');
const { protect }        = require('../../shared/middlewares/auth.middleware');
const { restrictTo }     = require('../../shared/middlewares/rbac.middleware');

router.use(protect, restrictTo('admin', 'employee'));

router.get('/dashboard',          reportsController.getDashboard);
router.get('/sales',              reportsController.getSalesAnalytics);
router.get('/top-products',       reportsController.getTopProducts);
router.get('/category-breakdown', reportsController.getCategoryBreakdown);

// Audit logs: admin only
router.get('/audit',              restrictTo('admin'), reportsController.getAuditLogs);

module.exports = router;
