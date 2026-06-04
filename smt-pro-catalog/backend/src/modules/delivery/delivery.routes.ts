import { Router, RequestHandler, Request, Response } from 'express';
import { protect }    from '../../shared/middlewares/auth.middleware';
import { restrictTo } from '../../shared/middlewares/rbac.middleware';
import { success, error } from '../../shared/utils/response.util';
import * as deliveryService from './delivery.service';

const router = Router();

const resolve = (e: Error, res: Response) => {
  if (e.message === 'ZONE_NOT_FOUND')   return error(res, 'Delivery zone not found', 404);
  if (e.message === 'REGIONS_REQUIRED') return error(res, 'regions array is required', 400);
  if (e.message === 'INVALID_COST')     return error(res, 'Cost must be >= 0', 400);
  return error(res, e.message, 500);
};

// Public — calculate shipping
router.get('/calculate', async (req: Request, res: Response) => {
  try {
    const q = req.query as Record<string, string>;
    if (!q['zoneId'] || !q['orderAmount']) { error(res, 'zoneId and orderAmount required', 400); return; }
    success(res, await deliveryService.calculate(Number(q['zoneId']), Number(q['orderAmount']), q['weight'] ? Number(q['weight']) : 0));
  } catch (e) { resolve(e as Error, res); }
});

router.get('/zones', async (_req: Request, res: Response) => {
  try { success(res, await deliveryService.getAllZones(true)); }
  catch (e) { resolve(e as Error, res); }
});

router.get('/zones/:id', async (req: Request, res: Response) => {
  try { success(res, await deliveryService.getZoneById(Number(req.params['id']))); }
  catch (e) { resolve(e as Error, res); }
});

// Admin management
router.post('/zones',
  protect as RequestHandler, restrictTo('super_admin', 'admin') as RequestHandler,
  async (req: Request, res: Response) => {
    try {
      const b = req.body as Parameters<typeof deliveryService.createZone>[0];
      if (!b.name?.trim()) { error(res, 'name is required', 400); return; }
      success(res, await deliveryService.createZone(b), 'Delivery zone created', 201);
    } catch (e) { resolve(e as Error, res); }
  },
);

router.put('/zones/:id',
  protect as RequestHandler, restrictTo('super_admin', 'admin') as RequestHandler,
  async (req: Request, res: Response) => {
    try { success(res, await deliveryService.updateZone(Number(req.params['id']), req.body as Parameters<typeof deliveryService.updateZone>[1]), 'Zone updated'); }
    catch (e) { resolve(e as Error, res); }
  },
);

router.delete('/zones/:id',
  protect as RequestHandler, restrictTo('super_admin', 'admin') as RequestHandler,
  async (req: Request, res: Response) => {
    try { await deliveryService.deleteZone(Number(req.params['id'])); success(res, null, 'Zone deleted'); }
    catch (e) { resolve(e as Error, res); }
  },
);

router.post('/zones/:id/rates',
  protect as RequestHandler, restrictTo('super_admin', 'admin') as RequestHandler,
  async (req: Request, res: Response) => {
    try {
      const b = req.body as Parameters<typeof deliveryService.addRate>[1];
      if (b.baseCost === undefined) { error(res, 'baseCost is required', 400); return; }
      success(res, await deliveryService.addRate(Number(req.params['id']), b), 'Rate added', 201);
    } catch (e) { resolve(e as Error, res); }
  },
);

router.delete('/rates/:rateId',
  protect as RequestHandler, restrictTo('super_admin', 'admin') as RequestHandler,
  async (req: Request, res: Response) => {
    try { await deliveryService.deleteRate(Number(req.params['rateId'])); success(res, null, 'Rate deleted'); }
    catch (e) { resolve(e as Error, res); }
  },
);

export default router;
