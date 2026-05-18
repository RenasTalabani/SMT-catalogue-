const express = require('express');
const router  = express.Router();

const reportController = require('../controllers/report.controller');
const { protect, restrictTo } = require('../middlewares/auth.middleware');
const {
  validateDailyReport,
  validateMonthlyReport,
  validateLowStock,
} = require('../middlewares/validateReport.middleware');

router.use(protect);
router.use(restrictTo('admin', 'employee'));

// Core reports
router.get('/dashboard',            reportController.getDashboardSummary);
router.get('/daily',   validateDailyReport,   reportController.getDailyReport);
router.get('/monthly', validateMonthlyReport,  reportController.getMonthlyReport);
router.get('/low-stock', validateLowStock,     reportController.getLowStock);

// Advanced analytics
router.get('/top-products',         reportController.getTopProducts);
router.get('/revenue-by-category',  reportController.getRevenueByCategory);
router.get('/average-order-value',  reportController.getAverageOrderValue);
router.get('/growth',               reportController.getGrowthRate);

module.exports = router;
