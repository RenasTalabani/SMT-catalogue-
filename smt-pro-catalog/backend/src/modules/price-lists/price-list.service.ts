import prisma from '../../config/prisma';
import { get, set, invalidate } from '../../shared/utils/cache.util';

const CACHE_TTL = 300;

export interface CreatePriceListInput {
  name:        string;
  description?: string;
  type:        'RETAIL' | 'WHOLESALE' | 'VIP' | 'CUSTOM';
  isDefault?:  boolean;
  isActive?:   boolean;
}

export interface UpsertItemInput {
  productId: number;
  price:     number;
  discount?: number;
}

// ── Get all price lists ────────────────────────────────────────────────────────
export const getAll = async (params: { page?: number; limit?: number; activeOnly?: boolean } = {}) => {
  const { page = 1, limit = 20, activeOnly } = params;
  const cacheKey = `price-lists:${page}:${limit}:${String(activeOnly)}`;
  const cached   = await get<unknown>(cacheKey);
  if (cached) return cached;

  const where = activeOnly ? { isActive: true } : {};
  const skip  = (page - 1) * limit;
  const [lists, total] = await Promise.all([
    prisma.priceList.findMany({
      where,
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
      skip,
      take: limit,
      include: { _count: { select: { items: true, customers: true } } },
    }),
    prisma.priceList.count({ where }),
  ]);

  const result = { lists, total, page, limit };
  await set(cacheKey, result, CACHE_TTL);
  return result;
};

// ── Get one price list with items ──────────────────────────────────────────────
export const getById = async (id: number) => {
  const pl = await prisma.priceList.findUnique({
    where:   { id },
    include: {
      items: {
        include: { product: { select: { id: true, name: true, sku: true, price: true, unit: true } } },
        orderBy: { product: { name: 'asc' } },
      },
      _count: { select: { customers: true } },
    },
  });
  if (!pl) throw new Error('PRICE_LIST_NOT_FOUND');
  return pl;
};

// ── Get effective price for a product given a customer ─────────────────────────
export const getEffectivePrice = async (productId: number, customerId?: number): Promise<number> => {
  const product = await prisma.product.findUnique({ where: { id: productId }, select: { price: true } });
  if (!product) throw new Error('PRODUCT_NOT_FOUND');

  if (!customerId) return product.price;

  const customer = await prisma.customer.findUnique({
    where:   { id: customerId },
    select:  { priceListId: true },
  });
  if (!customer?.priceListId) return product.price;

  const item = await prisma.priceListItem.findUnique({
    where: { priceListId_productId: { priceListId: customer.priceListId, productId } },
  });
  if (!item) return product.price;

  const effective = item.discount > 0
    ? parseFloat((item.price * (1 - item.discount / 100)).toFixed(2))
    : item.price;
  return effective;
};

// ── Create ─────────────────────────────────────────────────────────────────────
export const create = async (data: CreatePriceListInput) => {
  if (data.isDefault) {
    await prisma.priceList.updateMany({ where: { isDefault: true }, data: { isDefault: false } });
  }
  const pl = await prisma.priceList.create({ data });
  await invalidate('price-lists:');
  return pl;
};

// ── Update ─────────────────────────────────────────────────────────────────────
export const update = async (id: number, data: Partial<CreatePriceListInput>) => {
  const existing = await prisma.priceList.findUnique({ where: { id } });
  if (!existing) throw new Error('PRICE_LIST_NOT_FOUND');

  if (data.isDefault) {
    await prisma.priceList.updateMany({ where: { isDefault: true, id: { not: id } }, data: { isDefault: false } });
  }
  const pl = await prisma.priceList.update({ where: { id }, data });
  await invalidate('price-lists:');
  return pl;
};

// ── Delete ─────────────────────────────────────────────────────────────────────
export const remove = async (id: number): Promise<void> => {
  const existing = await prisma.priceList.findUnique({ where: { id } });
  if (!existing) throw new Error('PRICE_LIST_NOT_FOUND');
  if (existing.isDefault) throw new Error('PRICE_LIST_IS_DEFAULT');
  const assigned = await prisma.customer.count({ where: { priceListId: id } });
  if (assigned > 0) throw new Error('PRICE_LIST_HAS_CUSTOMERS');
  await prisma.priceList.delete({ where: { id } });
  await invalidate('price-lists:');
};

// ── Upsert items (bulk set prices for products) ────────────────────────────────
export const upsertItems = async (priceListId: number, items: UpsertItemInput[]) => {
  const pl = await prisma.priceList.findUnique({ where: { id: priceListId } });
  if (!pl) throw new Error('PRICE_LIST_NOT_FOUND');

  await prisma.$transaction(
    items.map((i) =>
      prisma.priceListItem.upsert({
        where:  { priceListId_productId: { priceListId, productId: i.productId } },
        create: { priceListId, productId: i.productId, price: i.price, discount: i.discount ?? 0 },
        update: { price: i.price, discount: i.discount ?? 0 },
      }),
    ),
  );

  await invalidate('price-lists:');
  return getById(priceListId);
};

// ── Remove a single item from a price list ─────────────────────────────────────
export const removeItem = async (priceListId: number, productId: number): Promise<void> => {
  await prisma.priceListItem.deleteMany({ where: { priceListId, productId } });
  await invalidate('price-lists:');
};

// ── Assign price list to customer ──────────────────────────────────────────────
export const assignToCustomer = async (customerId: number, priceListId: number | null) => {
  if (priceListId !== null) {
    const pl = await prisma.priceList.findUnique({ where: { id: priceListId } });
    if (!pl) throw new Error('PRICE_LIST_NOT_FOUND');
  }
  return prisma.customer.update({
    where:  { id: customerId },
    data:   { priceListId },
    select: { id: true, name: true, priceListId: true },
  });
};
