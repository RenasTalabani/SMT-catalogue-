import prisma from '../../config/prisma';
import { get, set } from '../../shared/utils/cache.util';

const CACHE_TTL = 300; // 5 min

const PRODUCT_SELECT = {
  id: true, name: true, price: true, costPrice: true, quantity: true,
  imageUrl: true, category: true, sku: true, unit: true,
  tags:       { include: { tag: { select: { id: true, name: true, color: true } } } },
  attributes: { include: { attribute: { select: { name: true, unit: true } } }, take: 5 },
  _count:     { select: { variants: true } },
};

// ── Home screen data ───────────────────────────────────────────────────────────
export const getHomeScreen = async () => {
  const cacheKey = 'home:screen';
  const cached   = await get<unknown>(cacheKey);
  if (cached) return cached;

  const now = new Date();

  const [
    heroBanners,
    promoBanners,
    featuredProducts,
    bestSellers,
    newArrivals,
    popularCategories,
    flashDeals,
  ] = await Promise.all([
    // Hero banners
    prisma.banner.findMany({
      where:   { isActive: true, type: 'HERO', validFrom: { lte: now }, OR: [{ validUntil: null }, { validUntil: { gte: now } }] },
      orderBy: { sortOrder: 'asc' },
    }),
    // Promo banners
    prisma.banner.findMany({
      where:   { isActive: true, type: 'PROMO', validFrom: { lte: now }, OR: [{ validUntil: null }, { validUntil: { gte: now } }] },
      orderBy: { sortOrder: 'asc' },
    }),
    // Featured: most recently added active products
    prisma.product.findMany({
      where:   { isActive: true, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take:    12,
      select:  PRODUCT_SELECT,
    }),
    // Best sellers: products with most order items in the last 90 days
    getBestSellers(12),
    // New arrivals: last 30 days
    prisma.product.findMany({
      where:   { isActive: true, deletedAt: null, createdAt: { gte: new Date(Date.now() - 30 * 86400_000) } },
      orderBy: { createdAt: 'desc' },
      take:    12,
      select:  PRODUCT_SELECT,
    }),
    // Popular categories
    prisma.category.findMany({
      where:   { isActive: true, parentId: null },
      orderBy: { order: 'asc' },
      take:    10,
      include: { _count: { select: { products: true } } },
    }),
    // Flash deals: flash deal banners with linked products
    prisma.banner.findMany({
      where:   { isActive: true, type: 'FLASH_DEAL', validFrom: { lte: now }, OR: [{ validUntil: null }, { validUntil: { gte: now } }] },
      orderBy: { sortOrder: 'asc' },
      take:    5,
    }),
  ]);

  const result = {
    heroBanners,
    promoBanners,
    flashDeals,
    featuredProducts,
    bestSellers,
    newArrivals,
    popularCategories,
  };

  await set(cacheKey, result, CACHE_TTL);
  return result;
};

// ── Best sellers (reusable) ───────────────────────────────────────────────────
export const getBestSellers = async (limit = 20) => {
  const days90 = new Date(Date.now() - 90 * 86400_000);

  const topItems = await prisma.orderItem.groupBy({
    by:      ['productId'],
    where:   { order: { createdAt: { gte: days90 }, status: 'COMPLETED' } },
    _sum:    { quantity: true },
    orderBy: { _sum: { quantity: 'desc' } },
    take:    limit,
  });

  if (!topItems.length) {
    return prisma.product.findMany({ where: { isActive: true, deletedAt: null }, take: limit, select: PRODUCT_SELECT });
  }

  const ids     = topItems.map((t) => t.productId);
  const products = await prisma.product.findMany({
    where:  { id: { in: ids }, isActive: true, deletedAt: null },
    select: PRODUCT_SELECT,
  });

  // Preserve ranking order
  const map = new Map(products.map((p) => [p.id, p]));
  return ids.map((id) => map.get(id)).filter(Boolean);
};

// ── Banner CRUD ───────────────────────────────────────────────────────────────
export const getBanners = async (type?: string) => {
  const where: Record<string, unknown> = {};
  if (type) where['type'] = type;
  return prisma.banner.findMany({ where, orderBy: [{ type: 'asc' }, { sortOrder: 'asc' }] });
};

export const createBanner = async (data: {
  title: string; subtitle?: string; imageUrl: string; linkUrl?: string;
  type?: string; sortOrder?: number; validFrom?: string; validUntil?: string;
}) => {
  const banner = await prisma.banner.create({ data: {
    title:     data.title,
    subtitle:  data.subtitle  ?? null,
    imageUrl:  data.imageUrl,
    linkUrl:   data.linkUrl   ?? null,
    type:      data.type      ?? 'HERO',
    sortOrder: data.sortOrder ?? 0,
    validFrom:  data.validFrom  ? new Date(data.validFrom)  : new Date(),
    validUntil: data.validUntil ? new Date(data.validUntil) : null,
  }});
  await prisma.banner.update({ where: { id: banner.id }, data: {} }); // touch updatedAt
  return banner;
};

export const updateBanner = async (id: number, data: Partial<Parameters<typeof createBanner>[0]> & { isActive?: boolean }) => {
  const existing = await prisma.banner.findUnique({ where: { id } });
  if (!existing) throw new Error('BANNER_NOT_FOUND');
  return prisma.banner.update({ where: { id }, data: {
    ...data,
    validFrom:  data.validFrom  ? new Date(data.validFrom)  : undefined,
    validUntil: data.validUntil ? new Date(data.validUntil) : undefined,
  }});
};

export const deleteBanner = async (id: number): Promise<void> => {
  const existing = await prisma.banner.findUnique({ where: { id } });
  if (!existing) throw new Error('BANNER_NOT_FOUND');
  await prisma.banner.delete({ where: { id } });
};
