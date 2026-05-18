const prisma = require('../config/prisma');
const cache  = require('../utils/cache.util');

const TTL = {
  DASHBOARD: 60_000,
  REPORT:   120_000,
};

// ─── Existing reports ─────────────────────────────────────────────────────────

const getDailyReport = async (date) => {
  const key = `report:daily:${date}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const start = new Date(`${date}T00:00:00.000Z`);
  const end   = new Date(`${date}T23:59:59.999Z`);

  const result = await prisma.order.aggregate({
    where: { status: 'COMPLETED', createdAt: { gte: start, lte: end } },
    _sum:   { totalAmount: true },
    _count: { id: true },
  });

  const data = {
    date,
    totalOrders:  result._count.id,
    totalRevenue: Math.round((result._sum.totalAmount ?? 0) * 100) / 100,
  };

  cache.set(key, data, TTL.REPORT);
  return data;
};

const getMonthlyReport = async (year, month) => {
  const key = `report:monthly:${year}-${month}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const start = new Date(Date.UTC(year, month - 1, 1));
  const end   = new Date(Date.UTC(year, month, 1));

  const rows = await prisma.$queryRaw`
    SELECT
      EXTRACT(DAY FROM "createdAt")::int       AS day,
      COUNT(*)::int                            AS "totalOrders",
      COALESCE(SUM("totalAmount"), 0)::float   AS "totalRevenue"
    FROM "Order"
    WHERE
      status = 'COMPLETED'
      AND "createdAt" >= ${start}
      AND "createdAt" <  ${end}
    GROUP BY EXTRACT(DAY FROM "createdAt")
    ORDER BY day ASC
  `;

  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const dailyBreakdown = {};
  for (let d = 1; d <= daysInMonth; d++) {
    dailyBreakdown[d] = { totalOrders: 0, totalRevenue: 0 };
  }
  for (const row of rows) {
    dailyBreakdown[row.day] = {
      totalOrders:  Number(row.totalOrders),
      totalRevenue: Number(row.totalRevenue),
    };
  }

  const totals = rows.reduce(
    (acc, row) => ({
      totalOrders:  acc.totalOrders  + Number(row.totalOrders),
      totalRevenue: acc.totalRevenue + Number(row.totalRevenue),
    }),
    { totalOrders: 0, totalRevenue: 0 },
  );

  const data = {
    year, month,
    totalOrders:  totals.totalOrders,
    totalRevenue: Math.round(totals.totalRevenue * 100) / 100,
    dailyBreakdown,
  };

  cache.set(key, data, TTL.REPORT);
  return data;
};

const getLowStock = async (threshold) => {
  const products = await prisma.product.findMany({
    where:   { quantity: { lt: threshold } },
    select:  { id: true, name: true, category: true, quantity: true },
    orderBy: { quantity: 'asc' },
  });
  return { threshold, count: products.length, products };
};

const getDashboardSummary = async () => {
  const key = 'report:dashboard';
  const hit = cache.get(key);
  if (hit) return hit;

  const [totalProducts, totalOrders, revenueResult, pendingOrders, completedOrders, cancelledOrders] =
    await Promise.all([
      prisma.product.count(),
      prisma.order.count(),
      prisma.order.aggregate({ where: { status: 'COMPLETED' }, _sum: { totalAmount: true } }),
      prisma.order.count({ where: { status: 'PENDING' } }),
      prisma.order.count({ where: { status: 'COMPLETED' } }),
      prisma.order.count({ where: { status: 'CANCELLED' } }),
    ]);

  const data = {
    totalProducts,
    totalOrders,
    totalRevenue:    Math.round((revenueResult._sum.totalAmount ?? 0) * 100) / 100,
    pendingOrders,
    completedOrders,
    cancelledOrders,
  };

  cache.set(key, data, TTL.DASHBOARD);
  return data;
};

// ─── Advanced analytics ───────────────────────────────────────────────────────

const getTopProducts = async (limit = 5) => {
  const key = `report:top-products:${limit}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const rows = await prisma.$queryRaw`
    SELECT
      p.id,
      p.name,
      p.category,
      p."imageUrl",
      SUM(oi.quantity)::int                  AS "totalSold",
      COALESCE(SUM(oi.quantity * oi.price), 0)::float AS "totalRevenue"
    FROM "OrderItem" oi
    JOIN "Order"   o ON oi."orderId"   = o.id
    JOIN "Product" p ON oi."productId" = p.id
    WHERE o.status = 'COMPLETED'
    GROUP BY p.id, p.name, p.category, p."imageUrl"
    ORDER BY "totalSold" DESC
    LIMIT ${limit}
  `;

  const data = rows.map((r) => ({
    id:           r.id,
    name:         r.name,
    category:     r.category,
    imageUrl:     r.imageUrl,
    totalSold:    Number(r.totalSold),
    totalRevenue: Math.round(Number(r.totalRevenue) * 100) / 100,
  }));

  cache.set(key, data, TTL.REPORT);
  return data;
};

const getRevenueByCategory = async () => {
  const key = 'report:revenue-by-category';
  const hit = cache.get(key);
  if (hit) return hit;

  const rows = await prisma.$queryRaw`
    SELECT
      p.category,
      SUM(oi.quantity)::int                           AS "totalSold",
      COALESCE(SUM(oi.quantity * oi.price), 0)::float AS revenue
    FROM "OrderItem" oi
    JOIN "Order"   o ON oi."orderId"   = o.id
    JOIN "Product" p ON oi."productId" = p.id
    WHERE o.status = 'COMPLETED'
    GROUP BY p.category
    ORDER BY revenue DESC
  `;

  const data = rows.map((r) => ({
    category:   r.category,
    totalSold:  Number(r.totalSold),
    revenue:    Math.round(Number(r.revenue) * 100) / 100,
  }));

  cache.set(key, data, TTL.REPORT);
  return data;
};

const getAverageOrderValue = async () => {
  const key = 'report:avg-order-value';
  const hit = cache.get(key);
  if (hit) return hit;

  const result = await prisma.order.aggregate({
    where: { status: 'COMPLETED' },
    _avg:   { totalAmount: true },
    _count: { id: true },
    _sum:   { totalAmount: true },
  });

  const data = {
    totalCompletedOrders: result._count.id,
    totalRevenue:         Math.round((result._sum.totalAmount ?? 0) * 100) / 100,
    averageOrderValue:    Math.round((result._avg.totalAmount ?? 0) * 100) / 100,
  };

  cache.set(key, data, TTL.REPORT);
  return data;
};

const getGrowthRate = async () => {
  const now          = new Date();
  const curYear      = now.getUTCFullYear();
  const curMonth     = now.getUTCMonth() + 1;
  const prevMonth    = curMonth === 1 ? 12 : curMonth - 1;
  const prevYear     = curMonth === 1 ? curYear - 1 : curYear;

  const [current, previous] = await Promise.all([
    prisma.order.aggregate({
      where: {
        status: 'COMPLETED',
        createdAt: {
          gte: new Date(Date.UTC(curYear,  curMonth  - 1, 1)),
          lt:  new Date(Date.UTC(curYear,  curMonth,      1)),
        },
      },
      _sum: { totalAmount: true },
      _count: { id: true },
    }),
    prisma.order.aggregate({
      where: {
        status: 'COMPLETED',
        createdAt: {
          gte: new Date(Date.UTC(prevYear, prevMonth - 1, 1)),
          lt:  new Date(Date.UTC(prevYear, prevMonth,     1)),
        },
      },
      _sum: { totalAmount: true },
      _count: { id: true },
    }),
  ]);

  const curRevenue  = current._sum.totalAmount  ?? 0;
  const prevRevenue = previous._sum.totalAmount ?? 0;

  const growthRate =
    prevRevenue === 0
      ? curRevenue > 0 ? 100 : 0
      : Math.round(((curRevenue - prevRevenue) / prevRevenue) * 10000) / 100;

  return {
    currentMonth:  { year: curYear,  month: curMonth,  revenue: Math.round(curRevenue  * 100) / 100, orders: current._count.id },
    previousMonth: { year: prevYear, month: prevMonth, revenue: Math.round(prevRevenue * 100) / 100, orders: previous._count.id },
    growthRate,
    growthDirection: growthRate > 0 ? 'up' : growthRate < 0 ? 'down' : 'flat',
  };
};

module.exports = {
  getDailyReport, getMonthlyReport, getLowStock, getDashboardSummary,
  getTopProducts, getRevenueByCategory, getAverageOrderValue, getGrowthRate,
};
