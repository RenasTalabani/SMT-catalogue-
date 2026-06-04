import { Request, Response } from 'express';
import { AuthRequest } from '../../types';
import { success, error } from '../../shared/utils/response.util';
import * as variantService from './variant.service';

const ERR_MAP: Record<string, { s: number; m: string }> = {
  PRODUCT_NOT_FOUND:   { s: 404, m: 'Parent product not found' },
  VARIANT_NOT_FOUND:   { s: 404, m: 'Variant not found' },
  SKU_TAKEN:           { s: 409, m: 'This SKU is already in use' },
  INSUFFICIENT_STOCK:  { s: 400, m: 'Adjustment would result in negative stock' },
};

const resolve = (e: Error, res: Response): Response => {
  const m = ERR_MAP[e.message];
  return error(res, m?.m ?? e.message, m?.s ?? 500);
};

export const getByProduct = async (req: Request, res: Response): Promise<void> => {
  try { success(res, await variantService.getByProduct(Number(req.params['productId']))); }
  catch (e) { resolve(e as Error, res); }
};

export const getById = async (req: Request, res: Response): Promise<void> => {
  try { success(res, await variantService.getById(Number(req.params['id']))); }
  catch (e) { resolve(e as Error, res); }
};

export const getLowStock = async (req: Request, res: Response): Promise<void> => {
  try {
    const t = req.query['threshold'] ? Number(req.query['threshold']) : 10;
    success(res, await variantService.getLowStockVariants(t));
  } catch (e) { resolve(e as Error, res); }
};

export const create = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const b = req.body as Parameters<typeof variantService.create>[1];
    if (!b.name?.trim()) { error(res, 'name is required', 400); return; }
    if (b.price === undefined) { error(res, 'price is required', 400); return; }
    success(res, await variantService.create(Number(req.params['productId']), b), 'Variant created', 201);
  } catch (e) { resolve(e as Error, res); }
};

export const bulkCreate = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const b = req.body as { variants: Parameters<typeof variantService.bulkCreate>[1] };
    if (!Array.isArray(b.variants) || !b.variants.length) { error(res, 'variants array required', 400); return; }
    success(res, await variantService.bulkCreate(Number(req.params['productId']), b.variants), 'Variants created', 201);
  } catch (e) { resolve(e as Error, res); }
};

export const update = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    success(res, await variantService.update(Number(req.params['id']), req.body as Parameters<typeof variantService.update>[1]), 'Variant updated');
  } catch (e) { resolve(e as Error, res); }
};

export const adjustStock = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const b = req.body as { delta: number; notes?: string };
    if (b.delta === undefined) { error(res, 'delta is required', 400); return; }
    success(res, await variantService.adjustStock(Number(req.params['id']), Number(b.delta), req.user.id, b.notes), 'Stock adjusted');
  } catch (e) { resolve(e as Error, res); }
};

export const remove = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await variantService.remove(Number(req.params['id']));
    success(res, null, 'Variant deleted');
  } catch (e) { resolve(e as Error, res); }
};
