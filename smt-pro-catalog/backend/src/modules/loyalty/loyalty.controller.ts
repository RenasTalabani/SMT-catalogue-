import { Response } from 'express';
import { AuthRequest } from '../../types';
import { success, error } from '../../shared/utils/response.util';
import * as loyaltyService from './loyalty.service';

const ERR_MAP: Record<string, { s: number; m: string }> = {
  CUSTOMER_NOT_FOUND:  { s: 404, m: 'Customer not found' },
  INSUFFICIENT_POINTS: { s: 400, m: 'Not enough loyalty points' },
  INVALID_POINTS:      { s: 400, m: 'Points amount must be greater than zero' },
  NEGATIVE_BALANCE:    { s: 400, m: 'Adjustment would result in a negative balance' },
};

const resolve = (e: Error, res: Response): Response => {
  const m = ERR_MAP[e.message];
  return error(res, m?.m ?? e.message, m?.s ?? 500);
};

export const getAccount = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    success(res, await loyaltyService.getAccount(Number(req.params['customerId'])));
  } catch (e) { resolve(e as Error, res); }
};

export const getHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const q     = req.query as Record<string, string>;
    const page  = q['page']  ? Number(q['page'])  : 1;
    const limit = q['limit'] ? Number(q['limit']) : 20;
    success(res, await loyaltyService.getHistory(Number(req.params['customerId']), page, limit));
  } catch (e) { resolve(e as Error, res); }
};

export const getStats = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    success(res, await loyaltyService.getStats());
  } catch (e) { resolve(e as Error, res); }
};

export const earn = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { customerId, orderId, orderAmount } = req.body as { customerId: number; orderId: number; orderAmount: number };
    if (!customerId || !orderId || !orderAmount) { error(res, 'customerId, orderId, orderAmount required', 400); return; }
    const result = await loyaltyService.earnPoints(Number(customerId), Number(orderId), Number(orderAmount));
    success(res, result, result ? 'Points earned' : 'No points earned');
  } catch (e) { resolve(e as Error, res); }
};

export const redeem = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { customerId, points, orderId } = req.body as { customerId: number; points: number; orderId?: number };
    if (!customerId || !points) { error(res, 'customerId and points required', 400); return; }
    success(res, await loyaltyService.redeemPoints(Number(customerId), Number(points), orderId ? Number(orderId) : undefined), 'Points redeemed');
  } catch (e) { resolve(e as Error, res); }
};

export const adjust = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { customerId, delta, notes } = req.body as { customerId: number; delta: number; notes: string };
    if (!customerId || delta === undefined) { error(res, 'customerId and delta required', 400); return; }
    if (!notes?.trim()) { error(res, 'notes required for adjustment', 400); return; }
    success(res, await loyaltyService.adjustPoints(Number(customerId), Number(delta), notes), 'Points adjusted');
  } catch (e) { resolve(e as Error, res); }
};
