import { Response } from 'express';
import { AuthRequest } from '../../types';
import { success, error } from '../../shared/utils/response.util';
import * as plService from './price-list.service';

const ERR_MAP: Record<string, { s: number; m: string }> = {
  PRICE_LIST_NOT_FOUND:    { s: 404, m: 'Price list not found' },
  PRICE_LIST_IS_DEFAULT:   { s: 409, m: 'Cannot delete the default price list' },
  PRICE_LIST_HAS_CUSTOMERS:{ s: 409, m: 'Cannot delete a price list assigned to customers' },
  PRODUCT_NOT_FOUND:       { s: 404, m: 'Product not found' },
};

const resolve = (e: Error, res: Response): Response => {
  const m = ERR_MAP[e.message];
  return error(res, m?.m ?? e.message, m?.s ?? 500);
};

export const getAll = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const q = req.query as Record<string, string>;
    success(res, await plService.getAll({
      page:       q['page']       ? Number(q['page'])       : 1,
      limit:      q['limit']      ? Number(q['limit'])      : 20,
      activeOnly: q['activeOnly'] === 'true',
    }));
  } catch (e) { resolve(e as Error, res); }
};

export const getById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    success(res, await plService.getById(Number(req.params['id'])));
  } catch (e) { resolve(e as Error, res); }
};

export const getEffectivePrice = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const q = req.query as Record<string, string>;
    if (!q['productId']) { error(res, 'productId is required', 400); return; }
    const price = await plService.getEffectivePrice(
      Number(q['productId']),
      q['customerId'] ? Number(q['customerId']) : undefined,
    );
    success(res, { price });
  } catch (e) { resolve(e as Error, res); }
};

export const create = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const b = req.body as { name: string; description?: string; type: 'RETAIL' | 'WHOLESALE' | 'VIP' | 'CUSTOM'; isDefault?: boolean; isActive?: boolean };
    if (!b.name?.trim()) { error(res, 'name is required', 400); return; }
    if (!['RETAIL','WHOLESALE','VIP','CUSTOM'].includes(b.type)) { error(res, 'Invalid type', 400); return; }
    success(res, await plService.create(b), 'Price list created', 201);
  } catch (e) { resolve(e as Error, res); }
};

export const update = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    success(res, await plService.update(Number(req.params['id']), req.body as Parameters<typeof plService.update>[1]), 'Price list updated');
  } catch (e) { resolve(e as Error, res); }
};

export const remove = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await plService.remove(Number(req.params['id']));
    success(res, null, 'Price list deleted');
  } catch (e) { resolve(e as Error, res); }
};

export const upsertItems = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const b = req.body as { items: Array<{ productId: number; price: number; discount?: number }> };
    if (!Array.isArray(b.items) || !b.items.length) { error(res, 'items array is required', 400); return; }
    success(res, await plService.upsertItems(Number(req.params['id']), b.items), 'Price list items updated');
  } catch (e) { resolve(e as Error, res); }
};

export const removeItem = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await plService.removeItem(Number(req.params['id']), Number(req.params['productId']));
    success(res, null, 'Item removed from price list');
  } catch (e) { resolve(e as Error, res); }
};

export const assignToCustomer = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { customerId, priceListId } = req.body as { customerId: number; priceListId: number | null };
    if (!customerId) { error(res, 'customerId is required', 400); return; }
    success(res, await plService.assignToCustomer(Number(customerId), priceListId), 'Price list assigned');
  } catch (e) { resolve(e as Error, res); }
};
