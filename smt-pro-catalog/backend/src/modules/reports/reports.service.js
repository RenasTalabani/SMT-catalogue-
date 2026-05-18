const prisma = require('../../config/prisma');
const { get, set } = require('../../shared/utils/cache.util');

const CACHE_TTL = 300; // 5 minutes

// ─── Dashboard Summary ────────────────────────────────────────────────────────

const getDashboard = async () => {
  const cacheKey = 'reports:dashboard';
  const cached   = await get(cacheKey);
  if (cached) return cached;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    totalProducts, totalOrders, totalUsers,
    todayOrders, completedOrders, pendingOrders, cancelledOrders,
    revenueAgg, inventoryAgg, lowStockCount,
  ] = await Promise.all([
    prisma.product.count(),
    prisma.order.count(),
    prisma.user.count(),
    prisma.order.count({ where: { createdAt: { gte: today } } }),
    prisma.order.count({ where: { status: 'COMPLETED' } }),
    prisma.order.count({ where: { status: 'PENDING' } }),
    prisma.order.count({ where: { status: 'CANCELLED' } }),
    prisma.order.aggregate({ where: { status: 'COMPLETED' }, _sum: { totalAmount: true } }),
    prisma.product.aggregate({ _sum: { quantity: true } }),
    prisma.product.count({ where: { quantity: { lte: 5 } } }),
  ]);

  const result = {
    totalProducts,
    totalOrders,
    totalUsers,
    todayOrders,
    completedOrders,
    pendingOrders,
    cancelledOrders,
    totalRevenue:    parseFloat((revenueAgg._sum.totalAmount ?? 0).toFixed(2)),
    totalStockUnits: inventoryAgg._sum.quantity ?? 0,
    lowStockCount,
  };

  await set(cacheKey, result, CACHE_TTL);
  return result;
};

// ─── Sales Analytics ──────────────────────────────────────────────────────────

const getSalesAnalytics = async ({ from, to, groupBy = 'day' } = {}) => {
  const cacheKey = `reports:sales:${from}:${to}:${groupBy}`;
  const cached   = await get(cacheKey);
  if (cached) return cached;

  const where = { status: 'COMPLETED' };
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from);
    if (to)   where.createdAt.lte = new Date(to);
  }

  const orders = await prisma.order.findMany({
    where,
    select: { totalAmount: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });

  const grouped = {};
  for (const order of orders) {
    const d = new Date(order.createdAt);
    let key;
    if (groupBy === 'month') {
      key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    } else if (groupBy === 'week') {
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      key = weekStart.toISOString().split('T')[0];
    } else {
      key = d.toISOString().split('T')[0];
    }
    if (!grouped[key]) grouped[key] = { date: key, revenue: 0, orders: 0 };
    grouped[key].revenue += order.totalAmount;
    grouped[key].orders  += 1;
  }

  const data = Object.values(grouped).map((g) => ({
    ...g,
    revenue: parseFloat(g.revenue.toFixed(2)),
  }));

  const result = {
    data,
    totalRevenue: parseFloat(data.reduce((s, d) => s + d.revenue, 0).toFixed(2)),
    totalOrders:  data.reduce((s, d) => s + d.orders,  0),
  };

  await set(cacheKey, result, CACHE_TTL);
  return result;
};

// ─── Top Products ─────────────────────────────────────────────────────────────

const getTopProducts = async ({ limit = 10, from, to } = {}) => {
  const cacheKey = `reports:top-products:${limit}:${from}:${to}`;
  const cached   = await get(cacheKey);
  if (cached) return cached;

  const orderWhere = { order: { status: 'COMPLETED' } };
  if (from || to) {
    orderWhere.order = { ...orderWhere.order, createdAt: {} };
    if (from) orderWhere.order.createdAt.gte = new Date(from);
    if (to)   orderWhere.order.createdAt.lte = new Date(to);
  }

  const items = await prisma.orderItem.groupBy({
    by: ['productId'],
    where: orderWhere,
    _sum:   { quantity: true },
    _count: { id: true },
    orderBy: { _sum: { quantity: 'desc' } },
    take: parseInt(limit),
  });

  const productIds = items.map((i) => i.productId);
  const products   = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, name: true, category: true, price: true },
  });
  const productMap = Object.fromEntries(products.map((p) => [p.id, p]));

  const result = items.map((item) => {
    const p = productMap[item.productId];
    return {
      id:           p?.id,
      name:         p?.name,
      category:     p?.category,
      imageUrl:     p?.imageUrl ?? null,
      totalSold:    item._sum.quantity ?? 0,
      orderCount:   item._count.id,
      totalRevenue: parseFloat(((item._sum.quantity ?? 0) * (p?.price ?? 0)).toFixed(2)),
    };
  });

  await set(cacheKey, result, CACHE_TTL);
  return result;
};

// ─── Category Breakdown ───────────────────────────────────────────────────────

const getCategoryBreakdown = async () => {
  const cacheKey = 'reports:category-breakdown';
  const cached   = await get(cacheKey);
  if (cached) return cached;

  const products = await prisma.product.groupBy({
    by: ['category'],
    _count: { id: true },
    _sum:   { quantity: true },
  });

  const result = products.map((p) => ({
    category: p.category,
    count:    p._count.id,
    stock:    p._sum.quantity ?? 0,
  }));

  await set(cacheKey, result, CACHE_TTL);
  return result;
};

// ─── Audit Log ────────────────────────────────────────────────────────────────

const getAuditLogs = async ({ entity, action, userId, page = 1, limit = 50 } = {}) => {
  const where = {};
  if (entity) where.entity = entity;
  if (action) where.action = action;
  if (userId) where.userId = parseInt(userId);

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where, orderBy: { createdAt: 'desc' }, skip, take,
      select: {
        id: true, action: true, entity: true, entityId: true,
        metadata: true, createdAt: true,
        user: { select: { id: true, name: true, role: true } },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { logs, total, page: parseInt(page), limit: take };
};

module.exports = { getDashboard, getSalesAnalytics, getTopProducts, getCategoryBreakdown, getAuditLogs };
