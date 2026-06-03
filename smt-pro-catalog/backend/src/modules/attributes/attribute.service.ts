import prisma from '../../config/prisma';
import { get, set, invalidate } from '../../shared/utils/cache.util';

const CACHE_TTL = 600;

export type AttributeType = 'TEXT' | 'NUMBER' | 'BOOLEAN';

export interface CreateDefinitionInput {
  name:         string;
  unit?:        string;
  type?:        AttributeType;
  isFilterable?: boolean;
  categoryId?:  number;
  sortOrder?:   number;
}

export interface SetAttributeInput {
  attributeId:  number;
  value:        string;
  numericValue?: number;
}

// ── Attribute definitions CRUD ─────────────────────────────────────────────────
export const getAllDefinitions = async (categoryId?: number) => {
  const cacheKey = `attr:defs:${String(categoryId)}`;
  const cached   = await get<unknown>(cacheKey);
  if (cached) return cached;

  const where = categoryId ? { OR: [{ categoryId }, { categoryId: null }] } : {};
  const defs = await prisma.attributeDefinition.findMany({
    where,
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    include: { _count: { select: { attributes: true } } },
  });

  await set(cacheKey, defs, CACHE_TTL);
  return defs;
};

export const createDefinition = async (data: CreateDefinitionInput) => {
  const exists = await prisma.attributeDefinition.findUnique({ where: { name: data.name } });
  if (exists) throw new Error('ATTRIBUTE_EXISTS');

  const def = await prisma.attributeDefinition.create({ data });
  await invalidate('attr:defs:');
  return def;
};

export const updateDefinition = async (id: number, data: Partial<CreateDefinitionInput>) => {
  const existing = await prisma.attributeDefinition.findUnique({ where: { id } });
  if (!existing) throw new Error('ATTRIBUTE_NOT_FOUND');

  if (data.name && data.name !== existing.name) {
    const conflict = await prisma.attributeDefinition.findUnique({ where: { name: data.name } });
    if (conflict) throw new Error('ATTRIBUTE_EXISTS');
  }

  const def = await prisma.attributeDefinition.update({ where: { id }, data });
  await invalidate('attr:defs:');
  return def;
};

export const deleteDefinition = async (id: number): Promise<void> => {
  const existing = await prisma.attributeDefinition.findUnique({ where: { id } });
  if (!existing) throw new Error('ATTRIBUTE_NOT_FOUND');
  const usageCount = await prisma.productAttribute.count({ where: { attributeId: id } });
  if (usageCount > 0) throw new Error('ATTRIBUTE_IN_USE');
  await prisma.attributeDefinition.delete({ where: { id } });
  await invalidate('attr:defs:');
};

// ── Product attributes ─────────────────────────────────────────────────────────
export const getProductAttributes = async (productId: number) => {
  const cacheKey = `attr:product:${productId}`;
  const cached   = await get<unknown>(cacheKey);
  if (cached) return cached;

  const product = await prisma.product.findFirst({ where: { id: productId, deletedAt: null } });
  if (!product) throw new Error('PRODUCT_NOT_FOUND');

  const attrs = await prisma.productAttribute.findMany({
    where:   { productId },
    orderBy: { attribute: { sortOrder: 'asc' } },
    include: { attribute: { select: { id: true, name: true, unit: true, type: true } } },
  });

  await set(cacheKey, attrs, CACHE_TTL);
  return attrs;
};

// ── Set / bulk-upsert attributes for a product ─────────────────────────────────
export const setProductAttributes = async (productId: number, attrs: SetAttributeInput[]) => {
  const product = await prisma.product.findFirst({ where: { id: productId, deletedAt: null } });
  if (!product) throw new Error('PRODUCT_NOT_FOUND');

  await prisma.$transaction(
    attrs.map((a) =>
      prisma.productAttribute.upsert({
        where:  { productId_attributeId: { productId, attributeId: a.attributeId } },
        create: { productId, attributeId: a.attributeId, value: a.value, numericValue: a.numericValue ?? null },
        update: { value: a.value, numericValue: a.numericValue ?? null },
      }),
    ),
  );

  await invalidate(`attr:product:${productId}`);
  return getProductAttributes(productId);
};

// ── Remove one attribute from a product ───────────────────────────────────────
export const removeProductAttribute = async (productId: number, attributeId: number): Promise<void> => {
  await prisma.productAttribute.deleteMany({ where: { productId, attributeId } });
  await invalidate(`attr:product:${productId}`);
};

// ── Spec search: find products matching attribute filters ─────────────────────
// filters = [{ attributeId, value?, minValue?, maxValue? }]
export const searchByAttributes = async (
  filters: Array<{ attributeId: number; value?: string; minValue?: number; maxValue?: number }>,
  page = 1,
  limit = 20,
) => {
  const skip = (page - 1) * limit;

  // Build productIds that match ALL filters (AND logic)
  let productIds: number[] | null = null;

  for (const filter of filters) {
    const where: Record<string, unknown> = { attributeId: filter.attributeId };
    if (filter.value !== undefined)    where['value']        = { contains: filter.value, mode: 'insensitive' };
    if (filter.minValue !== undefined) where['numericValue'] = { ...where['numericValue'] as object, gte: filter.minValue };
    if (filter.maxValue !== undefined) where['numericValue'] = { ...where['numericValue'] as object, lte: filter.maxValue };

    const matched = await prisma.productAttribute.findMany({ where, select: { productId: true } });
    const matchedIds = matched.map((m) => m.productId);

    productIds = productIds === null
      ? matchedIds
      : productIds.filter((id) => matchedIds.includes(id));

    if (productIds.length === 0) break;
  }

  if (productIds !== null && productIds.length === 0) return { products: [], total: 0, page, limit };

  const productWhere: Record<string, unknown> = { deletedAt: null, isActive: true };
  if (productIds !== null) productWhere['id'] = { in: productIds };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where:   productWhere,
      orderBy: { name: 'asc' },
      skip,
      take: limit,
      select: {
        id: true, name: true, price: true, quantity: true, sku: true,
        imageUrl: true, category: true, unit: true,
        attributes: {
          include: { attribute: { select: { name: true, unit: true } } },
          orderBy: { attribute: { sortOrder: 'asc' } },
        },
      },
    }),
    prisma.product.count({ where: productWhere }),
  ]);

  return { products, total, page, limit };
};
