import { Response } from 'express';
import { AuthRequest } from '../../types';
import { success, error } from '../../shared/utils/response.util';
import * as spService from './supplier-product.service';

const ERR_MAP: Record<string, { s: number; m: string }> = {
  PRODUCT_NOT_FOUND:  { s: 404, m: 'Product not found' },
  SUPPLIER_NOT_FOUND: { s: 404, m: 'Supplier not found' },
  LINK_NOT_FOUND:     { s: 404, m: 'Supplier-product link not found' },
};

const resolve = (e: Error, res: Response): Response => {
  const m = ERR_MAP[e.message];
  return error(res, m?.m ?? e.message, m?.s ?? 500);
};

export const getByProduct = async (req: AuthRequest, res: Response): Promise<void> => {
  try { success(res, await spService.getByProduct(Number(req.params['productId']))); }
  catch (e) { resolve(e as Error, res); }
};

export const getBySupplier = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const q = req.query as Record<string, string>;
    success(res, await spService.getBySupplier(
      Number(req.params['supplierId']),
      q['page']  ? Number(q['page'])  : 1,
      q['limit'] ? Number(q['limit']) : 20,
    ));
  } catch (e) { resolve(e as Error, res); }
};

export const suggestSupplier = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const q = req.query as Record<string, string>;
    if (!q['productId'] || !q['qty']) { error(res, 'productId and qty are required', 400); return; }
    const result = await spService.suggestSupplier(Number(q['productId']), Number(q['qty']));
    success(res, result);
  } catch (e) { resolve(e as Error, res); }
};

export const upsert = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const b = req.body as Parameters<typeof spService.upsert>[2];
    if (!b.unitCost || b.unitCost <= 0) { error(res, 'unitCost must be positive', 400); return; }
    success(res, await spService.upsert(
      Number(req.params['supplierId']),
      Number(req.params['productId']),
      b,
    ), 'Supplier-product link saved', 200);
  } catch (e) { resolve(e as Error, res); }
};

export const remove = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await spService.remove(Number(req.params['supplierId']), Number(req.params['productId']));
    success(res, null, 'Link removed');
  } catch (e) { resolve(e as Error, res); }
};

export const setPreferred = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    success(res, await spService.setPreferred(
      Number(req.params['supplierId']),
      Number(req.params['productId']),
    ), 'Preferred supplier updated');
  } catch (e) { resolve(e as Error, res); }
};

export const bulkUpsert = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const b = req.body as { items: Array<{ productId: number; unitCost: number; [k: string]: unknown }> };
    if (!Array.isArray(b.items) || !b.items.length) { error(res, 'items array is required', 400); return; }
    success(res, await spService.bulkUpsert(Number(req.params['supplierId']), b.items as Parameters<typeof spService.bulkUpsert>[1]), 'Bulk upsert completed');
  } catch (e) { resolve(e as Error, res); }
};
