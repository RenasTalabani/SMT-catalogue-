import prisma from '../../config/prisma';
import { get, set, invalidate } from '../../shared/utils/cache.util';

const CACHE_TTL = 300;

export interface UpsertSupplierProductInput {
  supplierSku?:  string;
  unitCost:      number;
  leadTimeDays?: number;
  minOrderQty?:  number;
  packSize?:     number;
  isPreferred?:  boolean;
  notes?:        string;
}

// ── Get all suppliers for a product ────────────────────────────────────────────
export const getByProduct = async (productId: number) => {
  const cacheKey = `supplier-products:product:${productId}`;
  const cached   = await get<unknown>(cacheKey);
  if (cached) return cached;

  const product = await prisma.product.findFirst({ where: { id: productId, deletedAt: null } });
  if (!product) throw new Error('PRODUCT_NOT_FOUND');

  const items = await prisma.supplierProduct.findMany({
    where:   { productId },
    orderBy: [{ isPreferred: 'desc' }, { unitCost: 'asc' }],
    include: {
      supplier: { select: { id: true, name: true, phone: true, email: true } },
    },
  });

  const result = { product: { id: product.id, name: product.name, sku: product.sku }, suppliers: items };
  await set(cacheKey, result, CACHE_TTL);
  return result;
};

// ── Get all products a supplier carries ───────────────────────────────────────
export const getBySupplier = async (supplierId: number, page = 1, limit = 20) => {
  const supplier = await prisma.supplier.findFirst({ where: { id: supplierId, deletedAt: null } });
  if (!supplier) throw new Error('SUPPLIER_NOT_FOUND');

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    prisma.supplierProduct.findMany({
      where:   { supplierId },
      orderBy: { product: { name: 'asc' } },
      skip,
      take: limit,
      include: {
        product: {
          select: { id: true, name: true, sku: true, quantity: true, lowStockAlert: true, unit: true },
        },
      },
    }),
    prisma.supplierProduct.count({ where: { supplierId } }),
  ]);

  return { supplier: { id: supplier.id, name: supplier.name }, items, total, page, limit };
};

// ── Upsert supplier→product link ──────────────────────────────────────────────
export const upsert = async (
  supplierId: number,
  productId:  number,
  data:       UpsertSupplierProductInput,
) => {
  const [supplier, product] = await Promise.all([
    prisma.supplier.findFirst({ where: { id: supplierId, deletedAt: null } }),
    prisma.product.findFirst({ where: { id: productId, deletedAt: null } }),
  ]);
  if (!supplier) throw new Error('SUPPLIER_NOT_FOUND');
  if (!product)  throw new Error('PRODUCT_NOT_FOUND');

  // If setting as preferred, unset any other preferred supplier for this product
  if (data.isPreferred) {
    await prisma.supplierProduct.updateMany({
      where: { productId, supplierId: { not: supplierId } },
      data:  { isPreferred: false },
    });
  }

  const sp = await prisma.supplierProduct.upsert({
    where:  { supplierId_productId: { supplierId, productId } },
    create: { supplierId, productId, ...data, lastUpdated: new Date() },
    update: { ...data, lastUpdated: new Date() },
    include: { supplier: { select: { id: true, name: true } }, product: { select: { id: true, name: true } } },
  });

  await invalidate(`supplier-products:product:${productId}`);
  await invalidate(`supplier-products:supplier:${supplierId}`);
  return sp;
};

// ── Remove a supplier→product link ────────────────────────────────────────────
export const remove = async (supplierId: number, productId: number): Promise<void> => {
  const existing = await prisma.supplierProduct.findUnique({
    where: { supplierId_productId: { supplierId, productId } },
  });
  if (!existing) throw new Error('LINK_NOT_FOUND');
  await prisma.supplierProduct.delete({ where: { supplierId_productId: { supplierId, productId } } });
  await invalidate(`supplier-products:product:${productId}`);
  await invalidate(`supplier-products:supplier:${supplierId}`);
};

// ── Set preferred supplier for a product ──────────────────────────────────────
export const setPreferred = async (supplierId: number, productId: number) => {
  const link = await prisma.supplierProduct.findUnique({
    where: { supplierId_productId: { supplierId, productId } },
  });
  if (!link) throw new Error('LINK_NOT_FOUND');

  await prisma.$transaction([
    prisma.supplierProduct.updateMany({ where: { productId }, data: { isPreferred: false } }),
    prisma.supplierProduct.update({
      where: { supplierId_productId: { supplierId, productId } },
      data:  { isPreferred: true },
    }),
  ]);

  await invalidate(`supplier-products:product:${productId}`);
  return prisma.supplierProduct.findUnique({
    where:   { supplierId_productId: { supplierId, productId } },
    include: { supplier: { select: { id: true, name: true } } },
  });
};

// ── Suggest best supplier for a product ───────────────────────────────────────
// Returns preferred supplier first; if none, cheapest with available lead time
export const suggestSupplier = async (productId: number, requiredQty: number) => {
  const links = await prisma.supplierProduct.findMany({
    where:   { productId, supplier: { deletedAt: null } },
    orderBy: [{ isPreferred: 'desc' }, { unitCost: 'asc' }, { leadTimeDays: 'asc' }],
    include: { supplier: { select: { id: true, name: true, phone: true, email: true } } },
  });

  if (!links.length) return null;

  const eligible = links.filter((l) => requiredQty >= l.minOrderQty);
  const best     = eligible[0] ?? links[0];

  return {
    supplierId:   best!.supplierId,
    supplierName: best!.supplier.name,
    unitCost:     best!.unitCost,
    totalCost:    parseFloat((best!.unitCost * requiredQty).toFixed(2)),
    leadTimeDays: best!.leadTimeDays,
    isPreferred:  best!.isPreferred,
    alternatives: eligible.slice(1, 3).map((l) => ({
      supplierId:   l.supplierId,
      supplierName: l.supplier.name,
      unitCost:     l.unitCost,
      leadTimeDays: l.leadTimeDays,
    })),
  };
};

// ── Bulk upsert: import a supplier's full catalog at once ─────────────────────
export const bulkUpsert = async (
  supplierId: number,
  items: Array<{ productId: number } & UpsertSupplierProductInput>,
) => {
  const supplier = await prisma.supplier.findFirst({ where: { id: supplierId, deletedAt: null } });
  if (!supplier) throw new Error('SUPPLIER_NOT_FOUND');

  const results = await Promise.allSettled(
    items.map((item) => {
      const { productId, ...data } = item;
      return upsert(supplierId, productId, data);
    }),
  );

  const succeeded = results.filter((r) => r.status === 'fulfilled').length;
  const failed    = results.filter((r) => r.status === 'rejected').length;
  return { succeeded, failed, total: items.length };
};
