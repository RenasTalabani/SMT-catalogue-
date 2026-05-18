const reportService = require('../services/report.service');
const { success, error } = require('../utils/response.util');

const wrap = (fn, label) => async (req, res) => {
  try {
    const data = await fn(req);
    return success(res, data, `${label} fetched`);
  } catch (err) {
    return error(res, `Failed to fetch ${label.toLowerCase()}`, 500);
  }
};

const getDashboardSummary  = wrap(() => reportService.getDashboardSummary(),                              'Dashboard summary');
const getDailyReport       = wrap((req) => reportService.getDailyReport(req.query.date),                 'Daily report');
const getMonthlyReport     = wrap((req) => reportService.getMonthlyReport(req.query.year, req.query.month), 'Monthly report');
const getLowStock          = wrap((req) => reportService.getLowStock(req.query.threshold),               'Low stock report');
const getTopProducts       = wrap((req) => reportService.getTopProducts(parseInt(req.query.limit) || 5), 'Top products');
const getRevenueByCategory = wrap(() => reportService.getRevenueByCategory(),                            'Revenue by category');
const getAverageOrderValue = wrap(() => reportService.getAverageOrderValue(),                            'Average order value');
const getGrowthRate        = wrap(() => reportService.getGrowthRate(),                                   'Growth rate');

module.exports = {
  getDashboardSummary, getDailyReport, getMonthlyReport, getLowStock,
  getTopProducts, getRevenueByCategory, getAverageOrderValue, getGrowthRate,
};
