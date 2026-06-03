import prisma from '../../config/prisma';
import { getIO } from '../../config/socket';
import { invalidate } from '../../shared/utils/cache.util';

export type StocktakeStatus = 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

async function nextReference(): Promise<string> {
  const year  = new Date().getFullYear();
  const count = await prisma.stocktake.count();
  return `ST-${year}-${String(count + 1).padStart(5, '0')}`;
}

// ── Create stocktake (optionally auto-populate with all active products) ───────
export const create = async (
  createdById: number,
  opts?: { notes?: string; productIds?: number[] },
) => {
  const reference = await nextReference();

  let productList: Array<{ id: number; quantity: number }>;
  if (opts?.productIds?.length) {
    productList = await prisma.product.findMany({
      where:  { id: { in: opts.productIds }, deletedAt: null, isActive: true },
      select: { id: true, quantity: true },
    });
  } else {
    productList = await prisma.product.findMany({
      where:  { deletedAt: null, isActive: true },
      select: { id: true, quantity: true },
    });
  }

  if (!productList.length) throw new Error('NO_PRODUCTS');

  const stocktake = await prisma.stocktake.create({
    data: {
      reference,
      createdById,
      notes: opts?.notes ?? null,
      items: {
        create: productList.map((p) => ({
          productId:   p.id,
          expectedQty: p.quantity,
        })),
      },
    },
    include: {
      createdBy: { select: { id: true, name: true } },
      _count:    { select: { items: true } },
    },
  });

  getIO()?.to('admin').emit('stocktake:created', { id: stocktake.id, reference });
  return stocktake;
};

// ── List stocktakes ────────────────────────────────────────────────────────────
export const getAll = async (params: { page?: number; limit?: number; status?: string } = {}) => {
  const { page = 1, limit = 20, status } = params;
  const skip  = (page - 1) * limit;
  const where = status ? { status } : {};

  const [stocktakes, total] = await Promise.all([
    prisma.stocktake.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        createdBy:  { select: { id: true, name: true } },
        reviewedBy: { select: { id: true, name: true } },
        _count:     { select: { items: true } },
      },
    }),
    prisma.stocktake.count({ where }),
  ]);

  return { stocktakes, total, page, limit };
};

// ── Get one ────────────────────────────────────────────────────────────────────
export const getById = async (id: number) => {
  const st = await prisma.stocktake.findUnique({
    where: { id },
    include: {
      createdBy:  { select: { id: true, name: true } },
      reviewedBy: { select: { id: true, name: true } },
      items: {
        include: {
          product: { select: { id: true, name: true, sku: true, unit: true, quantity: true } },
        },
        orderBy: { product: { name: 'asc' } },
      },
    },
  });
  if (!st) throw new Error('STOCKTAKE_NOT_FOUND');
  return st;
};

// ── Start counting ─────────────────────────────────────────────────────────────
export const start = async (id: number) => {
  const st = await prisma.stocktake.findUnique({ where: { id } });
  if (!st) throw new Error('STOCKTAKE_NOT_FOUND');
  if (st.status !== 'DRAFT') throw new Error('STOCKTAKE_NOT_DRAFT');

  return prisma.stocktake.update({
    where: { id },
    data:  { status: 'IN_PROGRESS', startedAt: new Date() },
    include: { createdBy: { select: { id: true, name: true } }, _count: { select: { items: true } } },
  });
};

// ── Update counted quantities ──────────────────────────────────────────────────
export const updateCounts = async (
  id: number,
  counts: Array<{ productId: number; countedQty: number; notes?: string }>,
) => {
  const st = await prisma.stocktake.findUnique({
    where:   { id },
    include: { items: true },
  });
  if (!st) throw new Error('STOCKTAKE_NOT_FOUND');
  if (!['IN_PROGRESS', 'DRAFT'].includes(st.status)) throw new Error('STOCKTAKE_NOT_EDITABLE');

  await prisma.$transaction(
    counts.map((c) => {
      const item = st.items.find((i) => i.productId === c.productId);
      if (!item) return prisma.stocktakeItem.create({
        data: { stocktakeId: id, productId: c.productId, expectedQty: 0, countedQty: c.countedQty, variance: c.countedQty, notes: c.notes ?? null },
      });
      return prisma.stocktakeItem.update({
        where: { id: item.id },
        data: {
          countedQty: c.countedQty,
          variance:   c.countedQty - item.expectedQty,
          notes:      c.notes ?? item.notes,
        },
      });
    }),
  );

  return getById(id);
};

// ── Complete: apply stock adjustments ─────────────────────────────────────────
export const complete = async (id: number, reviewerId: number) => {
  const st = await prisma.stocktake.findUnique({
    where:   { id },
    include: { items: true },
  });
  if (!st) throw new Error('STOCKTAKE_NOT_FOUND');
  if (st.status !== 'IN_PROGRESS') throw new Error('STOCKTAKE_NOT_IN_PROGRESS');

  const itemsWithCount = st.items.filter((i) => i.countedQty !== null);
  if (!itemsWithCount.length) throw new Error('NO_COUNTED_ITEMS');

  await prisma.$transaction(async (tx) => {
    for (const item of itemsWithCount) {
      if (item.variance === 0 || item.variance === null) continue;

      const product = await tx.product.findUnique({ where: { id: item.productId } });
      if (!product) continue;

      const newQty = item.countedQty!;
      await tx.product.update({ where: { id: item.productId }, data: { quantity: newQty } });
      await tx.stockMovement.create({
        data: {
          productId:   item.productId,
          type:        'ADJUSTMENT',
          quantity:    Math.abs(item.variance!),
          previousQty: item.expectedQty,
          newQty,
          notes:       `Stocktake ${st.reference} — variance ${item.variance! > 0 ? '+' : ''}${item.variance}`,
          employeeId:  reviewerId,
          reference:   st.reference,
        },
      });
    }

    await tx.stocktake.update({
      where: { id },
      data: {
        status:      'COMPLETED',
        reviewedById: reviewerId,
        completedAt: new Date(),
      },
    });
  });

  await invalidate('products:');
  getIO()?.to('admin').emit('stocktake:completed', { id, reference: st.reference });
  return getById(id);
};

// ── Cancel ─────────────────────────────────────────────────────────────────────
export const cancel = async (id: number): Promise<void> => {
  const st = await prisma.stocktake.findUnique({ where: { id } });
  if (!st) throw new Error('STOCKTAKE_NOT_FOUND');
  if (st.status === 'COMPLETED') throw new Error('STOCKTAKE_COMPLETED');
  await prisma.stocktake.update({ where: { id }, data: { status: 'CANCELLED' } });
};

// ── Summary stats ──────────────────────────────────────────────────────────────
export const getStats = async () => {
  const [byStatus, recent] = await Promise.all([
    prisma.stocktake.groupBy({ by: ['status'], _count: { id: true } }),
    prisma.stocktake.findMany({
      orderBy: { createdAt: 'desc' },
      take:    5,
      include: { createdBy: { select: { name: true } }, _count: { select: { items: true } } },
    }),
  ]);

  return {
    byStatus: byStatus.map((s) => ({ status: s.status, count: s._count.id })),
    recent,
  };
};
