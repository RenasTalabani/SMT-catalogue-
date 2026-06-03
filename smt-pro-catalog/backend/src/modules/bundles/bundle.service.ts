import prisma from '../../config/prisma';
import { getIO } from '../../config/socket';
import { get, set, invalidate } from '../../shared/utils/cache.util';

const CACHE_TTL = 120;

export interface CreateBundleInput {
  name:           string;
  description?:   string;
  price:          number;
  compareAtPrice?: number;
  isActive?:      boolean;
  items: Array<{ productId: number; quantity: number }>;
}

const BUNDLE_SELECT = {
  id: true, name: true, description: true, imageUrl: true,
  price: true, compareAtPrice: true, isActive: true,
  createdAt: true, updatedAt: true,
} as const;

// ── Get all bundles ────────────────────────────────────────────────────────────
export const getAll = async (params: { page?: number; limit?: number; activeOnly?: boolean } = {}) => {
  const { page = 1, limit = 20, activeOnly } = params;
  const cacheKey = `bundles:list:${page}:${limit}:${String(activeOnly)}`;
  const cached   = await get<unknown>(cacheKey);
  if (cached) return cached;

  const where = activeOnly ? { isActive: true } : {};
  const skip  = (page - 1) * limit;
  const [bundles, total] = await Promise.all([
    prisma.bundle.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        items: { include: { product: { select: { id: true, name: true, sku: true, quantity: true, imageUrl: true } } } },
      },
    }),
    prisma.bundle.count({ where }),
  ]);

  const result = { bundles, total, page, limit };
  await set(cacheKey, result, CACHE_TTL);
  return result;
};

// ── Get one bundle ─────────────────────────────────────────────────────────────
export const getById = async (id: number) => {
  const bundle = await prisma.bundle.findUnique({
    where:   { id },
    include: {
      items: {
        include: {
          product: { select: { id: true, name: true, sku: true, price: true, quantity: true, unit: true, imageUrl: true } },
        },
      },
    },
  });
  if (!bundle) throw new Error('BUNDLE_NOT_FOUND');
  return bundle;
};

// ── Check if a bundle is in stock ──────────────────────────────────────────────
export const checkStock = async (id: number): Promise<{ inStock: boolean; shortfall: Array<{ productId: number; name: string; required: number; available: number }> }> => {
  const bundle = await getById(id);
  const shortfall = bundle.items
    .filter((i) => i.product.quantity < i.quantity)
    .map((i) => ({
      productId: i.productId,
      name:      i.product.name,
      required:  i.quantity,
      available: i.product.quantity,
    }));

  return { inStock: shortfall.length === 0, shortfall };
};

// ── Create bundle ──────────────────────────────────────────────────────────────
export const create = async (data: CreateBundleInput) => {
  if (!data.items.length) throw new Error('BUNDLE_ITEMS_REQUIRED');

  const productIds = data.items.map((i) => i.productId);
  const products   = await prisma.product.findMany({
    where:  { id: { in: productIds }, deletedAt: null },
    select: { id: true },
  });
  if (products.length !== productIds.length) throw new Error('PRODUCT_NOT_FOUND');

  const bundle = await prisma.bundle.create({
    data: {
      name:           data.name,
      description:    data.description ?? null,
      price:          data.price,
      compareAtPrice: data.compareAtPrice ?? null,
      isActive:       data.isActive ?? true,
      items: {
        create: data.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      },
    },
    include: {
      items: { include: { product: { select: { id: true, name: true } } } },
    },
  });

  await invalidate('bundles:');
  return bundle;
};

// ── Update bundle (metadata only — use upsertItems for items) ─────────────────
export const update = async (
  id: number,
  data: Partial<Omit<CreateBundleInput, 'items'>> & { items?: Array<{ productId: number; quantity: number }> },
) => {
  const existing = await prisma.bundle.findUnique({ where: { id } });
  if (!existing) throw new Error('BUNDLE_NOT_FOUND');

  const { items, ...meta } = data;

  await prisma.$transaction(async (tx) => {
    if (Object.keys(meta).length) {
      await tx.bundle.update({ where: { id }, data: meta });
    }
    if (items?.length) {
      await tx.bundleItem.deleteMany({ where: { bundleId: id } });
      await tx.bundleItem.createMany({
        data: items.map((i) => ({ bundleId: id, productId: i.productId, quantity: i.quantity })),
      });
    }
  });

  await invalidate('bundles:');
  return getById(id);
};

// ── Remove bundle ──────────────────────────────────────────────────────────────
export const remove = async (id: number): Promise<void> => {
  const existing = await prisma.bundle.findUnique({ where: { id } });
  if (!existing) throw new Error('BUNDLE_NOT_FOUND');
  await prisma.bundle.delete({ where: { id } });
  await invalidate('bundles:');
};

// ── Order a bundle: validate stock + create order + deduct stock ───────────────
export const createOrderFromBundle = async (
  bundleId: number,
  userId: number,
  opts?: { customerId?: number; paymentMethod?: string; notes?: string },
) => {
  const bundle = await getById(bundleId);
  if (!bundle.isActive) throw new Error('BUNDLE_INACTIVE');

  const { inStock, shortfall } = await checkStock(bundleId);
  if (!inStock) throw new Error(`INSUFFICIENT_STOCK:${JSON.stringify(shortfall)}`);

  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        userId,
        customerId:    opts?.customerId    ?? null,
        totalAmount:   bundle.price,
        finalAmount:   bundle.price,
        status:        'PENDING',
        paymentMethod: opts?.paymentMethod ?? 'CASH',
        notes:         opts?.notes ?? `Bundle: ${bundle.name}`,
        items: {
          create: bundle.items.map((bi) => ({
            productId: bi.productId,
            quantity:  bi.quantity,
            price:     parseFloat((bundle.price / bundle.items.reduce((s, i) => s + i.quantity, 0)).toFixed(2)),
          })),
        },
      },
      include: { items: { include: { product: { select: { name: true } } } } },
    });

    for (const bi of bundle.items) {
      await tx.product.update({
        where: { id: bi.productId },
        data:  { quantity: { decrement: bi.quantity } },
      });
    }

    return created;
  });

  await invalidate('products:');
  getIO()?.to('all').emit('order:created', { ...order, bundleId });
  return order;
};
