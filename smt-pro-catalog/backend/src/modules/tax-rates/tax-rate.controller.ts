import { Response } from 'express';
import { AuthRequest } from '../../types';
import { success, error } from '../../shared/utils/response.util';
import * as taxService from './tax-rate.service';

const ERR_MAP: Record<string, { s: number; m: string }> = {
  TAX_RATE_NOT_FOUND:  { s: 404, m: 'Tax rate not found' },
  TAX_RATE_IS_DEFAULT: { s: 409, m: 'Cannot delete the default tax rate' },
  INVALID_RATE:        { s: 400, m: 'Tax rate must be between 0 and 100' },
};

const resolve = (e: Error, res: Response): Response => {
  const m = ERR_MAP[e.message];
  return error(res, m?.m ?? e.message, m?.s ?? 500);
};

export const getAll = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    success(res, await taxService.getAll(req.query['activeOnly'] === 'true'));
  } catch (e) { resolve(e as Error, res); }
};

export const getDefault = async (_req: AuthRequest, res: Response): Promise<void> => {
  try { success(res, await taxService.getDefault()); }
  catch (e) { resolve(e as Error, res); }
};

export const calculate = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const q = req.query as Record<string, string>;
    if (!q['subtotal']) { error(res, 'subtotal is required', 400); return; }
    success(res, await taxService.calculate(
      Number(q['subtotal']),
      q['taxRateId']  ? Number(q['taxRateId'])  : undefined,
      q['customerId'] ? Number(q['customerId']) : undefined,
    ));
  } catch (e) { resolve(e as Error, res); }
};

export const getReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const q = req.query as Record<string, string>;
    const from = q['from'] ? new Date(q['from']) : new Date(new Date().setDate(1));
    const to   = q['to']   ? new Date(q['to'])   : new Date();
    success(res, await taxService.getReport(from, to));
  } catch (e) { resolve(e as Error, res); }
};

export const create = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const b = req.body as Parameters<typeof taxService.create>[0];
    if (!b.name?.trim())          { error(res, 'name is required', 400); return; }
    if (b.rate === undefined)     { error(res, 'rate is required', 400); return; }
    success(res, await taxService.create(b), 'Tax rate created', 201);
  } catch (e) { resolve(e as Error, res); }
};

export const update = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    success(res, await taxService.update(Number(req.params['id']), req.body as Parameters<typeof taxService.update>[1]), 'Tax rate updated');
  } catch (e) { resolve(e as Error, res); }
};

export const remove = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await taxService.remove(Number(req.params['id']));
    success(res, null, 'Tax rate deleted');
  } catch (e) { resolve(e as Error, res); }
};
