import { Router, RequestHandler, Response } from 'express';
import { protect } from '../../shared/middlewares/auth.middleware';
import { AuthRequest } from '../../types';
import { success, error } from '../../shared/utils/response.util';
import * as myOrdersService from './my-orders.service';

const router = Router();
router.use(protect as RequestHandler);

const ERR_MAP: Record<string, { s: number; m: string }> = {
  ORDER_NOT_FOUND: { s: 404, m: 'Order not found' },
};
const resolve = (e: Error, res: Response) => {
  const msg = e.message;
  if (msg.startsWith('INSUFFICIENT_STOCK:')) return error(res, `Cannot reorder — ${msg.split(':')[1]}`, 400);
  const m = ERR_MAP[msg];
  return error(res, m?.m ?? msg, m?.s ?? 500);
};

const getMyOrders = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const q = req.query as Record<string, string>;
    success(res, await myOrdersService.getMyOrders(req.user.id, {
      page:          q['page']          ? Number(q['page'])          : 1,
      limit:         q['limit']         ? Number(q['limit'])         : 20,
      status:        q['status'],
      paymentStatus: q['paymentStatus'],
    }));
  } catch (e) { resolve(e as Error, res); }
};

const getStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try { success(res, await myOrdersService.getMyStats(req.user.id)); }
  catch (e) { resolve(e as Error, res); }
};

const getOrderDetail = async (req: AuthRequest, res: Response): Promise<void> => {
  try { success(res, await myOrdersService.getOrderDetail(Number(req.params['id']), req.user.id)); }
  catch (e) { resolve(e as Error, res); }
};

const reorder = async (req: AuthRequest, res: Response): Promise<void> => {
  try { success(res, await myOrdersService.reorder(Number(req.params['id']), req.user.id), 'Reorder placed', 201); }
  catch (e) { resolve(e as Error, res); }
};

router.get('/stats',       getStats       as unknown as RequestHandler);
router.get('/',            getMyOrders    as unknown as RequestHandler);
router.get('/:id',         getOrderDetail as unknown as RequestHandler);
router.post('/:id/reorder', reorder       as unknown as RequestHandler);

export default router;
