import { Request, Response } from 'express';
import * as productService from './product.service';
import { success, error } from '../../shared/utils/response.util';

const ERR_MAP: Record<string, { s: number; m: string }> = {
  PRODUCT_NOT_FOUND: { s: 404, m: 'Product not found' },
};

const resolve = (e: Error, res: Response): Response => {
  const m = ERR_MAP[e.message];
  return error(res, m?.m ?? e.message, m?.s ?? 500);
};

export const getAll = async (req: Request, res: Response): Promise<void> => {
  try {
    success(res, await productService.getAll(req.query as Record<string, string>));
  } catch (e) { resolve(e as Error, res); }
};

export const getById = async (req: Request, res: Response): Promise<void> => {
  try {
    success(res, await productService.getById(req.params['id']!));
  } catch (e) { resolve(e as Error, res); }
};

export const create = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, description, price, quantity, category } = req.body as Record<string, unknown>;
    const product = await productService.create(
      { name: String(name), description: description ? String(description) : undefined, price: Number(price), quantity: Number(quantity), category: String(category) },
      req.file?.buffer,
      req.file?.mimetype,
    );
    success(res, product, 'Product created', 201);
  } catch (e) { resolve(e as Error, res); }
};

export const update = async (req: Request, res: Response): Promise<void> => {
  try {
    const allowed = ['name', 'description', 'price', 'quantity', 'category'] as const;
    const updates: Record<string, unknown> = {};
    for (const f of allowed) {
      if ((req.body as Record<string, unknown>)[f] !== undefined) updates[f] = (req.body as Record<string, unknown>)[f];
    }
    success(res, await productService.update(req.params['id']!, updates as Parameters<typeof productService.update>[1], req.file?.buffer));
  } catch (e) { resolve(e as Error, res); }
};

export const remove = async (req: Request, res: Response): Promise<void> => {
  try {
    await productService.remove(req.params['id']!);
    success(res, null, 'Product deleted');
  } catch (e) { resolve(e as Error, res); }
};
