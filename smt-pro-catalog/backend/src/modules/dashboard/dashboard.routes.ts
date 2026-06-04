import { Router, RequestHandler, Response, Request } from 'express';
import { protect }    from '../../shared/middlewares/auth.middleware';
import { restrictTo } from '../../shared/middlewares/rbac.middleware';
import { success } from '../../shared/utils/response.util';
import * as dashService from './dashboard.service';

const router = Router();
router.use(protect as RequestHandler, restrictTo('super_admin', 'admin') as RequestHandler);

const handler = (fn: (q: Record<string, string>) => Promise<unknown>) =>
  async (req: Request, res: Response): Promise<void> => {
    try { success(res, await fn(req.query as Record<string, string>)); }
    catch (e) { res.status(500).json({ success: false, message: (e as Error).message }); }
  };

router.get('/overview',        handler(() => dashService.getOverview()));
router.get('/revenue',         handler((q) => dashService.getRevenueChart(
  (q['type'] as 'daily' | 'monthly' | 'yearly') ?? 'daily',
  q['days'] ? Number(q['days']) : 30,
)));
router.get('/profit',          handler((q) => dashService.getProfitBreakdown(q['months'] ? Number(q['months']) : 6)));
router.get('/top-employees',   handler((q) => dashService.getTopEmployees(q['limit'] ? Number(q['limit']) : 10)));
router.get('/top-products',    handler((q) => dashService.getTopProducts(q['limit'] ? Number(q['limit']) : 10)));
router.get('/expenses',        handler(() => dashService.getExpenseBreakdown()));

export default router;
