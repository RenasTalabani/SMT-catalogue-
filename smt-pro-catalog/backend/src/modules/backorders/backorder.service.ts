import prisma from '../../config/prisma';
import { getIO } from '../../config/socket';
import { createNotification, broadcastToAdmins } from '../notifications/notification.service';

export type BackorderStatus = 'PENDING' | 'PARTIALLY_FULFILLED' | 'FULFILLED' | 'CANCELLED';

export interface CreateBackorderInput {
  productId:  number;
  customerId?: number;
  quantity:   number;
  notes?:     string;
}

// ── Create backorder request ───────────────────────────────────────────────────
export const create = async (requestedBy: number, input: CreateBackorderInput) => {
  const product = await prisma.product.findFirst({
    where:  { id: input.productId, deletedAt: null },
    select: { id: true, name: true, quantity: true },
  });
  if (!product) throw new Error('PRODUCT_NOT_FOUND');
  if (product.quantity >= input.quantity) throw new Error('PRODUCT_IN_STOCK');
  if (input.quantity <= 0) throw new Error('INVALID_QUANTITY');

  const existing = await prisma.backorderRequest.findFirst({
    where: { productId: input.productId, requestedBy, status: { in: ['PENDING', 'PARTIALLY_FULFILLED'] } },
  });
  if (existing) throw new Error('BACKORDER_EXISTS');

  const bo = await prisma.backorderRequest.create({
    data: {
      productId:   input.productId,
      customerId:  input.customerId ?? null,
      requestedBy,
      quantity:    input.quantity,
      notes:       input.notes ?? null,
    },
    include: {
      product:   { select: { id: true, name: true } },
      customer:  { select: { id: true, name: true } },
      requester: { select: { id: true, name: true } },
    },
  });

  void broadcastToAdmins(
    '📋 Backorder Request',
    `${input.quantity}× ${product.name} — requested by ${bo.requester.name}`,
    'info',
    { backorderId: bo.id, productId: input.productId },
  );

  return bo;
};

// ── Get all backorders ─────────────────────────────────────────────────────────
export const getAll = async (params: {
  page?:      number;
  limit?:     number;
  status?:    string;
  productId?: number;
} = {}) => {
  const { page = 1, limit = 20, status, productId } = params;
  const skip  = (page - 1) * limit;
  const where: Record<string, unknown> = {};
  if (status)    where['status']    = status;
  if (productId) where['productId'] = productId;

  const [backorders, total] = await Promise.all([
    prisma.backorderRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        product:   { select: { id: true, name: true, quantity: true } },
        customer:  { select: { id: true, name: true } },
        requester: { select: { id: true, name: true } },
      },
    }),
    prisma.backorderRequest.count({ where }),
  ]);

  return { backorders, total, page, limit };
};

// ── Get one ───────────────────────────────────────────────────────────────────
export const getById = async (id: number) => {
  const bo = await prisma.backorderRequest.findUnique({
    where: { id },
    include: {
      product:   { select: { id: true, name: true, quantity: true, unit: true } },
      customer:  { select: { id: true, name: true, phone: true, email: true } },
      requester: { select: { id: true, name: true, email: true } },
    },
  });
  if (!bo) throw new Error('BACKORDER_NOT_FOUND');
  return bo;
};

// ── Cancel a backorder ─────────────────────────────────────────────────────────
export const cancel = async (id: number, requestedBy: number): Promise<void> => {
  const bo = await prisma.backorderRequest.findUnique({ where: { id } });
  if (!bo) throw new Error('BACKORDER_NOT_FOUND');
  if (!['PENDING', 'PARTIALLY_FULFILLED'].includes(bo.status)) throw new Error('BACKORDER_NOT_CANCELLABLE');

  await prisma.backorderRequest.update({
    where: { id },
    data:  { status: 'CANCELLED' },
  });
};

// ── Fulfill backorders when stock arrives (called from PO receive) ─────────────
export const fulfillForProduct = async (productId: number, newStock: number): Promise<number> => {
  const pending = await prisma.backorderRequest.findMany({
    where:   { productId, status: { in: ['PENDING', 'PARTIALLY_FULFILLED'] } },
    orderBy: { createdAt: 'asc' },
    include: { requester: { select: { id: true, name: true } }, product: { select: { name: true } } },
  });

  if (!pending.length) return 0;

  let remaining = newStock;
  let fulfilled = 0;

  for (const bo of pending) {
    if (remaining <= 0) break;

    const canFulfill = Math.min(bo.quantity, remaining);
    const fullyDone  = canFulfill >= bo.quantity;

    await prisma.backorderRequest.update({
      where: { id: bo.id },
      data: {
        status:      fullyDone ? 'FULFILLED' : 'PARTIALLY_FULFILLED',
        notifiedAt:  new Date(),
        fulfilledAt: fullyDone ? new Date() : null,
      },
    });

    // Notify the employee who placed the backorder
    void createNotification({
      userId: bo.requestedBy,
      title:  fullyDone ? '✅ Backorder Fulfilled' : '📦 Backorder Partially Filled',
      body:   fullyDone
        ? `${bo.product.name} — your backorder of ${bo.quantity} unit(s) is now available`
        : `${bo.product.name} — ${canFulfill} of ${bo.quantity} units now in stock`,
      type: 'success',
      data: { backorderId: bo.id, productId, fullyDone },
    });

    getIO()?.to('all').emit('backorder:updated', {
      id:       bo.id,
      productId,
      status:   fullyDone ? 'FULFILLED' : 'PARTIALLY_FULFILLED',
      employee: bo.requester.name,
    });

    remaining -= canFulfill;
    fulfilled++;
  }

  return fulfilled;
};

// ── Stats ─────────────────────────────────────────────────────────────────────
export const getStats = async () => {
  const [byStatus, topProducts] = await Promise.all([
    prisma.backorderRequest.groupBy({
      by:     ['status'],
      _count: { id: true },
      _sum:   { quantity: true },
    }),
    prisma.backorderRequest.groupBy({
      by:     ['productId'],
      where:  { status: { in: ['PENDING', 'PARTIALLY_FULFILLED'] } },
      _count: { id: true },
      _sum:   { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take:   5,
    }),
  ]);

  const productDetails = await prisma.product.findMany({
    where:  { id: { in: topProducts.map((p) => p.productId) } },
    select: { id: true, name: true, quantity: true },
  });

  return {
    byStatus:    byStatus.map((s) => ({ status: s.status, count: s._count.id, totalQty: s._sum.quantity ?? 0 })),
    topBackordered: topProducts.map((p) => ({
      ...p,
      product: productDetails.find((d) => d.id === p.productId),
    })),
  };
};
