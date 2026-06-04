import prisma from '../../config/prisma';
import bcrypt  from 'bcryptjs';
import { get, set } from '../../shared/utils/cache.util';

const CACHE_TTL = 300;

// ── Customer self-registration ─────────────────────────────────────────────────
export const register = async (data: {
  name: string; email: string; password: string; phone?: string; address?: string;
}) => {
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) throw new Error('EMAIL_TAKEN');

  const hashed = await bcrypt.hash(data.password, 12);

  return prisma.$transaction(async (tx) => {
    const customer = await tx.customer.create({
      data: { name: data.name, email: data.email, phone: data.phone ?? null, address: data.address ?? null },
    });
    const user = await tx.user.create({
      data: { name: data.name, email: data.email, password: hashed, role: 'customer', linkedCustomerId: customer.id },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });
    return { user, customerId: customer.id };
  });
};

// ── Get profile (customer-facing) ─────────────────────────────────────────────
export const getProfile = async (userId: number) => {
  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: {
      id: true, name: true, email: true, role: true, createdAt: true,
      linkedCustomer: {
        select: {
          id: true, phone: true, address: true,
          creditAccount:  { select: { balance: true, creditLimit: true, status: true } },
          loyaltyAccount: { select: { points: true, tier: true, lifetimePoints: true } },
        },
      },
    },
  });
  if (!user) throw new Error('USER_NOT_FOUND');
  return user;
};

export const updateProfile = async (userId: number, data: { name?: string; phone?: string; address?: string }) => {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { linkedCustomerId: true } });
  if (!user) throw new Error('USER_NOT_FOUND');

  await prisma.$transaction(async (tx) => {
    if (data.name) await tx.user.update({ where: { id: userId }, data: { name: data.name } });
    if (user.linkedCustomerId) {
      await tx.customer.update({
        where: { id: user.linkedCustomerId },
        data: { name: data.name ?? undefined, phone: data.phone ?? undefined, address: data.address ?? undefined },
      });
    }
  });
  return getProfile(userId);
};

// ── Public product listing ─────────────────────────────────────────────────────
export const listProducts = async (params: {
  page?: number; limit?: number; search?: string; category?: string;
  categoryId?: number; tag?: string; minPrice?: number; maxPrice?: number;
  inStock?: boolean; sortBy?: 'price_asc' | 'price_desc' | 'newest';
} = {}) => {
  const { page = 1, limit = 20, search, category, categoryId, tag, minPrice, maxPrice, inStock, sortBy = 'newest' } = params;
  const cacheKey = `shop2:products:${JSON.stringify(params)}`;
  const cached   = await get<unknown>(cacheKey);
  if (cached) return cached;

  const skip  = (page - 1) * limit;
  const where: Record<string, unknown> = { isActive: true, deletedAt: null };
  if (search)     where['name']       = { contains: search, mode: 'insensitive' };
  if (category)   where['category']   = { contains: category, mode: 'insensitive' };
  if (categoryId) where['categoryId'] = categoryId;
  if (inStock)    where['quantity']   = { gt: 0 };
  if (minPrice !== undefined || maxPrice !== undefined) {
    const p: Record<string, unknown> = {};
    if (minPrice !== undefined) p['gte'] = minPrice;
    if (maxPrice !== undefined) p['lte'] = maxPrice;
    where['price'] = p;
  }
  if (tag) where['tags'] = { some: { tag: { slug: tag } } };

  const orderBy =
    sortBy === 'price_asc'  ? { price: 'asc' as const }      :
    sortBy === 'price_desc' ? { price: 'desc' as const }     :
    { createdAt: 'desc' as const };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where, orderBy, skip, take: limit,
      select: {
        id: true, name: true, description: true, price: true, quantity: true,
        imageUrl: true, category: true, sku: true, unit: true,
        tags:   { include: { tag: { select: { name: true, color: true, slug: true } } } },
        _count: { select: { reviews: true, variants: true } },
      },
    }),
    prisma.product.count({ where }),
  ]);

  const ids      = products.map((p) => p.id);
  const ratings  = await prisma.productReview.groupBy({
    by:    ['productId'], where: { productId: { in: ids }, isApproved: true }, _avg: { rating: true },
  });
  const ratingMap = new Map(ratings.map((r) => [r.productId, parseFloat((r._avg.rating ?? 0).toFixed(1))]));

  const result = {
    products: products.map((p) => ({ ...p, averageRating: ratingMap.get(p.id) ?? null })),
    total, page, limit, totalPages: Math.ceil(total / limit),
  };
  await set(cacheKey, result, CACHE_TTL);
  return result;
};

// ── Rich product detail ────────────────────────────────────────────────────────
export const getProductDetail = async (idOrSku: string) => {
  const cacheKey = `shop2:product:${idOrSku}`;
  const cached   = await get<unknown>(cacheKey);
  if (cached) return cached;

  const where = /^\d+$/.test(idOrSku) ? { id: Number(idOrSku) } : { sku: idOrSku };
  const product = await prisma.product.findFirst({
    where: { ...where, isActive: true, deletedAt: null },
    include: {
      categoryRef: { select: { id: true, name: true, slug: true } },
      tags:        { include: { tag: true } },
      attributes:  { orderBy: { attribute: { sortOrder: 'asc' } }, include: { attribute: true } },
      variants:    { where: { isActive: true }, orderBy: { sortOrder: 'asc' }, select: { id: true, name: true, sku: true, price: true, quantity: true, attributes: true, imageUrl: true } },
    },
  });
  if (!product) throw new Error('PRODUCT_NOT_FOUND');

  const [related, reviewSummary] = await Promise.all([
    prisma.product.findMany({
      where:   { category: product.category, id: { not: product.id }, isActive: true, deletedAt: null },
      take:    8, orderBy: { createdAt: 'desc' },
      select:  { id: true, name: true, price: true, imageUrl: true, quantity: true },
    }),
    prisma.productReview.aggregate({
      where: { productId: product.id, isApproved: true },
      _avg: { rating: true }, _count: { rating: true },
    }),
  ]);

  const result = {
    ...product,
    stockStatus:   product.quantity > 0 ? (product.quantity <= product.lowStockAlert ? 'LOW_STOCK' : 'IN_STOCK') : 'OUT_OF_STOCK',
    averageRating: parseFloat((reviewSummary._avg.rating ?? 0).toFixed(1)),
    reviewCount:   reviewSummary._count.rating,
    related,
  };
  await set(cacheKey, result, CACHE_TTL);
  return result;
};

// ── Category tree ─────────────────────────────────────────────────────────────
export const getCategoryTree = async () => {
  const cacheKey = 'shop2:categories';
  const cached   = await get<unknown>(cacheKey);
  if (cached) return cached;

  const cats = await prisma.category.findMany({
    where: { isActive: true }, orderBy: [{ parentId: 'asc' }, { order: 'asc' }],
    include: { _count: { select: { products: true } } },
  });

  type CatNode = typeof cats[0] & { children: CatNode[] };
  const map = new Map<number, CatNode>(cats.map((c) => [c.id, { ...c, children: [] }]));
  const tree: CatNode[] = [];
  for (const c of map.values()) {
    if (c.parentId) map.get(c.parentId)?.children.push(c);
    else tree.push(c);
  }

  await set(cacheKey, tree, CACHE_TTL);
  return tree;
};
