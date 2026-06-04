import prisma from '../../config/prisma';
import { get, set, invalidate } from '../../shared/utils/cache.util';

const CACHE_TTL = 60; // 1 minute — flash sales change frequently

export interface CreateFlashSaleInput {
  title:       string;
  productId?:  number;
  variantId?:  number;
  categoryId?: number;
  salePrice?:  number;
  discountPct?: number;
  maxQuantity?: number;
  isActive?:   boolean;
  startAt:     string;
  endAt:       string;
}

// ── Active flash sales (used by shop / cart pricing) ──────────────────────────
export const getActive = async () => {
  const cacheKey = 'flash-sales:active';
  const cached   = await get<unknown>(cacheKey);
  if (cached) return cached;

  const now = new Date();
  const sales = await prisma.flashSale.findMany({
    where: {
      isActive: true,
      startAt:  { lte: now },
      endAt:    { gte: now },
    },
    include: {
      product:  { select: { id: true, name: true, price: true } },
      variant:  { select: { id: true, sku: true, price: true } },
      category: { select: { id: true, name: true } },
    },
    orderBy: { endAt: 'asc' },
  });

  await set(cacheKey, sales, CACHE_TTL);
  return sales;
};

// ── Admin list ─────────────────────────────────────────────────────────────────
export const getAll = async (params: {
  page?: number; limit?: number; activeOnly?: boolean; search?: string;
} = {}) => {
  const { page = 1, limit = 20, activeOnly, search } = params;
  const cacheKey = `flash-sales:list:${String(page)}:${String(limit)}:${String(activeOnly)}:${String(search)}`;
  const cached   = await get<unknown>(cacheKey);
  if (cached) return cached;

  const skip  = (page - 1) * limit;
  const where: Record<string, unknown> = {};
  if (activeOnly) where['isActive'] = true;
  if (search)     where['title']    = { contains: search, mode: 'insensitive' };

  const [sales, total] = await Promise.all([
    prisma.flashSale.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        product:  { select: { id: true, name: true, price: true } },
        variant:  { select: { id: true, sku: true, price: true } },
        category: { select: { id: true, name: true } },
      },
    }),
    prisma.flashSale.count({ where }),
  ]);

  const result = { sales, total, page, limit };
  await set(cacheKey, result, CACHE_TTL);
  return result;
};

export const getById = async (id: number) => {
  const sale = await prisma.flashSale.findUnique({
    where:   { id },
    include: {
      product:  { select: { id: true, name: true, price: true } },
      variant:  { select: { id: true, sku: true, price: true } },
      category: { select: { id: true, name: true } },
    },
  });
  if (!sale) throw new Error('FLASH_SALE_NOT_FOUND');
  return sale;
};

export const create = async (data: CreateFlashSaleInput) => {
  const start = new Date(data.startAt);
  const end   = new Date(data.endAt);
  if (end <= start) throw new Error('END_BEFORE_START');
  if (!data.salePrice && !data.discountPct) throw new Error('PRICE_OR_PCT_REQUIRED');

  const sale = await prisma.flashSale.create({
    data: {
      title:       data.title,
      productId:   data.productId  ?? null,
      variantId:   data.variantId  ?? null,
      categoryId:  data.categoryId ?? null,
      salePrice:   data.salePrice  ?? null,
      discountPct: data.discountPct ?? null,
      maxQuantity: data.maxQuantity ?? null,
      isActive:    data.isActive ?? true,
      startAt:     start,
      endAt:       end,
    },
  });
  await invalidate('flash-sales:');
  return sale;
};

export const update = async (id: number, data: Partial<CreateFlashSaleInput> & { isActive?: boolean }) => {
  const existing = await prisma.flashSale.findUnique({ where: { id } });
  if (!existing) throw new Error('FLASH_SALE_NOT_FOUND');

  const updateData: Record<string, unknown> = { ...data };
  if (data.startAt) updateData['startAt'] = new Date(data.startAt);
  if (data.endAt)   updateData['endAt']   = new Date(data.endAt);

  if (data.startAt && data.endAt) {
    if (new Date(data.endAt) <= new Date(data.startAt)) throw new Error('END_BEFORE_START');
  }

  const sale = await prisma.flashSale.update({ where: { id }, data: updateData });
  await invalidate('flash-sales:');
  return sale;
};

export const remove = async (id: number): Promise<void> => {
  const existing = await prisma.flashSale.findUnique({ where: { id } });
  if (!existing) throw new Error('FLASH_SALE_NOT_FOUND');
  await prisma.flashSale.delete({ where: { id } });
  await invalidate('flash-sales:');
};

export const getStats = async () => {
  const now = new Date();
  const [total, active, upcoming, expired] = await Promise.all([
    prisma.flashSale.count(),
    prisma.flashSale.count({ where: { isActive: true, startAt: { lte: now }, endAt: { gte: now } } }),
    prisma.flashSale.count({ where: { isActive: true, startAt: { gt: now } } }),
    prisma.flashSale.count({ where: { endAt: { lt: now } } }),
  ]);

  const topSelling = await prisma.flashSale.findMany({
    where:   { soldCount: { gt: 0 } },
    orderBy: { soldCount: 'desc' },
    take:    5,
    select:  { id: true, title: true, soldCount: true, maxQuantity: true },
  });

  return { total, active, upcoming, expired, topSelling };
};
