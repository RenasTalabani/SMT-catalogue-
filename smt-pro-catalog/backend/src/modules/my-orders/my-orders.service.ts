import prisma from '../../config/prisma';

const ORDER_SUMMARY = {
  id: true, status: true, paymentStatus: true, paymentMethod: true,
  totalAmount: true, discount: true, tax: true, finalAmount: true,
  paidAmount: true, remainingAmount: true,
  notes: true, receiptUrl: true, createdAt: true, updatedAt: true,
};

const ITEM_DETAIL = {
  id: true, quantity: true, price: true, discount: true,
  product: { select: { id: true, name: true, imageUrl: true, sku: true, unit: true } },
  variant:  { select: { id: true, name: true, attributes: true } },
};

// ── Order status timeline steps ────────────────────────────────────────────────
const TIMELINE_STEPS = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'COMPLETED', 'CANCELLED'];

function buildTimeline(order: { status: string; createdAt: Date; updatedAt: Date }) {
  const steps = TIMELINE_STEPS.map((step) => ({
    step,
    completed: TIMELINE_STEPS.indexOf(step) <= TIMELINE_STEPS.indexOf(order.status),
    active:    step === order.status,
    timestamp: step === 'PENDING'   ? order.createdAt
             : step === order.status ? order.updatedAt
             : null,
  }));
  return steps;
}

// ── Get all orders for a user (customer-facing) ───────────────────────────────
export const getMyOrders = async (
  userId: number,
  params: { page?: number; limit?: number; status?: string; paymentStatus?: string } = {},
) => {
  const { page = 1, limit = 20, status, paymentStatus } = params;
  const skip  = (page - 1) * limit;
  const where: Record<string, unknown> = { userId };
  if (status)        where['status']        = status;
  if (paymentStatus) where['paymentStatus'] = paymentStatus;

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip, take: limit,
      select: {
        ...ORDER_SUMMARY,
        _count: { select: { items: true } },
        items: {
          take: 3,
          select: { product: { select: { id: true, name: true, imageUrl: true } } },
        },
      },
    }),
    prisma.order.count({ where }),
  ]);

  return { orders, total, page, limit };
};

// ── Get order detail with full items + timeline ────────────────────────────────
export const getOrderDetail = async (orderId: number, userId: number) => {
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId },
    select: {
      ...ORDER_SUMMARY,
      items:   { select: ITEM_DETAIL },
      invoice: { select: { id: true, invoiceNumber: true, status: true, total: true, pdfUrl: true } },
      couponUsage: { select: { coupon: { select: { code: true } }, discount: true } },
      creditPayments: {
        orderBy: { createdAt: 'desc' },
        select: { id: true, amount: true, method: true, createdAt: true },
      },
    },
  });

  if (!order) throw new Error('ORDER_NOT_FOUND');

  return {
    ...order,
    timeline: buildTimeline(order),
  };
};

// ── Reorder: create a new order from an existing one ──────────────────────────
export const reorder = async (orderId: number, userId: number) => {
  const original = await prisma.order.findFirst({
    where:   { id: orderId, userId },
    include: { items: { include: { product: { select: { quantity: true } } } } },
  });
  if (!original) throw new Error('ORDER_NOT_FOUND');

  const outOfStock: string[] = [];
  for (const item of original.items) {
    if (item.product.quantity < item.quantity) {
      outOfStock.push(`Product ID ${item.productId} (need ${item.quantity}, have ${item.product.quantity})`);
    }
  }
  if (outOfStock.length) throw new Error(`INSUFFICIENT_STOCK:${outOfStock.join('; ')}`);

  const newOrder = await prisma.$transaction(async (tx) => {
    const order = await tx.order.create({
      data: {
        userId,
        customerId:      original.customerId,
        totalAmount:     original.totalAmount,
        discount:        0,
        tax:             original.tax,
        finalAmount:     original.finalAmount,
        paidAmount:      0,
        remainingAmount: original.finalAmount,
        paymentStatus:   'UNPAID',
        status:          'PENDING',
        paymentMethod:   original.paymentMethod,
        notes:           `Reorder of #${orderId}`,
        items: {
          create: original.items.map((i) => ({
            productId: i.productId,
            quantity:  i.quantity,
            price:     i.price,
            discount:  0,
          })),
        },
      },
      include: { items: { select: ITEM_DETAIL } },
    });

    for (const item of original.items) {
      await tx.product.update({
        where: { id: item.productId },
        data:  { quantity: { decrement: item.quantity } },
      });
    }

    return order;
  });

  return { ...newOrder, timeline: buildTimeline(newOrder) };
};

// ── Order stats for customer profile ──────────────────────────────────────────
export const getMyStats = async (userId: number) => {
  const [total, byStatus, totalSpent, pendingPayments] = await Promise.all([
    prisma.order.count({ where: { userId } }),
    prisma.order.groupBy({ by: ['status'], where: { userId }, _count: { id: true } }),
    prisma.order.aggregate({ where: { userId, status: 'COMPLETED' }, _sum: { finalAmount: true } }),
    prisma.order.count({ where: { userId, paymentStatus: { in: ['UNPAID', 'PARTIAL', 'OVERDUE'] } } }),
  ]);

  return {
    totalOrders:     total,
    totalSpent:      parseFloat((totalSpent._sum.finalAmount ?? 0).toFixed(2)),
    pendingPayments,
    byStatus:        byStatus.map((s) => ({ status: s.status, count: s._count.id })),
  };
};
