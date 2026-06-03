import { Response } from 'express';
import { AuthRequest } from '../../types';
import { success, error } from '../../shared/utils/response.util';
import * as couponService from './coupon.service';

const ERR_MAP: Record<string, { s: number; m: string }> = {
  COUPON_NOT_FOUND:    { s: 404, m: 'Coupon not found' },
  COUPON_CODE_TAKEN:   { s: 409, m: 'Coupon code already exists' },
  COUPON_HAS_USAGES:   { s: 409, m: 'Cannot delete a coupon that has been used' },
  COUPON_INACTIVE:     { s: 400, m: 'This coupon is not active' },
  COUPON_EXPIRED:      { s: 400, m: 'This coupon has expired' },
  COUPON_NOT_STARTED:  { s: 400, m: 'This coupon is not valid yet' },
  COUPON_EXHAUSTED:    { s: 400, m: 'This coupon has reached its usage limit' },
  COUPON_MIN_ORDER:    { s: 400, m: 'Order total does not meet the minimum required for this coupon' },
  COUPON_ALREADY_USED: { s: 409, m: 'You have already used this coupon' },
  INVALID_PERCENTAGE:  { s: 400, m: 'Percentage value must be between 1 and 100' },
  INVALID_VALUE:       { s: 400, m: 'Discount value must be greater than zero' },
};

const resolve = (e: Error, res: Response): Response => {
  const m = ERR_MAP[e.message];
  return error(res, m?.m ?? e.message, m?.s ?? 500);
};

export const getAll = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const q = req.query as Record<string, string>;
    success(res, await couponService.getAll({
      page:       q['page']       ? Number(q['page'])             : 1,
      limit:      q['limit']      ? Number(q['limit'])            : 20,
      search:     q['search'],
      activeOnly: q['activeOnly'] === 'true',
    }));
  } catch (e) { resolve(e as Error, res); }
};

export const getById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    success(res, await couponService.getById(Number(req.params['id'])));
  } catch (e) { resolve(e as Error, res); }
};

export const getStats = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    success(res, await couponService.getStats());
  } catch (e) { resolve(e as Error, res); }
};

export const validateCoupon = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { code, orderTotal } = req.query as Record<string, string>;
    if (!code)       { error(res, 'code is required', 400); return; }
    if (!orderTotal) { error(res, 'orderTotal is required', 400); return; }
    success(res, await couponService.validate(code, Number(orderTotal), req.user.id));
  } catch (e) { resolve(e as Error, res); }
};

export const create = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const b = req.body as {
      code: string; description?: string; type: 'PERCENTAGE' | 'FIXED'; value: number;
      minOrderAmount?: number; maxUses?: number; validFrom?: string; validUntil?: string;
    };
    if (!b.code?.trim())              { error(res, 'code is required', 400); return; }
    if (!['PERCENTAGE','FIXED'].includes(b.type)) { error(res, 'type must be PERCENTAGE or FIXED', 400); return; }
    if (!b.value || b.value <= 0)     { error(res, 'value must be positive', 400); return; }

    success(res, await couponService.create({
      code:           b.code,
      description:    b.description,
      type:           b.type,
      value:          Number(b.value),
      minOrderAmount: b.minOrderAmount ? Number(b.minOrderAmount) : undefined,
      maxUses:        b.maxUses        ? Number(b.maxUses)        : undefined,
      validFrom:      b.validFrom,
      validUntil:     b.validUntil,
    }), 'Coupon created', 201);
  } catch (e) { resolve(e as Error, res); }
};

export const update = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    success(res, await couponService.update(Number(req.params['id']), req.body as Parameters<typeof couponService.update>[1]), 'Coupon updated');
  } catch (e) { resolve(e as Error, res); }
};

export const remove = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await couponService.remove(Number(req.params['id']));
    success(res, null, 'Coupon deleted');
  } catch (e) { resolve(e as Error, res); }
};
