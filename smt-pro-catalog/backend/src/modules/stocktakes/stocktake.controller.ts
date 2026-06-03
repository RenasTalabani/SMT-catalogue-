import { Response } from 'express';
import { AuthRequest } from '../../types';
import { success, error } from '../../shared/utils/response.util';
import * as stocktakeService from './stocktake.service';

const ERR_MAP: Record<string, { s: number; m: string }> = {
  STOCKTAKE_NOT_FOUND:       { s: 404, m: 'Stocktake not found' },
  STOCKTAKE_NOT_DRAFT:       { s: 409, m: 'Stocktake must be in DRAFT status to start' },
  STOCKTAKE_NOT_IN_PROGRESS: { s: 409, m: 'Stocktake must be IN_PROGRESS to complete' },
  STOCKTAKE_NOT_EDITABLE:    { s: 409, m: 'Stocktake cannot be edited in its current status' },
  STOCKTAKE_COMPLETED:       { s: 409, m: 'Completed stocktakes cannot be cancelled' },
  NO_PRODUCTS:               { s: 400, m: 'No active products found to include in stocktake' },
  NO_COUNTED_ITEMS:          { s: 400, m: 'At least one item must be counted before completing' },
};

const resolve = (e: Error, res: Response): Response => {
  const m = ERR_MAP[e.message];
  return error(res, m?.m ?? e.message, m?.s ?? 500);
};

export const getAll = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const q = req.query as Record<string, string>;
    success(res, await stocktakeService.getAll({
      page:   q['page']   ? Number(q['page'])  : 1,
      limit:  q['limit']  ? Number(q['limit']) : 20,
      status: q['status'],
    }));
  } catch (e) { resolve(e as Error, res); }
};

export const getById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    success(res, await stocktakeService.getById(Number(req.params['id'])));
  } catch (e) { resolve(e as Error, res); }
};

export const getStats = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    success(res, await stocktakeService.getStats());
  } catch (e) { resolve(e as Error, res); }
};

export const create = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const b = req.body as { notes?: string; productIds?: number[] };
    success(res, await stocktakeService.create(req.user.id, { notes: b.notes, productIds: b.productIds }), 'Stocktake created', 201);
  } catch (e) { resolve(e as Error, res); }
};

export const start = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    success(res, await stocktakeService.start(Number(req.params['id'])), 'Stocktake started');
  } catch (e) { resolve(e as Error, res); }
};

export const updateCounts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const b = req.body as { items: Array<{ productId: number; countedQty: number; notes?: string }> };
    if (!Array.isArray(b.items) || !b.items.length) { error(res, 'items array required', 400); return; }
    success(res, await stocktakeService.updateCounts(Number(req.params['id']), b.items), 'Counts updated');
  } catch (e) { resolve(e as Error, res); }
};

export const complete = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    success(res, await stocktakeService.complete(Number(req.params['id']), req.user.id), 'Stocktake completed — stock adjusted');
  } catch (e) { resolve(e as Error, res); }
};

export const cancel = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await stocktakeService.cancel(Number(req.params['id']));
    success(res, null, 'Stocktake cancelled');
  } catch (e) { resolve(e as Error, res); }
};
