const prisma = require('../config/prisma');
const cache  = require('../utils/cache.util');

const ORDER_INCLUDE = {
  items: {
    include: {
      product: {
        select: { id: true, name: true, imageUrl: true, category: true },
      },
    },
  },
  user: {
    select: { id: true, name: true, email: true },
  },
};

const createOrder = async (userId, items) => {
  return prisma.$transaction(async (tx) => {
    let totalAmount = 0;
    const enriched = [];

    // Validate stock and prices inside the transaction
    for (const item of items) {
      const product = await tx.product.findUnique({
        where: { id: item.productId },
      });

      if (!product) {
        throw new Error(`PRODUCT_NOT_FOUND:${item.productId}`);
      }

      if (product.quantity < item.quantity) {
        throw new Error(`INSUFFICIENT_STOCK:${product.name}:${product.quantity}`);
      }

      totalAmount += product.price * item.quantity;
      enriched.push({ product, quantity: item.quantity });
    }

    // Atomically reduce stock for every item
    for (const { product, quantity } of enriched) {
      await tx.product.update({
        where: { id: product.id },
        data: { quantity: { decrement: quantity } },
      });
    }

    // Create order + items in one statement
    const order = await tx.order.create({
      data: {
        userId,
        totalAmount: Math.round(totalAmount * 100) / 100,
        items: {
          create: enriched.map(({ product, quantity }) => ({
            productId: product.id,
            quantity,
            price: product.price, // snapshot — never trust frontend
          })),
        },
      },
      include: ORDER_INCLUDE,
    });

    cache.invalidate('report:');
    return order;
  });
};

const getMyOrders = async (userId) => {
  return prisma.order.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: ORDER_INCLUDE,
  });
};

const getAllOrders = async ({ status, page = 1, limit = 20 } = {}) => {
  const where = status ? { status } : {};
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      include: ORDER_INCLUDE,
    }),
    prisma.order.count({ where }),
  ]);

  return { orders, total, page: parseInt(page), limit: take };
};

const getOrderById = async (id, requestingUser) => {
  const order = await prisma.order.findUnique({
    where: { id: parseInt(id) },
    include: ORDER_INCLUDE,
  });

  if (!order) throw new Error('ORDER_NOT_FOUND');

  const isPrivileged = ['admin', 'employee'].includes(requestingUser.role);
  if (!isPrivileged && order.userId !== requestingUser.id) {
    throw new Error('ORDER_FORBIDDEN');
  }

  return order;
};

const updateStatus = async (id, newStatus) => {
  const order = await prisma.order.findUnique({
    where: { id: parseInt(id) },
    include: { items: true },
  });

  if (!order) throw new Error('ORDER_NOT_FOUND');
  if (order.status === newStatus) throw new Error('STATUS_UNCHANGED');
  if (order.status === 'COMPLETED' || order.status === 'CANCELLED') {
    throw new Error('ORDER_ALREADY_CLOSED');
  }

  return prisma.$transaction(async (tx) => {
    // Restore stock if order is being cancelled
    if (newStatus === 'CANCELLED') {
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { quantity: { increment: item.quantity } },
        });
      }
    }

    const updated = await tx.order.update({
      where: { id: parseInt(id) },
      data: { status: newStatus },
      include: ORDER_INCLUDE,
    });
    cache.invalidate('report:');
    return updated;
  });
};

module.exports = { createOrder, getMyOrders, getAllOrders, getOrderById, updateStatus };
