import { Router, RequestHandler } from 'express';
import * as reportsController from './reports.controller';
import { protect } from '../../shared/middlewares/auth.middleware';
import { restrictTo } from '../../shared/middlewares/rbac.middleware';

const router = Router();

router.use(protect as RequestHandler, restrictTo('super_admin', 'admin') as RequestHandler);

router.get('/dashboard',          reportsController.getDashboard as RequestHandler);
router.get('/sales',              reportsController.getSalesAnalytics as RequestHandler);
router.get('/top-products',       reportsController.getTopProducts as RequestHandler);
router.get('/category-breakdown', reportsController.getCategoryBreakdown as RequestHandler);
router.get('/audit',              restrictTo('super_admin', 'admin') as RequestHandler, reportsController.getAuditLogs     as RequestHandler);
router.get('/audit/export',       restrictTo('super_admin', 'admin') as RequestHandler, reportsController.exportAuditCsv   as RequestHandler);

export default router;
