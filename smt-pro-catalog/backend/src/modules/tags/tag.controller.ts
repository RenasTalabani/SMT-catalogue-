import { Request, Response } from 'express';
import { AuthRequest } from '../../types';
import { success, error } from '../../shared/utils/response.util';
import * as tagService from './tag.service';

const ERR_MAP: Record<string, { s: number; m: string }> = {
  TAG_NOT_FOUND:    { s: 404, m: 'Tag not found' },
  TAG_EXISTS:       { s: 409, m: 'A tag with this name already exists' },
  PRODUCT_NOT_FOUND:{ s: 404, m: 'Product not found' },
};

const resolve = (e: Error, res: Response): Response => {
  const m = ERR_MAP[e.message];
  return error(res, m?.m ?? e.message, m?.s ?? 500);
};

export const getAll = async (_req: Request, res: Response): Promise<void> => {
  try { success(res, await tagService.getAll()); }
  catch (e) { resolve(e as Error, res); }
};

export const getById = async (req: Request, res: Response): Promise<void> => {
  try { success(res, await tagService.getById(Number(req.params['id']))); }
  catch (e) { resolve(e as Error, res); }
};

export const getProductsByTag = async (req: Request, res: Response): Promise<void> => {
  try {
    const q = req.query as Record<string, string>;
    success(res, await tagService.getProductsByTag(
      req.params['slug']!,
      q['page']  ? Number(q['page'])  : 1,
      q['limit'] ? Number(q['limit']) : 20,
    ));
  } catch (e) { resolve(e as Error, res); }
};

export const create = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const b = req.body as { name: string; color?: string };
    if (!b.name?.trim()) { error(res, 'name is required', 400); return; }
    success(res, await tagService.create(b), 'Tag created', 201);
  } catch (e) { resolve(e as Error, res); }
};

export const update = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    success(res, await tagService.update(Number(req.params['id']), req.body as { name?: string; color?: string }), 'Tag updated');
  } catch (e) { resolve(e as Error, res); }
};

export const remove = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await tagService.remove(Number(req.params['id']));
    success(res, null, 'Tag deleted');
  } catch (e) { resolve(e as Error, res); }
};

export const setProductTags = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const b = req.body as { tagIds: number[] };
    if (!Array.isArray(b.tagIds)) { error(res, 'tagIds array is required', 400); return; }
    success(res, await tagService.setProductTags(Number(req.params['productId']), b.tagIds), 'Product tags updated');
  } catch (e) { resolve(e as Error, res); }
};

export const addTag = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    success(res, await tagService.addTag(Number(req.params['productId']), Number(req.params['tagId'])), 'Tag added');
  } catch (e) { resolve(e as Error, res); }
};

export const removeTag = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await tagService.removeTag(Number(req.params['productId']), Number(req.params['tagId']));
    success(res, null, 'Tag removed');
  } catch (e) { resolve(e as Error, res); }
};

export const bulkTag = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const b = req.body as { productIds: number[]; tagIds: number[] };
    if (!Array.isArray(b.productIds) || !Array.isArray(b.tagIds)) { error(res, 'productIds and tagIds arrays required', 400); return; }
    const count = await tagService.bulkTag(b.productIds, b.tagIds);
    success(res, { tagged: count }, `${count} tag assignments created`);
  } catch (e) { resolve(e as Error, res); }
};
