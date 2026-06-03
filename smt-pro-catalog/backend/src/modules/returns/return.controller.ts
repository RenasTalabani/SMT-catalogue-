import { Response } from 'express';
import { AuthRequest } from '../../types';
import { success, error } from '../../shared/utils/response.util';
import * as returnService from './return.service';

const ERR_MAP: Record<string, { s: number; m: string }> = {
  RETURN_NOT_FOUND:    { s: 404, m: 'Return request not found' },
  ORDER_NOT_FOUND:     { s: 404, m: 'Order not found' },
  ORDER_NOT_ELIGIBLE:  { s: 409, m: 'Order must be completed before a return can be requested' },
  RETURN_ALREADY_EXISTS: { s: 409, m: 'An active return request already exists for this order' },
  ITEMS_REQUIRED:      { s: 400, m: 'At least one return item is required' },
  RETURN_NOT_PENDING:  { s: 409, m: 'Return request is no longer pending' },
  RETURN_NOT_APPROVED: { s: 409, m: 'Return request must be approved before processing' },
};

const resolve = (e: Error, res: Response): Response => {
  const msg = e.message;
  if (msg.startsWith('ITEM_NOT_IN_ORDER:')) return error(res, 'One or more items do not belong to this order', 400);
  if (msg.startsWith('INVALID_QTY:'))       return error(res, 'Invalid return quantity for one or more items', 400);
  const m = ERR_MAP[msg];
  return error(res, m?.m ?? msg, m?.s ?? 500);
};

export const getAll = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const q = req.query as Record<string, string>;
    success(res, await returnService.getAll({
      page:   q['page']   ? Number(q['page'])  : 1,
      limit:  q['limit']  ? Number(q['limit']) : 20,
      status: q['status'],
    }));
  } catch (e) { resolve(e as Error, res); }
};

export const getById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    success(res, await returnService.getById(Number(req.params['id'])));
  } catch (e) { resolve(e as Error, res); }
};

export const getStats = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    success(res, await returnService.getStats());
  } catch (e) { resolve(e as Error, res); }
};

export const create = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const b = req.body as {
      orderId: number;
      reason:  string;
      notes?:  string;
      refundMethod?: 'ORIGINAL' | 'STORE_CREDIT' | 'CASH';
      items: Array<{ orderItemId: number; productId: number; quantity: number; condition?: 'GOOD' | 'DAMAGED' | 'DEFECTIVE' }>;
    };
    if (!b.orderId)                          { error(res, 'orderId is required', 400); return; }
    if (!b.reason?.trim())                   { error(res, 'reason is required', 400); return; }
    if (!Array.isArray(b.items) || !b.items.length) { error(res, 'items array is required', 400); return; }

    const ret = await returnService.create(req.user.id, {
      orderId:      Number(b.orderId),
      reason:       b.reason,
      notes:        b.notes,
      refundMethod: b.refundMethod,
      items: b.items.map((i) => ({
        orderItemId: Number(i.orderItemId),
        productId:   Number(i.productId),
        quantity:    Number(i.quantity),
        condition:   i.condition,
      })),
    });
    success(res, ret, 'Return request submitted', 201);
  } catch (e) { resolve(e as Error, res); }
};

export const review = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const b = req.body as { status: 'APPROVED' | 'REJECTED'; refundAmount?: number; notes?: string };
    if (!['APPROVED', 'REJECTED'].includes(b.status)) { error(res, 'status must be APPROVED or REJECTED', 400); return; }
    success(res, await returnService.review(Number(req.params['id']), req.user.id, b), 'Return request reviewed');
  } catch (e) { resolve(e as Error, res); }
};

export const processReturn = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    success(res, await returnService.process(Number(req.params['id']), req.user.id), 'Return processed — stock restored');
  } catch (e) { resolve(e as Error, res); }
};
