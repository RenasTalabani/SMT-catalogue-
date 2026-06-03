import { Response } from 'express';
import * as inventoryService from './inventory.service';
import { success, error } from '../../shared/utils/response.util';
import { AuthRequest } from '../../types';

const ERR_MAP: Record<string, { s: number; m: string }> = {
  PRODUCT_NOT_FOUND:     { s: 404, m: 'Product not found' },
  INSUFFICIENT_STOCK:    { s: 409, m: 'Insufficient stock for this operation' },
  SUPPLIER_NOT_FOUND:    { s: 404, m: 'Supplier not found' },
  SUPPLIER_NOT_DELETED:  { s: 400, m: 'Supplier is not in the trash' },
  SUPPLIER_EMAIL_EXISTS: { s: 409, m: 'A supplier with this email already exists' },
};

const resolve = (e: Error, res: Response): Response => {
  const m = ERR_MAP[e.message];
  return error(res, m?.m ?? e.message, m?.s ?? 500);
};

export const getMovements = async (req: AuthRequest, res: Response): Promise<void> => {
  try { success(res, await inventoryService.getMovements(req.query as Record<string, string>)); }
  catch (e) { resolve(e as Error, res); }
};

export const recordMovement = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    success(res, await inventoryService.recordMovement(req.user.id, req.body as { productId: number; type: string; quantity: number; notes?: string }), 'Stock movement recorded', 201);
  } catch (e) { resolve(e as Error, res); }
};

export const getInventoryValue = async (_req: AuthRequest, res: Response): Promise<void> => {
  try { success(res, await inventoryService.getInventoryValue()); }
  catch (e) { resolve(e as Error, res); }
};

export const getSuppliers = async (req: AuthRequest, res: Response): Promise<void> => {
  try { success(res, await inventoryService.getSuppliers(req.query as Record<string, string>)); }
  catch (e) { resolve(e as Error, res); }
};

export const createSupplier = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, phone, email, address } = req.body as { name: string; phone?: string; email?: string; address?: string };
    success(res, await inventoryService.createSupplier({ name, phone, email, address }), 'Supplier created', 201);
  } catch (e) { resolve(e as Error, res); }
};

export const updateSupplier = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, phone, email, address } = req.body as Record<string, string | undefined>;
    const data: Record<string, unknown> = {};
    if (name    !== undefined) data['name']    = name;
    if (phone   !== undefined) data['phone']   = phone;
    if (email   !== undefined) data['email']   = email;
    if (address !== undefined) data['address'] = address;
    success(res, await inventoryService.updateSupplier(req.params['id']!, data as Parameters<typeof inventoryService.updateSupplier>[1]), 'Supplier updated');
  } catch (e) { resolve(e as Error, res); }
};

export const deleteSupplier = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await inventoryService.deleteSupplier(req.params['id']!);
    success(res, null, 'Supplier moved to trash');
  } catch (e) { resolve(e as Error, res); }
};

export const restoreSupplier = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    success(res, await inventoryService.restoreSupplier(req.params['id']!), 'Supplier restored');
  } catch (e) { resolve(e as Error, res); }
};

export const getDeletedSuppliers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    success(res, await inventoryService.getDeletedSuppliers(req.query as Record<string, string>));
  } catch (e) { resolve(e as Error, res); }
};
