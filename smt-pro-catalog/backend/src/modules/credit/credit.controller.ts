import { Response } from 'express';
import { AuthRequest } from '../../types';
import { success, error } from '../../shared/utils/response.util';
import * as creditService from './credit.service';

const ERR_MAP: Record<string, { s: number; m: string }> = {
  CUSTOMER_NOT_FOUND:       { s: 404, m: 'Customer not found' },
  ACCOUNT_NOT_FOUND:        { s: 404, m: 'Credit account not found' },
  CREDIT_LIMIT_EXCEEDED:    { s: 400, m: 'Order amount exceeds available credit limit' },
  INVALID_AMOUNT:           { s: 400, m: 'Payment amount must be greater than zero' },
  INVALID_LIMIT:            { s: 400, m: 'Credit limit must be >= 0' },
  NO_OUTSTANDING_BALANCE:   { s: 400, m: 'Customer has no outstanding balance' },
  PAYMENT_EXCEEDS_BALANCE:  { s: 400, m: 'Payment exceeds the outstanding balance' },
};

const resolve = (e: Error, res: Response): Response => {
  const m = ERR_MAP[e.message];
  return error(res, m?.m ?? e.message, m?.s ?? 500);
};

export const getDashboard = async (_req: AuthRequest, res: Response): Promise<void> => {
  try { success(res, await creditService.getDashboard()); }
  catch (e) { resolve(e as Error, res); }
};

export const getAccount = async (req: AuthRequest, res: Response): Promise<void> => {
  try { success(res, await creditService.getAccount(Number(req.params['customerId']))); }
  catch (e) { resolve(e as Error, res); }
};

export const getPaymentHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const q = req.query as Record<string, string>;
    success(res, await creditService.getPaymentHistory(
      Number(req.params['customerId']),
      q['page']  ? Number(q['page'])  : 1,
      q['limit'] ? Number(q['limit']) : 20,
    ));
  } catch (e) { resolve(e as Error, res); }
};

export const setCreditLimit = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const b = req.body as { creditLimit: number; notes?: string };
    if (b.creditLimit === undefined) { error(res, 'creditLimit is required', 400); return; }
    success(res, await creditService.setCreditLimit(Number(req.params['customerId']), Number(b.creditLimit), b.notes), 'Credit limit updated');
  } catch (e) { resolve(e as Error, res); }
};

export const addDebt = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const b = req.body as { orderId: number; customerId: number; amount: number };
    if (!b.orderId || !b.customerId || !b.amount) { error(res, 'orderId, customerId and amount required', 400); return; }
    success(res, await creditService.addDebt(Number(b.orderId), Number(b.customerId), Number(b.amount), req.user.id), 'Debt recorded');
  } catch (e) { resolve(e as Error, res); }
};

export const recordPayment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const b = req.body as { amount: number; orderId?: number; method?: string; reference?: string; notes?: string };
    if (!b.amount) { error(res, 'amount is required', 400); return; }
    success(res, await creditService.recordPayment(
      Number(req.params['customerId']),
      req.user.id,
      Number(b.amount),
      { orderId: b.orderId ? Number(b.orderId) : undefined, method: b.method, reference: b.reference, notes: b.notes },
    ), 'Payment recorded');
  } catch (e) { resolve(e as Error, res); }
};

export const markOverdue = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const days = req.query['days'] ? Number(req.query['days']) : 30;
    const count = await creditService.markOverdue(days);
    success(res, { updated: count }, `${count} order(s) marked overdue`);
  } catch (e) { resolve(e as Error, res); }
};

export const setAccountStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const b = req.body as { status: 'ACTIVE' | 'SUSPENDED' | 'CLOSED' };
    if (!['ACTIVE', 'SUSPENDED', 'CLOSED'].includes(b.status)) { error(res, 'status must be ACTIVE, SUSPENDED or CLOSED', 400); return; }
    success(res, await creditService.setAccountStatus(Number(req.params['customerId']), b.status), 'Account status updated');
  } catch (e) { resolve(e as Error, res); }
};
