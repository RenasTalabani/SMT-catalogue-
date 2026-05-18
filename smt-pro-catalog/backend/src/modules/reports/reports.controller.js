const reportsService     = require('./reports.service');
const { success, error } = require('../../shared/utils/response.util');

const resolve = (e, res) => error(res, e.message, 500);

const getDashboard = async (req, res) => {
  try { return success(res, await reportsService.getDashboard()); }
  catch (e) { return resolve(e, res); }
};

const getSalesAnalytics = async (req, res) => {
  try { return success(res, await reportsService.getSalesAnalytics(req.query)); }
  catch (e) { return resolve(e, res); }
};

const getTopProducts = async (req, res) => {
  try { return success(res, await reportsService.getTopProducts(req.query)); }
  catch (e) { return resolve(e, res); }
};

const getCategoryBreakdown = async (req, res) => {
  try { return success(res, await reportsService.getCategoryBreakdown()); }
  catch (e) { return resolve(e, res); }
};

const getAuditLogs = async (req, res) => {
  try { return success(res, await reportsService.getAuditLogs(req.query)); }
  catch (e) { return resolve(e, res); }
};

module.exports = { getDashboard, getSalesAnalytics, getTopProducts, getCategoryBreakdown, getAuditLogs };
