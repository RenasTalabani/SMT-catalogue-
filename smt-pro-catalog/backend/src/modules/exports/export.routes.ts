import { Router, Request, Response, RequestHandler } from 'express';
import { protect }    from '../../shared/middlewares/auth.middleware';
import { restrictTo } from '../../shared/middlewares/rbac.middleware';
import * as exportService from '../../services/export.service';

const router = Router();
router.use(protect as RequestHandler, restrictTo('super_admin', 'admin') as RequestHandler);

type Format = 'excel' | 'csv';

const sendExport = (res: Response, data: unknown, format: Format, filename: string): void => {
  if (format === 'csv') {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
    res.send(data as string);
  } else {
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
    res.send(Buffer.from(data as ArrayBuffer));
  }
};

const fmt = (req: Request): Format =>
  req.query['format'] === 'csv' ? 'csv' : 'excel';

router.get('/products', async (req: Request, res: Response) => {
  sendExport(res, await exportService.exportProducts(fmt(req)), fmt(req), `products-${Date.now()}`);
});

router.get('/orders', async (req: Request, res: Response) => {
  const f = fmt(req);
  sendExport(res, await exportService.exportOrders(f, req.query['from'] as string, req.query['to'] as string), f, `orders-${Date.now()}`);
});

router.get('/customers', async (req: Request, res: Response) => {
  const f = fmt(req);
  sendExport(res, await exportService.exportCustomers(f), f, `customers-${Date.now()}`);
});

router.get('/suppliers', async (req: Request, res: Response) => {
  const f = fmt(req);
  sendExport(res, await exportService.exportSuppliers(f), f, `suppliers-${Date.now()}`);
});

router.get('/finance', async (req: Request, res: Response) => {
  const f = fmt(req);
  sendExport(res, await exportService.exportFinance(f, req.query['from'] as string, req.query['to'] as string), f, `finance-${Date.now()}`);
});

export default router;
