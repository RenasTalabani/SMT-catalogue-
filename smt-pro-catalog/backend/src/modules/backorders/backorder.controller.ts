import { Response } from 'express';
import { AuthRequest } from '../../types';
import { success, error } from '../../shared/utils/response.util';
import * as boService from './backorder.service';

const ERR_MAP: Record<string, { s: number; m: string }> = {
  BACKORDER_NOT_FOUND:      { s: 404, m: 'Backorder request not found' },
  PRODUCT_NOT_FOUND:        { s: 404, m: 'Product not found' },
  PRODUCT_IN_STOCK:         { s: 409, m: 'Product is currently in stock — no backorder needed' },
  INVALID_QUANTITY:         { s: 400, m: 'Quantity must be greater than zero' },
  BACKORDER_EXISTS:         { s: 409, m: 'You already have an active backorder for this product' },
  BACKORDER_NOT_CANCELLABLE:{ s: 409, m: 'Only pending or partial backorders can be cancelled' },
};

const resolve = (e: Error, res: Response): Response => {
  const m = ERR_MAP[e.message];
  return error(res, m?.m ?? e.message, m?.s ?? 500);
};

export const getAll = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const q = req.query as Record<string, string>;
    success(res, await boService.getAll({
      page:      q['page']      ? Number(q['page'])      : 1,
      limit:     q['limit']     ? Number(q['limit'])     : 20,
      status:    q['status'],
      productId: q['productId'] ? Number(q['productId']) : undefined,
    }));
  } catch (e) { resolve(e as Error, res); }
};

export const getById = async (req: AuthRequest, res: Response): Promise<void> => {
  try { success(res, await boService.getById(Number(req.params['id']))); }
  catch (e) { resolve(e as Error, res); }
};

export const getStats = async (_req: AuthRequest, res: Response): Promise<void> => {
  try { success(res, await boService.getStats()); }
  catch (e) { resolve(e as Error, res); }
};

export const create = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const b = req.body as { productId: number; customerId?: number; quantity: number; notes?: string };
    if (!b.productId) { error(res, 'productId is required', 400); return; }
    if (!b.quantity)  { error(res, 'quantity is required', 400); return; }
    success(res, await boService.create(req.user.id, {
      productId:  Number(b.productId),
      customerId: b.customerId ? Number(b.customerId) : undefined,
      quantity:   Number(b.quantity),
      notes:      b.notes,
    }), 'Backorder request created', 201);
  } catch (e) { resolve(e as Error, res); }
};

export const cancel = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await boService.cancel(Number(req.params['id']), req.user.id);
    success(res, null, 'Backorder cancelled');
  } catch (e) { resolve(e as Error, res); }
};
