import { Response } from 'express';
import { AuthRequest } from '../../types';
import { success, error } from '../../shared/utils/response.util';
import * as planService from './payment-plan.service';

const ERR_MAP: Record<string, { s: number; m: string }> = {
  ORDER_NOT_FOUND:         { s: 404, m: 'Order not found' },
  PLAN_NOT_FOUND:          { s: 404, m: 'Payment plan not found' },
  PLAN_EXISTS:             { s: 409, m: 'A payment plan already exists for this order' },
  INVALID_INSTALLMENT_COUNT: { s: 400, m: 'Installment count must be between 2 and 24' },
  INSTALLMENT_NOT_FOUND:   { s: 404, m: 'Installment not found' },
  ALREADY_PAID:            { s: 409, m: 'This installment is already fully paid' },
  INVALID_AMOUNT:          { s: 400, m: 'Payment amount must be greater than zero' },
};

const resolve = (e: Error, res: Response): Response => {
  const m = ERR_MAP[e.message];
  return error(res, m?.m ?? e.message, m?.s ?? 500);
};

export const getAll = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const q = req.query as Record<string, string>;
    success(res, await planService.getAll({ page: q['page'] ? Number(q['page']) : 1, limit: q['limit'] ? Number(q['limit']) : 20, status: q['status'] }));
  } catch (e) { resolve(e as Error, res); }
};

export const getById      = async (req: AuthRequest, res: Response): Promise<void> => { try { success(res, await planService.getById(Number(req.params['id']))); } catch (e) { resolve(e as Error, res); } };
export const getByOrder   = async (req: AuthRequest, res: Response): Promise<void> => { try { success(res, await planService.getByOrder(Number(req.params['orderId']))); } catch (e) { resolve(e as Error, res); } };
export const getStats     = async (_r: AuthRequest, res: Response): Promise<void>  => { try { success(res, await planService.getStats()); } catch (e) { resolve(e as Error, res); } };
export const markOverdue  = async (_r: AuthRequest, res: Response): Promise<void>  => { try { const count = await planService.markOverdue(); success(res, { updated: count }, `${count} installment(s) marked overdue`); } catch (e) { resolve(e as Error, res); } };

export const create = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const b = req.body as Parameters<typeof planService.create>[0];
    if (!b.orderId)              { error(res, 'orderId is required', 400); return; }
    if (!b.installmentCount)     { error(res, 'installmentCount is required', 400); return; }
    success(res, await planService.create(b), 'Payment plan created', 201);
  } catch (e) { resolve(e as Error, res); }
};

export const recordPayment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const b = req.body as { amount: number; notes?: string };
    if (!b.amount) { error(res, 'amount is required', 400); return; }
    success(res, await planService.recordPayment(Number(req.params['installmentId']), Number(b.amount), b.notes), 'Payment recorded');
  } catch (e) { resolve(e as Error, res); }
};
