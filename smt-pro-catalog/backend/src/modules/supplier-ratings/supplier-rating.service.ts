import prisma from '../../config/prisma';
import { get, set, invalidate } from '../../shared/utils/cache.util';

const CACHE_TTL = 300;

export interface CreateSupplierRatingInput {
  supplierId:      number;
  purchaseOrderId: number;
  qualityScore:    number; // 1–5
  deliveryScore:   number;
  pricingScore:    number;
  deliveredOnTime: boolean;
  fillRate:        number; // 0–100
  notes?:          string;
}

const computeOverall = (q: number, d: number, p: number): number =>
  parseFloat(((q + d + p) / 3).toFixed(2));

const validateScores = (q: number, d: number, p: number): void => {
  for (const [label, val] of [['qualityScore', q], ['deliveryScore', d], ['pricingScore', p]] as [string, number][]) {
    if (!Number.isInteger(val) || val < 1 || val > 5)
      throw new Error(`INVALID_SCORE:${label}`);
  }
};

// ── Create a rating for a completed PO ────────────────────────────────────────
export const create = async (data: CreateSupplierRatingInput, ratedBy: number) => {
  validateScores(data.qualityScore, data.deliveryScore, data.pricingScore);

  if (data.fillRate < 0 || data.fillRate > 100) throw new Error('INVALID_FILL_RATE');

  const po = await prisma.purchaseOrder.findUnique({ where: { id: data.purchaseOrderId } });
  if (!po)                              throw new Error('PO_NOT_FOUND');
  if (po.supplierId !== data.supplierId) throw new Error('PO_SUPPLIER_MISMATCH');

  const existing = await prisma.supplierRating.findUnique({ where: { purchaseOrderId: data.purchaseOrderId } });
  if (existing) throw new Error('RATING_ALREADY_EXISTS');

  const rating = await prisma.supplierRating.create({
    data: {
      supplierId:      data.supplierId,
      purchaseOrderId: data.purchaseOrderId,
      qualityScore:    data.qualityScore,
      deliveryScore:   data.deliveryScore,
      pricingScore:    data.pricingScore,
      overallScore:    computeOverall(data.qualityScore, data.deliveryScore, data.pricingScore),
      deliveredOnTime: data.deliveredOnTime,
      fillRate:        data.fillRate,
      notes:           data.notes ?? null,
      ratedBy,
    },
    include: {
      supplier:      { select: { id: true, name: true } },
      purchaseOrder: { select: { id: true, status: true, total: true } },
      ratedByUser:   { select: { id: true, name: true } },
    },
  });

  await invalidate('supplier-ratings:');
  return rating;
};

// ── List all ratings ───────────────────────────────────────────────────────────
export const getAll = async (params: {
  page?: number; limit?: number; supplierId?: number;
} = {}) => {
  const { page = 1, limit = 20, supplierId } = params;
  const cacheKey = `supplier-ratings:list:${String(page)}:${String(limit)}:${String(supplierId)}`;
  const cached   = await get<unknown>(cacheKey);
  if (cached) return cached;

  const skip  = (page - 1) * limit;
  const where: Record<string, unknown> = {};
  if (supplierId) where['supplierId'] = supplierId;

  const [ratings, total] = await Promise.all([
    prisma.supplierRating.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        supplier:      { select: { id: true, name: true } },
        purchaseOrder: { select: { id: true, status: true, total: true, createdAt: true } },
        ratedByUser:   { select: { id: true, name: true } },
      },
    }),
    prisma.supplierRating.count({ where }),
  ]);

  const result = { ratings, total, page, limit };
  await set(cacheKey, result, CACHE_TTL);
  return result;
};

export const getById = async (id: number) => {
  const rating = await prisma.supplierRating.findUnique({
    where:   { id },
    include: {
      supplier:      { select: { id: true, name: true } },
      purchaseOrder: { select: { id: true, status: true, total: true, createdAt: true } },
      ratedByUser:   { select: { id: true, name: true } },
    },
  });
  if (!rating) throw new Error('RATING_NOT_FOUND');
  return rating;
};

// ── Supplier performance summary ───────────────────────────────────────────────
export const getSupplierStats = async (supplierId: number) => {
  const supplier = await prisma.supplier.findUnique({ where: { id: supplierId }, select: { id: true, name: true } });
  if (!supplier) throw new Error('SUPPLIER_NOT_FOUND');

  const cacheKey = `supplier-ratings:stats:${String(supplierId)}`;
  const cached   = await get<unknown>(cacheKey);
  if (cached) return cached;

  const [agg, onTimeCount, total] = await Promise.all([
    prisma.supplierRating.aggregate({
      where: { supplierId },
      _avg: {
        qualityScore:  true,
        deliveryScore: true,
        pricingScore:  true,
        overallScore:  true,
        fillRate:      true,
      },
      _count: { id: true },
    }),
    prisma.supplierRating.count({ where: { supplierId, deliveredOnTime: true } }),
    prisma.supplierRating.count({ where: { supplierId } }),
  ]);

  const result = {
    supplier,
    totalRatings:     total,
    onTimeDeliveryPct: total > 0 ? parseFloat(((onTimeCount / total) * 100).toFixed(1)) : 0,
    avgQualityScore:  parseFloat((agg._avg.qualityScore  ?? 0).toFixed(2)),
    avgDeliveryScore: parseFloat((agg._avg.deliveryScore ?? 0).toFixed(2)),
    avgPricingScore:  parseFloat((agg._avg.pricingScore  ?? 0).toFixed(2)),
    avgOverallScore:  parseFloat((agg._avg.overallScore  ?? 0).toFixed(2)),
    avgFillRate:      parseFloat((agg._avg.fillRate      ?? 0).toFixed(1)),
  };

  await set(cacheKey, result, CACHE_TTL);
  return result;
};

// ── Leaderboard across all suppliers ──────────────────────────────────────────
export const getLeaderboard = async (limit = 10) => {
  const cacheKey = `supplier-ratings:leaderboard:${String(limit)}`;
  const cached   = await get<unknown>(cacheKey);
  if (cached) return cached;

  const agg = await prisma.supplierRating.groupBy({
    by:      ['supplierId'],
    _avg:    { overallScore: true, fillRate: true },
    _count:  { id: true },
    orderBy: { _avg: { overallScore: 'desc' } },
    take:    limit,
  });

  const supplierIds = agg.map((r) => r.supplierId);
  const suppliers   = await prisma.supplier.findMany({
    where:  { id: { in: supplierIds } },
    select: { id: true, name: true },
  });
  const supplierMap = new Map(suppliers.map((s) => [s.id, s]));

  const result = agg.map((r) => ({
    supplier:        supplierMap.get(r.supplierId),
    totalRatings:    r._count.id,
    avgOverallScore: parseFloat((r._avg.overallScore ?? 0).toFixed(2)),
    avgFillRate:     parseFloat((r._avg.fillRate     ?? 0).toFixed(1)),
  }));

  await set(cacheKey, result, CACHE_TTL);
  return result;
};

export const remove = async (id: number): Promise<void> => {
  const existing = await prisma.supplierRating.findUnique({ where: { id } });
  if (!existing) throw new Error('RATING_NOT_FOUND');
  await prisma.supplierRating.delete({ where: { id } });
  await invalidate('supplier-ratings:');
};
