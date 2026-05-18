const prisma       = require('../../config/prisma');
const { getIO }    = require('../../config/socket');
const { invalidate } = require('../../shared/utils/cache.util');

const ORDER_SELECT = {
  id: true, totalAmount: true, status: true, createdAt: true,
  user:  { select: { id: true, name: true, email: true } },
  items: {
    select: {
      id: true, quantity: true, price: true,
      product: { select: { id: true, name: true, imageUrl: true } },
    },
  },
};

const getAll = async ({ page = 1, limit = 20, status, userId } = {}) => {
  const where = {};
  if (status) where.status = status;
  if (userId) where.userId = parseInt(userId);

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);

  const [orders, total] = await Promise.all([
    prisma.order.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take, select: ORDER_SELECT }),
    prisma.order.count({ where }),
  ]);
  return { orders, total, page: parseInt(page), limit: take };
};

const getMyOrders = async (userId, { page = 1, limit = 20 } = {}) => {
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);
  const where = { userId: parseInt(userId) };
  const [orders, total] = await Promise.all([
    prisma.order.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take, select: ORDER_SELECT }),
    prisma.order.count({ where }),
  ]);
  return { orders, total, page: parseInt(page), limit: take };
};

const getById = async (id, requestingUser) => {
  const order = await prisma.order.findUnique({ where: { id: parseInt(id) }, select: ORDER_SELECT });
  if (!order) throw new Error('ORDER_NOT_FOUND');
  if (requestingUser.role === 'customer' && order.user.id !== requestingUser.id)
    throw new Error('ORDER_FORBIDDEN');
  return order;
};

const create = async (userId, items) => {
  const productIds = items.map((i) => i.productId);
  const products   = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, name: true, price: true, quantity: true },
  });

  const productMap = Object.fromEntries(products.map((p) => [p.id, p]));

  for (const item of items) {
    const product = productMap[item.productId];
    if (!product)              throw new Error(`PRODUCT_NOT_FOUND:${item.productId}`);
    if (product.quantity < item.quantity)
      throw new Error(`INSUFFICIENT_STOCK:${product.name}`);
  }

  const totalAmount = items.reduce((sum, item) => {
    return sum + productMap[item.productId].price * item.quantity;
  }, 0);

  const order = await prisma.$transaction(async (tx) => {
    for (const item of items) {
      await tx.product.update({
        where: { id: item.productId },
        data:  { quantity: { decrement: item.quantity } },
      });
    }

    return tx.order.create({
      data: {
        userId,
        totalAmount,
        items: {
          create: items.map((item) => ({
            productId: item.productId,
            quantity:  item.quantity,
            price:     productMap[item.productId].price,
          })),
        },
      },
      select: ORDER_SELECT,
    });
  });

  await invalidate('products:');
  getIO()?.to('all').emit('order:created', { id: order.id, totalAmount, userId, itemCount: items.length });
  return order;
};

const updateStatus = async (id, status) => {
  const existing = await prisma.order.findUnique({ where: { id: parseInt(id) } });
  if (!existing) throw new Error('ORDER_NOT_FOUND');
  if (existing.status === 'COMPLETED' || existing.status === 'CANCELLED')
    throw new Error('ORDER_NOT_MODIFIABLE');

  const order = await prisma.order.update({
    where: { id: parseInt(id) },
    data:  { status },
    select: ORDER_SELECT,
  });

  if (status === 'CANCELLED') {
    await prisma.$transaction(
      order.items.map((item) =>
        prisma.product.update({
          where: { id: item.product.id },
          data:  { quantity: { increment: item.quantity } },
        }),
      ),
    );
    await invalidate('products:');
  }

  getIO()?.to('all').emit('order:updated', { id: order.id, status });
  return order;
};

module.exports = { getAll, getMyOrders, getById, create, updateStatus };
