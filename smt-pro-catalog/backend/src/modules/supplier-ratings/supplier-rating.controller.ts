import { Response } from 'express';
import { AuthRequest } from '../../types';
import { success, error } from '../../shared/utils/response.util';
import * as ratingService from './supplier-rating.service';

const ERR_MAP: Record<string, { s: number; m: string }> = {
  RATING_NOT_FOUND:      { s: 404, m: 'Rating not found' },
  RATING_ALREADY_EXISTS: { s: 409, m: 'This purchase order has already been rated' },
  PO_NOT_FOUND:          { s: 404, m: 'Purchase order not found' },
  PO_SUPPLIER_MISMATCH:  { s: 400, m: 'Purchase order does not belong to this supplier' },
  SUPPLIER_NOT_FOUND:    { s: 404, m: 'Supplier not found' },
  INVALID_FILL_RATE:     { s: 400, m: 'fillRate must be between 0 and 100' },
};

const resolve = (e: Error, res: Response): Response => {
  if (e.message.startsWith('INVALID_SCORE:')) {
    const field = e.message.split(':')[1];
    return error(res, `${field ?? 'score'} must be an integer between 1 and 5`, 400);
  }
  const m = ERR_MAP[e.message];
  return error(res, m?.m ?? e.message, m?.s ?? 500);
};

export const getAll = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const q = req.query as Record<string, string>;
    success(res, await ratingService.getAll({
      page:       q['page']       ? Number(q['page'])       : 1,
      limit:      q['limit']      ? Number(q['limit'])      : 20,
      supplierId: q['supplierId'] ? Number(q['supplierId']) : undefined,
    }));
  } catch (e) { resolve(e as Error, res); }
};

export const getById = async (req: AuthRequest, res: Response): Promise<void> => {
  try { success(res, await ratingService.getById(Number(req.params['id']))); }
  catch (e) { resolve(e as Error, res); }
};

export const getSupplierStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try { success(res, await ratingService.getSupplierStats(Number(req.params['supplierId']))); }
  catch (e) { resolve(e as Error, res); }
};

export const getLeaderboard = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const limit = req.query['limit'] ? Number(req.query['limit']) : 10;
    success(res, await ratingService.getLeaderboard(limit));
  } catch (e) { resolve(e as Error, res); }
};

export const create = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const b = req.body as Parameters<typeof ratingService.create>[0];
    if (!b.supplierId)      { error(res, 'supplierId is required', 400); return; }
    if (!b.purchaseOrderId) { error(res, 'purchaseOrderId is required', 400); return; }
    if (b.deliveredOnTime === undefined) { error(res, 'deliveredOnTime is required', 400); return; }
    if (b.fillRate === undefined)        { error(res, 'fillRate is required', 400); return; }

    success(res, await ratingService.create(b, req.user.id), 'Supplier rating submitted', 201);
  } catch (e) { resolve(e as Error, res); }
};

export const remove = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await ratingService.remove(Number(req.params['id']));
    success(res, null, 'Rating deleted');
  } catch (e) { resolve(e as Error, res); }
};
