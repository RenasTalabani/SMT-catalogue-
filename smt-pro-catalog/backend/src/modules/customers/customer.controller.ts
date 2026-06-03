import { Response } from 'express';
import { AuthRequest } from '../../types';
import { success, error } from '../../shared/utils/response.util';
import * as customerService from './customer.service';

export const getAll = async (req: AuthRequest, res: Response): Promise<void> => {
  const page   = Math.max(1, parseInt(String(req.query['page']  ?? 1)));
  const limit  = Math.min(100, Math.max(1, parseInt(String(req.query['limit'] ?? 20))));
  const search = req.query['search'] as string | undefined;
  success(res, await customerService.getAll(page, limit, search));
};

export const getById = async (req: AuthRequest, res: Response): Promise<void> => {
  const id = parseInt(req.params['id'] ?? '0');
  const customer = await customerService.getById(id);
  if (!customer) { error(res, 'Customer not found', 404); return; }
  success(res, customer);
};

export const getStats = async (req: AuthRequest, res: Response): Promise<void> => {
  const id = parseInt(req.params['id'] ?? '0');
  const customer = await customerService.getById(id);
  if (!customer) { error(res, 'Customer not found', 404); return; }
  success(res, await customerService.getStats(id));
};

export const create = async (req: AuthRequest, res: Response): Promise<void> => {
  const { name, phone, email, address, notes } = req.body as {
    name: string; phone?: string; email?: string; address?: string; notes?: string;
  };
  if (!name?.trim()) { error(res, 'Customer name is required', 400); return; }
  try {
    const customer = await customerService.create({ name, phone, email, address, notes });
    success(res, customer, 'Created', 201);
  } catch (e: unknown) {
    if ((e as Error).message === 'EMAIL_TAKEN') { error(res, 'Email already in use', 409); return; }
    throw e;
  }
};

export const update = async (req: AuthRequest, res: Response): Promise<void> => {
  const id = parseInt(req.params['id'] ?? '0');
  const { name, phone, email, address, notes } = req.body as {
    name?: string; phone?: string; email?: string; address?: string; notes?: string;
  };
  try {
    const customer = await customerService.update(id, { name, phone, email, address, notes });
    success(res, customer);
  } catch (e: unknown) {
    if ((e as Error).message === 'EMAIL_TAKEN') { error(res, 'Email already in use', 409); return; }
    throw e;
  }
};

export const remove = async (req: AuthRequest, res: Response): Promise<void> => {
  const id = parseInt(req.params['id'] ?? '0');
  try {
    await customerService.remove(id);
    success(res, null, 'Customer moved to trash');
  } catch (e: unknown) {
    if ((e as Error).message === 'CUSTOMER_NOT_FOUND') { error(res, 'Customer not found', 404); return; }
    throw e;
  }
};

export const restore = async (req: AuthRequest, res: Response): Promise<void> => {
  const id = parseInt(req.params['id'] ?? '0');
  try {
    const customer = await customerService.restore(id);
    success(res, customer, 'Customer restored');
  } catch (e: unknown) {
    const msg = (e as Error).message;
    if (msg === 'CUSTOMER_NOT_FOUND')   { error(res, 'Customer not found', 404); return; }
    if (msg === 'CUSTOMER_NOT_DELETED') { error(res, 'Customer is not in the trash', 400); return; }
    throw e;
  }
};

export const getDeleted = async (req: AuthRequest, res: Response): Promise<void> => {
  const page  = Math.max(1, parseInt(String(req.query['page']  ?? 1)));
  const limit = Math.min(100, Math.max(1, parseInt(String(req.query['limit'] ?? 20))));
  success(res, await customerService.getDeleted(page, limit));
};

export const permanentDelete = async (req: AuthRequest, res: Response): Promise<void> => {
  const id = parseInt(req.params['id'] ?? '0');
  try {
    await customerService.permanentDelete(id);
    success(res, null, 'Customer permanently deleted');
  } catch (e: unknown) {
    if ((e as Error).message === 'CUSTOMER_NOT_FOUND') { error(res, 'Customer not found', 404); return; }
    throw e;
  }
};
