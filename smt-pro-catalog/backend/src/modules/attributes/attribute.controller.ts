import { Request, Response } from 'express';
import { AuthRequest } from '../../types';
import { success, error } from '../../shared/utils/response.util';
import * as attrService from './attribute.service';

const ERR_MAP: Record<string, { s: number; m: string }> = {
  ATTRIBUTE_NOT_FOUND: { s: 404, m: 'Attribute definition not found' },
  ATTRIBUTE_EXISTS:    { s: 409, m: 'An attribute with this name already exists' },
  ATTRIBUTE_IN_USE:    { s: 409, m: 'Cannot delete an attribute that is assigned to products' },
  PRODUCT_NOT_FOUND:   { s: 404, m: 'Product not found' },
};

const resolve = (e: Error, res: Response): Response => {
  const m = ERR_MAP[e.message];
  return error(res, m?.m ?? e.message, m?.s ?? 500);
};

export const getAllDefinitions = async (req: Request, res: Response): Promise<void> => {
  try {
    const q = req.query as Record<string, string>;
    success(res, await attrService.getAllDefinitions(q['categoryId'] ? Number(q['categoryId']) : undefined));
  } catch (e) { resolve(e as Error, res); }
};

export const createDefinition = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const b = req.body as Parameters<typeof attrService.createDefinition>[0];
    if (!b.name?.trim()) { error(res, 'name is required', 400); return; }
    success(res, await attrService.createDefinition(b), 'Attribute created', 201);
  } catch (e) { resolve(e as Error, res); }
};

export const updateDefinition = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    success(res, await attrService.updateDefinition(Number(req.params['id']), req.body as Parameters<typeof attrService.updateDefinition>[1]), 'Attribute updated');
  } catch (e) { resolve(e as Error, res); }
};

export const deleteDefinition = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await attrService.deleteDefinition(Number(req.params['id']));
    success(res, null, 'Attribute deleted');
  } catch (e) { resolve(e as Error, res); }
};

export const getProductAttributes = async (req: Request, res: Response): Promise<void> => {
  try { success(res, await attrService.getProductAttributes(Number(req.params['productId']))); }
  catch (e) { resolve(e as Error, res); }
};

export const setProductAttributes = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const b = req.body as { attrs: Parameters<typeof attrService.setProductAttributes>[1] };
    if (!Array.isArray(b.attrs) || !b.attrs.length) { error(res, 'attrs array is required', 400); return; }
    success(res, await attrService.setProductAttributes(Number(req.params['productId']), b.attrs), 'Attributes updated');
  } catch (e) { resolve(e as Error, res); }
};

export const removeProductAttribute = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await attrService.removeProductAttribute(Number(req.params['productId']), Number(req.params['attributeId']));
    success(res, null, 'Attribute removed');
  } catch (e) { resolve(e as Error, res); }
};

export const searchByAttributes = async (req: Request, res: Response): Promise<void> => {
  try {
    const b = req.body as { filters: Parameters<typeof attrService.searchByAttributes>[0]; page?: number; limit?: number };
    if (!Array.isArray(b.filters) || !b.filters.length) { error(res, 'filters array is required', 400); return; }
    success(res, await attrService.searchByAttributes(b.filters, b.page ?? 1, b.limit ?? 20));
  } catch (e) { resolve(e as Error, res); }
};
