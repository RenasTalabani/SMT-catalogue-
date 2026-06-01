import { Response } from 'express';
import * as orderService from './order.service';
import { success, error } from '../../shared/utils/response.util';
import { AuthRequest } from '../../types';

const ERR_MAP: Record<string, { s: number; m: string }> = {
  ORDER_NOT_FOUND:      { s: 404, m: 'Order not found' },
  ORDER_FORBIDDEN:      { s: 403, m: 'Access denied' },
  ORDER_NOT_MODIFIABLE: { s: 409, m: 'Completed or cancelled orders cannot be modified' },
};

const resolve = (e: Error, res: Response): Response => {
  const key = e.message.split(':')[0]!;
  const m   = ERR_MAP[key];
  if (!m && e.message.startsWith('PRODUCT_NOT_FOUND:'))
    return error(res, `Product ${e.message.split(':')[1]} not found`, 404);
  if (!m && e.message.startsWith('INSUFFICIENT_STOCK:'))
    return error(res, `Insufficient stock for: ${e.message.split(':')[1]}`, 409);
  return error(res, m?.m ?? e.message, m?.s ?? 500);
};

export const getAll = async (req: AuthRequest, res: Response): Promise<void> => {
  try { success(res, await orderService.getAll(req.query as Record<string, string>)); }
  catch (e) { resolve(e as Error, res); }
};

export const getMyOrders = async (req: AuthRequest, res: Response): Promise<void> => {
  try { success(res, await orderService.getMyOrders(req.user.id, req.query as Record<string, string>)); }
  catch (e) { resolve(e as Error, res); }
};

export const getById = async (req: AuthRequest, res: Response): Promise<void> => {
  try { success(res, await orderService.getById(req.params['id']!, req.user)); }
  catch (e) { resolve(e as Error, res); }
};

export const create = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const body = req.body as {
      items:          Array<{ productId: number; quantity: number }>;
      paymentMethod?: string;
      notes?:         string;
      discount?:      number;
      tax?:           number;
    };
    const order = await orderService.create(req.user.id, {
      items:         body.items,
      paymentMethod: body.paymentMethod,
      notes:         body.notes,
      discount:      body.discount,
      tax:           body.tax,
    });
    success(res, order, 'Order created', 201);
  } catch (e) { resolve(e as Error, res); }
};

export const updateStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const order = await orderService.updateStatus(req.params['id']!, (req.body as { status: string }).status);
    success(res, order, 'Order status updated');
  } catch (e) { resolve(e as Error, res); }
};
