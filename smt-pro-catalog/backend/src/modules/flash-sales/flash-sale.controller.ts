import { Response } from 'express';
import { AuthRequest } from '../../types';
import { success, error } from '../../shared/utils/response.util';
import * as flashSaleService from './flash-sale.service';

const ERR_MAP: Record<string, { s: number; m: string }> = {
  FLASH_SALE_NOT_FOUND:  { s: 404, m: 'Flash sale not found' },
  END_BEFORE_START:      { s: 400, m: 'End date must be after start date' },
  PRICE_OR_PCT_REQUIRED: { s: 400, m: 'Either salePrice or discountPct is required' },
};

const resolve = (e: Error, res: Response): Response => {
  const m = ERR_MAP[e.message];
  return error(res, m?.m ?? e.message, m?.s ?? 500);
};

export const getActive = async (_req: AuthRequest, res: Response): Promise<void> => {
  try { success(res, await flashSaleService.getActive()); }
  catch (e) { resolve(e as Error, res); }
};

export const getAll = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const q = req.query as Record<string, string>;
    success(res, await flashSaleService.getAll({
      page:       q['page']       ? Number(q['page'])   : 1,
      limit:      q['limit']      ? Number(q['limit'])  : 20,
      activeOnly: q['activeOnly'] === 'true',
      search:     q['search'],
    }));
  } catch (e) { resolve(e as Error, res); }
};

export const getById = async (req: AuthRequest, res: Response): Promise<void> => {
  try { success(res, await flashSaleService.getById(Number(req.params['id']))); }
  catch (e) { resolve(e as Error, res); }
};

export const getStats = async (_req: AuthRequest, res: Response): Promise<void> => {
  try { success(res, await flashSaleService.getStats()); }
  catch (e) { resolve(e as Error, res); }
};

export const create = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const b = req.body as Parameters<typeof flashSaleService.create>[0];
    if (!b.title?.trim())  { error(res, 'title is required', 400); return; }
    if (!b.startAt)        { error(res, 'startAt is required', 400); return; }
    if (!b.endAt)          { error(res, 'endAt is required', 400); return; }
    success(res, await flashSaleService.create(b), 'Flash sale created', 201);
  } catch (e) { resolve(e as Error, res); }
};

export const update = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    success(res, await flashSaleService.update(Number(req.params['id']), req.body as Parameters<typeof flashSaleService.update>[1]), 'Flash sale updated');
  } catch (e) { resolve(e as Error, res); }
};

export const remove = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await flashSaleService.remove(Number(req.params['id']));
    success(res, null, 'Flash sale deleted');
  } catch (e) { resolve(e as Error, res); }
};
