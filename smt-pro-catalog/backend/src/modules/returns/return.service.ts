import prisma from '../../config/prisma';
import { getIO } from '../../config/socket';
import { broadcastToAdmins } from '../notifications/notification.service';

export type ReturnStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'PROCESSED';
export type ReturnCondition = 'GOOD' | 'DAMAGED' | 'DEFECTIVE';
export type RefundMethod = 'ORIGINAL' | 'STORE_CREDIT' | 'CASH';

export interface CreateReturnInput {
  orderId:      number;
  reason:       string;
  notes?:       string;
  refundMethod?: RefundMethod;
  items: Array<{
    orderItemId: number;
    productId:   number;
    quantity:    number;
    condition?:  ReturnCondition;
  }>;
}

export interface ReviewReturnInput {
  status:       'APPROVED' | 'REJECTED';
  refundAmount?: number;
  notes?:        string;
}

// ── Create return request ─────────────────────────────────────────────────────
export const create = async (requestedBy: number, input: CreateReturnInput) => {
  const order = await prisma.order.findUnique({
    where:   { id: input.orderId },
    include: { items: true },
  });
  if (!order) throw new Error('ORDER_NOT_FOUND');
  if (!['COMPLETED', 'PAID'].includes(order.status)) throw new Error('ORDER_NOT_ELIGIBLE');

  const existing = await prisma.returnRequest.findFirst({
    where: { orderId: input.orderId, status: { in: ['PENDING', 'APPROVED'] } },
  });
  if (existing) throw new Error('RETURN_ALREADY_EXISTS');

  if (!input.items.length) throw new Error('ITEMS_REQUIRED');

  for (const ri of input.items) {
    const oi = order.items.find((i) => i.id === ri.orderItemId && i.productId === ri.productId);
    if (!oi) throw new Error(`ITEM_NOT_IN_ORDER:${ri.orderItemId}`);
    if (ri.quantity <= 0 || ri.quantity > oi.quantity) throw new Error(`INVALID_QTY:${ri.orderItemId}`);
  }

  const orderItemMap = Object.fromEntries(order.items.map((i) => [i.id, i]));
  const refundTotal  = input.items.reduce((s, ri) => {
    const oi = orderItemMap[ri.orderItemId];
    return s + (oi ? oi.price * ri.quantity : 0);
  }, 0);

  const ret = await prisma.returnRequest.create({
    data: {
      orderId:      input.orderId,
      requestedBy,
      reason:       input.reason,
      notes:        input.notes ?? null,
      refundMethod: input.refundMethod ?? 'ORIGINAL',
      refundAmount: parseFloat(refundTotal.toFixed(2)),
      items: {
        create: input.items.map((ri) => ({
          productId:   ri.productId,
          orderItemId: ri.orderItemId,
          quantity:    ri.quantity,
          unitPrice:   orderItemMap[ri.orderItemId]?.price ?? 0,
          condition:   ri.condition ?? 'GOOD',
        })),
      },
    },
    include: {
      items:     { include: { product: { select: { id: true, name: true, sku: true } } } },
      requester: { select: { id: true, name: true } },
      order:     { select: { id: true, status: true, finalAmount: true } },
    },
  });

  void broadcastToAdmins(
    '↩️ Return Request',
    `Order #${input.orderId} — ${input.reason} (${input.items.length} item${input.items.length > 1 ? 's' : ''})`,
    'warning',
    { returnId: ret.id, orderId: input.orderId },
  );
  getIO()?.to('admin').emit('return:created', { id: ret.id, orderId: input.orderId });
  return ret;
};

// ── Get all returns ───────────────────────────────────────────────────────────
export const getAll = async (params: {
  page?:   number;
  limit?:  number;
  status?: string;
} = {}) => {
  const { page = 1, limit = 20, status } = params;
  const skip  = (page - 1) * limit;
  const where = status ? { status } : {};

  const [returns, total] = await Promise.all([
    prisma.returnRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        requester: { select: { id: true, name: true } },
        reviewer:  { select: { id: true, name: true } },
        order:     { select: { id: true, finalAmount: true } },
        _count:    { select: { items: true } },
      },
    }),
    prisma.returnRequest.count({ where }),
  ]);

  return { returns, total, page, limit };
};

// ── Get one return ────────────────────────────────────────────────────────────
export const getById = async (id: number) => {
  const ret = await prisma.returnRequest.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          product:   { select: { id: true, name: true, sku: true, unit: true } },
          orderItem: { select: { id: true, quantity: true, price: true } },
        },
      },
      requester: { select: { id: true, name: true, email: true } },
      reviewer:  { select: { id: true, name: true } },
      order:     { select: { id: true, status: true, finalAmount: true, paymentMethod: true } },
    },
  });
  if (!ret) throw new Error('RETURN_NOT_FOUND');
  return ret;
};

// ── Approve / Reject ──────────────────────────────────────────────────────────
export const review = async (id: number, reviewerId: number, input: ReviewReturnInput) => {
  const ret = await prisma.returnRequest.findUnique({
    where:   { id },
    include: { items: true },
  });
  if (!ret) throw new Error('RETURN_NOT_FOUND');
  if (ret.status !== 'PENDING') throw new Error('RETURN_NOT_PENDING');

  const updated = await prisma.returnRequest.update({
    where: { id },
    data: {
      status:      input.status,
      reviewedBy:  reviewerId,
      refundAmount: input.refundAmount ?? ret.refundAmount,
      notes:       input.notes ?? ret.notes,
      resolvedAt:  new Date(),
    },
    include: {
      requester: { select: { id: true, name: true } },
      reviewer:  { select: { id: true, name: true } },
    },
  });

  getIO()?.to('admin').emit('return:reviewed', { id, status: input.status, orderId: ret.orderId });
  return updated;
};

// ── Process (APPROVED → PROCESSED): restore stock ─────────────────────────────
export const process = async (id: number, employeeId: number) => {
  const ret = await prisma.returnRequest.findUnique({
    where:   { id },
    include: { items: true },
  });
  if (!ret) throw new Error('RETURN_NOT_FOUND');
  if (ret.status !== 'APPROVED') throw new Error('RETURN_NOT_APPROVED');

  await prisma.$transaction(async (tx) => {
    for (const item of ret.items) {
      if (item.condition === 'DAMAGED') continue;

      const product = await tx.product.findUnique({ where: { id: item.productId } });
      if (!product) continue;

      await tx.product.update({
        where: { id: item.productId },
        data:  { quantity: { increment: item.quantity } },
      });

      await tx.stockMovement.create({
        data: {
          productId:   item.productId,
          type:        'RETURN',
          quantity:    item.quantity,
          previousQty: product.quantity,
          newQty:      product.quantity + item.quantity,
          notes:       `Return #${ret.id} — Order #${ret.orderId} (${item.condition})`,
          employeeId,
          reference:   `RET-${String(ret.id).padStart(6, '0')}`,
        },
      });
    }

    await tx.returnRequest.update({
      where: { id },
      data:  { status: 'PROCESSED', resolvedAt: new Date() },
    });
  });

  const final = await getById(id);
  getIO()?.to('all').emit('return:processed', { id, orderId: ret.orderId });
  return final;
};

// ── Stats ─────────────────────────────────────────────────────────────────────
export const getStats = async () => {
  const [byStatus, totalRefunded, recent] = await Promise.all([
    prisma.returnRequest.groupBy({
      by:    ['status'],
      _count: { id: true },
      _sum:   { refundAmount: true },
    }),
    prisma.returnRequest.aggregate({
      where: { status: 'PROCESSED' },
      _sum:  { refundAmount: true },
    }),
    prisma.returnRequest.findMany({
      orderBy: { createdAt: 'desc' },
      take:    5,
      include: {
        requester: { select: { name: true } },
        order:     { select: { id: true } },
      },
    }),
  ]);

  return {
    byStatus:       byStatus.map((s) => ({ status: s.status, count: s._count.id, refunded: s._sum.refundAmount ?? 0 })),
    totalRefunded:  parseFloat((totalRefunded._sum.refundAmount ?? 0).toFixed(2)),
    recentRequests: recent,
  };
};
