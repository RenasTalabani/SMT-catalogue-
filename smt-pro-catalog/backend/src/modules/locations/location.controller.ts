import { Response } from 'express';
import { AuthRequest } from '../../types';
import { success, error } from '../../shared/utils/response.util';
import * as locationService from './location.service';

const ERR_MAP: Record<string, { s: number; m: string }> = {
  LOCATION_NOT_FOUND:     { s: 404, m: 'Location not found' },
  CODE_TAKEN:             { s: 409, m: 'Location code already exists' },
  CANNOT_DELETE_DEFAULT:  { s: 409, m: 'Cannot delete the default location' },
  LOCATION_HAS_STOCK:     { s: 409, m: 'Cannot delete a location that has stock' },
  TRANSFER_NOT_FOUND:     { s: 404, m: 'Transfer not found' },
  TRANSFER_NOT_PENDING:   { s: 409, m: 'Transfer is no longer pending' },
  SAME_LOCATION:          { s: 400, m: 'Source and destination must be different locations' },
  ITEMS_REQUIRED:         { s: 400, m: 'At least one item is required' },
  FROM_NOT_FOUND:         { s: 404, m: 'Source location not found' },
  TO_NOT_FOUND:           { s: 404, m: 'Destination location not found' },
  INVALID_QUANTITY:       { s: 400, m: 'Quantity must be >= 0' },
};

const resolve = (e: Error, res: Response): Response => {
  const msg = e.message;
  if (msg.startsWith('INSUFFICIENT_STOCK:')) return error(res, `Insufficient stock for product ID ${msg.split(':')[1]}`, 400);
  const m = ERR_MAP[msg];
  return error(res, m?.m ?? msg, m?.s ?? 500);
};

export const getAll        = async (_r: AuthRequest, res: Response) => { try { success(res, await locationService.getAll()); } catch (e) { resolve(e as Error, res); } };
export const getById       = async (req: AuthRequest, res: Response) => { try { success(res, await locationService.getById(Number(req.params['id']))); } catch (e) { resolve(e as Error, res); } };
export const getTransfers  = async (req: AuthRequest, res: Response) => {
  try {
    const q = req.query as Record<string, string>;
    success(res, await locationService.getTransfers({ page: q['page'] ? Number(q['page']) : 1, limit: q['limit'] ? Number(q['limit']) : 20, locationId: q['locationId'] ? Number(q['locationId']) : undefined, status: q['status'] }));
  } catch (e) { resolve(e as Error, res); }
};

export const create = async (req: AuthRequest, res: Response) => {
  try {
    const b = req.body as { name: string; code: string; address?: string; isDefault?: boolean };
    if (!b.name?.trim() || !b.code?.trim()) { error(res, 'name and code are required', 400); return; }
    success(res, await locationService.create(b), 'Location created', 201);
  } catch (e) { resolve(e as Error, res); }
};

export const update = async (req: AuthRequest, res: Response) => { try { success(res, await locationService.update(Number(req.params['id']), req.body as Parameters<typeof locationService.update>[1]), 'Location updated'); } catch (e) { resolve(e as Error, res); } };
export const remove = async (req: AuthRequest, res: Response) => { try { await locationService.remove(Number(req.params['id'])); success(res, null, 'Location deleted'); } catch (e) { resolve(e as Error, res); } };

export const getInventory = async (req: AuthRequest, res: Response) => {
  try {
    const q = req.query as Record<string, string>;
    success(res, await locationService.getInventory(Number(req.params['id']), q['page'] ? Number(q['page']) : 1, q['limit'] ? Number(q['limit']) : 20));
  } catch (e) { resolve(e as Error, res); }
};

export const setStock = async (req: AuthRequest, res: Response) => {
  try {
    const b = req.body as { productId: number; quantity: number };
    if (!b.productId || b.quantity === undefined) { error(res, 'productId and quantity required', 400); return; }
    success(res, await locationService.setStock(Number(req.params['id']), Number(b.productId), Number(b.quantity)), 'Stock set');
  } catch (e) { resolve(e as Error, res); }
};

export const createTransfer = async (req: AuthRequest, res: Response) => {
  try {
    const b = req.body as Parameters<typeof locationService.createTransfer>[1];
    if (!b.fromId || !b.toId) { error(res, 'fromId and toId are required', 400); return; }
    if (!Array.isArray(b.items) || !b.items.length) { error(res, 'items array required', 400); return; }
    success(res, await locationService.createTransfer(req.user.id, b), 'Transfer created', 201);
  } catch (e) { resolve(e as Error, res); }
};

export const completeTransfer = async (req: AuthRequest, res: Response) => { try { success(res, await locationService.completeTransfer(Number(req.params['id'])), 'Transfer completed'); } catch (e) { resolve(e as Error, res); } };
export const cancelTransfer   = async (req: AuthRequest, res: Response) => { try { await locationService.cancelTransfer(Number(req.params['id'])); success(res, null, 'Transfer cancelled'); } catch (e) { resolve(e as Error, res); } };
