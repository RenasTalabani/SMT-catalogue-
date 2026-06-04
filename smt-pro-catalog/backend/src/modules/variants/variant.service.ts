import prisma from '../../config/prisma';
import { invalidate } from '../../shared/utils/cache.util';

export interface CreateVariantInput {
  name:        string;
  sku?:        string;
  barcode?:    string;
  price:       number;
  costPrice?:  number;
  quantity?:   number;
  attributes?: Record<string, string | number | boolean>;
  imageUrl?:   string;
  isActive?:   boolean;
  sortOrder?:  number;
}

// ── Get all variants for a product ───────────────────────────────────────────
export const getByProduct = async (parentId: number) => {
  const product = await prisma.product.findFirst({ where: { id: parentId, deletedAt: null } });
  if (!product) throw new Error('PRODUCT_NOT_FOUND');

  const variants = await prisma.productVariant.findMany({
    where:   { parentId },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });

  return { product: { id: product.id, name: product.name, sku: product.sku }, variants };
};

// ── Get one variant ───────────────────────────────────────────────────────────
export const getById = async (id: number) => {
  const v = await prisma.productVariant.findUnique({
    where:   { id },
    include: { parent: { select: { id: true, name: true, sku: true, category: true } } },
  });
  if (!v) throw new Error('VARIANT_NOT_FOUND');
  return v;
};

// ── Create variant ────────────────────────────────────────────────────────────
export const create = async (parentId: number, data: CreateVariantInput) => {
  const product = await prisma.product.findFirst({ where: { id: parentId, deletedAt: null } });
  if (!product) throw new Error('PRODUCT_NOT_FOUND');

  if (data.sku) {
    const skuConflict = await prisma.productVariant.findUnique({ where: { sku: data.sku } });
    if (skuConflict) throw new Error('SKU_TAKEN');
    const productSkuConflict = await prisma.product.findUnique({ where: { sku: data.sku } });
    if (productSkuConflict) throw new Error('SKU_TAKEN');
  }

  const variant = await prisma.productVariant.create({
    data: {
      parentId,
      name:       data.name,
      sku:        data.sku        ?? null,
      barcode:    data.barcode    ?? null,
      price:      data.price,
      costPrice:  data.costPrice  ?? 0,
      quantity:   data.quantity   ?? 0,
      attributes: data.attributes ?? undefined,
      imageUrl:   data.imageUrl   ?? null,
      isActive:   data.isActive   ?? true,
      sortOrder:  data.sortOrder  ?? 0,
    },
    include: { parent: { select: { id: true, name: true } } },
  });

  await invalidate('products:');
  return variant;
};

// ── Bulk create variants ──────────────────────────────────────────────────────
export const bulkCreate = async (parentId: number, items: CreateVariantInput[]) => {
  const product = await prisma.product.findFirst({ where: { id: parentId, deletedAt: null } });
  if (!product) throw new Error('PRODUCT_NOT_FOUND');

  const variants = await prisma.$transaction(
    items.map((d) =>
      prisma.productVariant.create({
        data: {
          parentId,
          name:       d.name,
          sku:        d.sku        ?? null,
          barcode:    d.barcode    ?? null,
          price:      d.price,
          costPrice:  d.costPrice  ?? 0,
          quantity:   d.quantity   ?? 0,
          attributes: d.attributes ?? undefined,
          imageUrl:   d.imageUrl   ?? null,
          isActive:   d.isActive   ?? true,
          sortOrder:  d.sortOrder  ?? 0,
        },
      }),
    ),
  );

  await invalidate('products:');
  return variants;
};

// ── Update variant ────────────────────────────────────────────────────────────
export const update = async (id: number, data: Partial<CreateVariantInput>) => {
  const existing = await prisma.productVariant.findUnique({ where: { id } });
  if (!existing) throw new Error('VARIANT_NOT_FOUND');

  if (data.sku && data.sku !== existing.sku) {
    const conflict = await prisma.productVariant.findUnique({ where: { sku: data.sku } });
    if (conflict) throw new Error('SKU_TAKEN');
  }

  const variant = await prisma.productVariant.update({ where: { id }, data });
  await invalidate('products:');
  return variant;
};

// ── Adjust stock ──────────────────────────────────────────────────────────────
export const adjustStock = async (id: number, delta: number, employeeId: number, notes?: string) => {
  const v = await prisma.productVariant.findUnique({ where: { id } });
  if (!v) throw new Error('VARIANT_NOT_FOUND');
  const newQty = v.quantity + delta;
  if (newQty < 0) throw new Error('INSUFFICIENT_STOCK');

  const updated = await prisma.productVariant.update({ where: { id }, data: { quantity: newQty } });

  await prisma.stockMovement.create({
    data: {
      productId:   v.parentId,
      type:        delta > 0 ? 'IN' : 'OUT',
      quantity:    Math.abs(delta),
      previousQty: v.quantity,
      newQty,
      notes:       notes ?? `Variant ${v.name} (ID ${id}) stock ${delta > 0 ? 'added' : 'removed'}`,
      employeeId,
      reference:   `VAR-${String(id).padStart(6, '0')}`,
    },
  });

  return updated;
};

// ── Delete variant ────────────────────────────────────────────────────────────
export const remove = async (id: number): Promise<void> => {
  const v = await prisma.productVariant.findUnique({ where: { id } });
  if (!v) throw new Error('VARIANT_NOT_FOUND');
  await prisma.productVariant.delete({ where: { id } });
  await invalidate('products:');
};

// ── Stats: low-stock variants ─────────────────────────────────────────────────
export const getLowStockVariants = async (threshold = 10) => {
  return prisma.productVariant.findMany({
    where:   { isActive: true, quantity: { lte: threshold } },
    orderBy: { quantity: 'asc' },
    include: { parent: { select: { id: true, name: true, category: true } } },
  });
};
