import prisma from '../../config/prisma';

const PRODUCT_SELECT = {
  id: true, name: true, price: true, quantity: true,
  imageUrl: true, category: true, sku: true, unit: true,
};

export const getWishlist = async (userId: number) => {
  const items = await prisma.wishlist.findMany({
    where:   { userId },
    orderBy: { createdAt: 'desc' },
    include: { product: { select: PRODUCT_SELECT } },
  });
  return { items, count: items.length };
};

export const addToWishlist = async (userId: number, productId: number) => {
  const product = await prisma.product.findFirst({ where: { id: productId, deletedAt: null, isActive: true } });
  if (!product) throw new Error('PRODUCT_NOT_FOUND');

  return prisma.wishlist.upsert({
    where:  { userId_productId: { userId, productId } },
    create: { userId, productId },
    update: {},
    include: { product: { select: PRODUCT_SELECT } },
  });
};

export const removeFromWishlist = async (userId: number, productId: number): Promise<void> => {
  await prisma.wishlist.deleteMany({ where: { userId, productId } });
};

export const clearWishlist = async (userId: number): Promise<void> => {
  await prisma.wishlist.deleteMany({ where: { userId } });
};

export const isInWishlist = async (userId: number, productId: number): Promise<boolean> => {
  const item = await prisma.wishlist.findUnique({ where: { userId_productId: { userId, productId } } });
  return !!item;
};

// ── Recently viewed ────────────────────────────────────────────────────────────
const MAX_RECENT = 20;

export const trackView = async (userId: number, productId: number): Promise<void> => {
  await prisma.recentlyViewed.upsert({
    where:  { userId_productId: { userId, productId } },
    create: { userId, productId },
    update: { viewedAt: new Date() },
  });

  // Keep only the most recent MAX_RECENT items
  const old = await prisma.recentlyViewed.findMany({
    where:   { userId },
    orderBy: { viewedAt: 'desc' },
    skip:    MAX_RECENT,
    select:  { id: true },
  });
  if (old.length) {
    await prisma.recentlyViewed.deleteMany({ where: { id: { in: old.map((r) => r.id) } } });
  }
};

export const getRecentlyViewed = async (userId: number, limit = 20) => {
  const items = await prisma.recentlyViewed.findMany({
    where:   { userId },
    orderBy: { viewedAt: 'desc' },
    take:    limit,
    include: { product: { select: PRODUCT_SELECT } },
  });
  return items.map((i) => ({ ...i.product, viewedAt: i.viewedAt }));
};
