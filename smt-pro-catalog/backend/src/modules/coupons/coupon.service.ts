import prisma from '../../config/prisma';
import { get, set, invalidate } from '../../shared/utils/cache.util';

const CACHE_TTL = 300; // 5 minutes

export interface CreateCouponInput {
  code:           string;
  description?:  string;
  type:           'PERCENTAGE' | 'FIXED';
  value:          number;
  minOrderAmount?: number;
  maxUses?:       number;
  validFrom?:     string;
  validUntil?:    string;
}

// ── Validate + compute discount (called before order finalisation) ─────────────
export const validate = async (
  code: string,
  orderTotal: number,
  userId: number,
): Promise<{ coupon: { id: number; type: string; value: number }; discountAmount: number }> => {
  const coupon = await prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });
  if (!coupon)      throw new Error('COUPON_NOT_FOUND');
  if (!coupon.isActive) throw new Error('COUPON_INACTIVE');

  const now = new Date();
  if (coupon.validFrom > now)                         throw new Error('COUPON_NOT_STARTED');
  if (coupon.validUntil && coupon.validUntil < now)   throw new Error('COUPON_EXPIRED');
  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) throw new Error('COUPON_EXHAUSTED');
  if (orderTotal < coupon.minOrderAmount)             throw new Error('COUPON_MIN_ORDER');

  const alreadyUsed = await prisma.couponUsage.findFirst({ where: { couponId: coupon.id, userId } });
  if (alreadyUsed) throw new Error('COUPON_ALREADY_USED');

  const discountAmount = coupon.type === 'PERCENTAGE'
    ? parseFloat(((orderTotal * coupon.value) / 100).toFixed(2))
    : Math.min(coupon.value, orderTotal);

  return {
    coupon:         { id: coupon.id, type: coupon.type, value: coupon.value },
    discountAmount: parseFloat(discountAmount.toFixed(2)),
  };
};

// ── Apply coupon usage after order is created ──────────────────────────────────
export const applyToOrder = async (
  couponId: number,
  orderId:  number,
  userId:   number,
  discount: number,
): Promise<void> => {
  await prisma.$transaction([
    prisma.couponUsage.create({ data: { couponId, orderId, userId, discount } }),
    prisma.coupon.update({ where: { id: couponId }, data: { usedCount: { increment: 1 } } }),
  ]);
  await invalidate('coupons:');
};

// ── Admin CRUD ────────────────────────────────────────────────────────────────
export const getAll = async (params: { page?: number; limit?: number; search?: string; activeOnly?: boolean } = {}) => {
  const { page = 1, limit = 20, search, activeOnly } = params;
  const cacheKey = `coupons:list:${String(page)}:${String(limit)}:${String(search)}:${String(activeOnly)}`;
  const cached   = await get<unknown>(cacheKey);
  if (cached) return cached;

  const skip  = (page - 1) * limit;
  const where: Record<string, unknown> = {};
  if (activeOnly) where['isActive'] = true;
  if (search)     where['code']     = { contains: search.toUpperCase(), mode: 'insensitive' };

  const [coupons, total] = await Promise.all([
    prisma.coupon.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: { _count: { select: { usages: true } } },
    }),
    prisma.coupon.count({ where }),
  ]);

  const result = { coupons, total, page, limit };
  await set(cacheKey, result, CACHE_TTL);
  return result;
};

export const getById = async (id: number) => {
  const c = await prisma.coupon.findUnique({
    where:   { id },
    include: {
      usages: {
        orderBy: { usedAt: 'desc' },
        take:    20,
        include: {
          user:  { select: { id: true, name: true } },
          order: { select: { id: true, finalAmount: true, createdAt: true } },
        },
      },
    },
  });
  if (!c) throw new Error('COUPON_NOT_FOUND');
  return c;
};

export const create = async (data: CreateCouponInput) => {
  const code = data.code.toUpperCase().trim();
  const exists = await prisma.coupon.findUnique({ where: { code } });
  if (exists) throw new Error('COUPON_CODE_TAKEN');

  if (data.type === 'PERCENTAGE' && (data.value <= 0 || data.value > 100)) throw new Error('INVALID_PERCENTAGE');
  if (data.type === 'FIXED' && data.value <= 0) throw new Error('INVALID_VALUE');

  const coupon = await prisma.coupon.create({
    data: {
      code,
      description:   data.description ?? null,
      type:          data.type,
      value:         data.value,
      minOrderAmount: data.minOrderAmount ?? 0,
      maxUses:       data.maxUses ?? null,
      validFrom:     data.validFrom  ? new Date(data.validFrom)  : new Date(),
      validUntil:    data.validUntil ? new Date(data.validUntil) : null,
    },
  });
  await invalidate('coupons:');
  return coupon;
};

export const update = async (id: number, data: Partial<CreateCouponInput> & { isActive?: boolean }) => {
  const existing = await prisma.coupon.findUnique({ where: { id } });
  if (!existing) throw new Error('COUPON_NOT_FOUND');

  if (data.code) {
    const code = data.code.toUpperCase().trim();
    const conflict = await prisma.coupon.findUnique({ where: { code } });
    if (conflict && conflict.id !== id) throw new Error('COUPON_CODE_TAKEN');
    data.code = code;
  }

  const coupon = await prisma.coupon.update({
    where: { id },
    data:  {
      ...data,
      validFrom:  data.validFrom  ? new Date(data.validFrom)  : undefined,
      validUntil: data.validUntil ? new Date(data.validUntil) : undefined,
    },
  });
  await invalidate('coupons:');
  return coupon;
};

export const remove = async (id: number): Promise<void> => {
  const existing = await prisma.coupon.findUnique({ where: { id } });
  if (!existing) throw new Error('COUPON_NOT_FOUND');
  if (existing.usedCount > 0) throw new Error('COUPON_HAS_USAGES');
  await prisma.coupon.delete({ where: { id } });
  await invalidate('coupons:');
};

export const getStats = async () => {
  const [total, active, expired, topCoupons] = await Promise.all([
    prisma.coupon.count(),
    prisma.coupon.count({ where: { isActive: true, OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }] } }),
    prisma.coupon.count({ where: { validUntil: { lt: new Date() } } }),
    prisma.coupon.findMany({
      orderBy: { usedCount: 'desc' },
      take:    5,
      select:  { id: true, code: true, type: true, value: true, usedCount: true },
    }),
  ]);

  const totalSaved = await prisma.couponUsage.aggregate({ _sum: { discount: true } });

  return {
    total,
    active,
    expired,
    totalSaved: parseFloat((totalSaved._sum.discount ?? 0).toFixed(2)),
    topCoupons,
  };
};
