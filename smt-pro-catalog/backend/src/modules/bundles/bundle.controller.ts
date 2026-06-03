import { Response } from 'express';
import { AuthRequest } from '../../types';
import { success, error } from '../../shared/utils/response.util';
import * as bundleService from './bundle.service';

const ERR_MAP: Record<string, { s: number; m: string }> = {
  BUNDLE_NOT_FOUND:      { s: 404, m: 'Bundle not found' },
  BUNDLE_ITEMS_REQUIRED: { s: 400, m: 'At least one item is required' },
  BUNDLE_INACTIVE:       { s: 409, m: 'Bundle is not active' },
  PRODUCT_NOT_FOUND:     { s: 404, m: 'One or more products not found' },
};

const resolve = (e: Error, res: Response): Response => {
  const msg = e.message;
  if (msg.startsWith('INSUFFICIENT_STOCK:')) {
    return error(res, 'Insufficient stock for one or more bundle items', 409);
  }
  const m = ERR_MAP[msg];
  return error(res, m?.m ?? msg, m?.s ?? 500);
};

export const getAll = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const q = req.query as Record<string, string>;
    success(res, await bundleService.getAll({
      page:       q['page']       ? Number(q['page'])       : 1,
      limit:      q['limit']      ? Number(q['limit'])      : 20,
      activeOnly: q['activeOnly'] === 'true',
    }));
  } catch (e) { resolve(e as Error, res); }
};

export const getById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    success(res, await bundleService.getById(Number(req.params['id'])));
  } catch (e) { resolve(e as Error, res); }
};

export const checkStock = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    success(res, await bundleService.checkStock(Number(req.params['id'])));
  } catch (e) { resolve(e as Error, res); }
};

export const create = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const b = req.body as Parameters<typeof bundleService.create>[0];
    if (!b.name?.trim())              { error(res, 'name is required', 400); return; }
    if (!b.price || b.price <= 0)     { error(res, 'price must be positive', 400); return; }
    if (!Array.isArray(b.items) || !b.items.length) { error(res, 'items array is required', 400); return; }
    success(res, await bundleService.create(b), 'Bundle created', 201);
  } catch (e) { resolve(e as Error, res); }
};

export const update = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    success(res, await bundleService.update(Number(req.params['id']), req.body as Parameters<typeof bundleService.update>[1]), 'Bundle updated');
  } catch (e) { resolve(e as Error, res); }
};

export const remove = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await bundleService.remove(Number(req.params['id']));
    success(res, null, 'Bundle deleted');
  } catch (e) { resolve(e as Error, res); }
};

export const orderBundle = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const b = req.body as { customerId?: number; paymentMethod?: string; notes?: string };
    success(res, await bundleService.createOrderFromBundle(Number(req.params['id']), req.user.id, b), 'Bundle order created', 201);
  } catch (e) { resolve(e as Error, res); }
};
