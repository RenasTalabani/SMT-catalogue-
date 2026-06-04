import prisma from '../../config/prisma';
import { get, set } from '../../shared/utils/cache.util';

const CACHE_TTL = 120; // 2 min — dashboard data should be fairly fresh

function periodRange(type: 'today' | 'week' | 'month' | 'year') {
  const now  = new Date();
  const from = new Date(now);
  if (type === 'today') {
    from.setHours(0, 0, 0, 0);
  } else if (type === 'week') {
    from.setDate(now.getDate() - 6);
    from.setHours(0, 0, 0, 0);
  } else if (type === 'month') {
    from.setDate(1); from.setHours(0, 0, 0, 0);
  } else {
    from.setMonth(0, 1); from.setHours(0, 0, 0, 0);
  }
  return { from, to: now };
}

function prevRange(type: 'today' | 'week' | 'month' | 'year') {
  const cur  = periodRange(type);
  const diff = cur.to.getTime() - cur.from.getTime();
  return { from: new Date(cur.from.getTime() - diff), to: new Date(cur.from.getTime()) };
}

// ── Main overview ─────────────────────────────────────────────────────────────
export const getOverview = async () => {
  const cacheKey = 'dashboard:overview';
  const cached   = await get<unknown>(cacheKey);
  if (cached) return cached;

  const { from: mStart } = periodRange('month');
  const { from: pStart, to: pEnd } = prevRange('month');
  const { from: today }  = periodRange('today');

  const [
    // This month
    thisMonthRevenue,
    thisMonthOrders,
    thisMonthExpenses,
    // Previous month (comparison)
    prevMonthRevenue,
    prevMonthOrders,
    // Today
    todayRevenue,
    todayOrders,
    // Totals
    totalProducts,
    totalCustomers,
    lowStockCount,
    // Debt
    totalDebt,
    overdueOrders,
    // Pending work
    pendingPurchaseOrders,
    pendingReturns,
    pendingDiscounts,
    pendingReviews,
  ] = await Promise.all([
    prisma.order.aggregate({ where: { createdAt: { gte: mStart }, status: 'COMPLETED' }, _sum: { finalAmount: true }, _count: { id: true } }),
    prisma.order.aggregate({ where: { createdAt: { gte: mStart } }, _count: { id: true } }),
    prisma.expense.aggregate({ where: { createdAt: { gte: mStart } }, _sum: { amount: true } }),
    prisma.order.aggregate({ where: { createdAt: { gte: pStart, lte: pEnd }, status: 'COMPLETED' }, _sum: { finalAmount: true }, _count: { id: true } }),
    prisma.order.aggregate({ where: { createdAt: { gte: pStart, lte: pEnd } }, _count: { id: true } }),
    prisma.order.aggregate({ where: { createdAt: { gte: today }, status: 'COMPLETED' }, _sum: { finalAmount: true }, _count: { id: true } }),
    prisma.order.count({ where: { createdAt: { gte: today } } }),
    prisma.product.count({ where: { isActive: true, deletedAt: null } }),
    prisma.customer.count({ where: { deletedAt: null } }),
    prisma.$queryRaw<[{ count: bigint }]>`SELECT COUNT(*) FROM "Product" WHERE "isActive"=true AND "deletedAt" IS NULL AND quantity <= "lowStockAlert"`,
    prisma.creditAccount.aggregate({ where: { balance: { gt: 0 } }, _sum: { balance: true }, _count: { id: true } }),
    prisma.order.count({ where: { paymentStatus: 'OVERDUE' } }),
    prisma.purchaseOrder.count({ where: { status: 'SENT' } }),
    prisma.returnRequest.count({ where: { status: 'PENDING' } }),
    prisma.discountRequest.count({ where: { status: 'PENDING' } }),
    prisma.productReview.count({ where: { isApproved: false } }),
  ]);

  const curRevenue  = thisMonthRevenue._sum.finalAmount ?? 0;
  const prevRevenue = prevMonthRevenue._sum.finalAmount ?? 0;
  const curExpenses = thisMonthExpenses._sum.amount ?? 0;
  const profit      = curRevenue - curExpenses;
  const margin      = curRevenue > 0 ? (profit / curRevenue) * 100 : 0;
  const revGrowth   = prevRevenue > 0 ? ((curRevenue - prevRevenue) / prevRevenue) * 100 : null;
  const prevOrdCount = prevMonthOrders._count.id;
  const curOrdCount  = thisMonthOrders._count.id;
  const ordGrowth    = prevOrdCount > 0 ? ((curOrdCount - prevOrdCount) / prevOrdCount) * 100 : null;

  const result = {
    kpis: {
      todayRevenue:   parseFloat((todayRevenue._sum.finalAmount ?? 0).toFixed(2)),
      todayOrders:    todayOrders,
      monthRevenue:   parseFloat(curRevenue.toFixed(2)),
      monthOrders:    curOrdCount,
      monthExpenses:  parseFloat(curExpenses.toFixed(2)),
      monthProfit:    parseFloat(profit.toFixed(2)),
      profitMargin:   parseFloat(margin.toFixed(1)),
      revenueGrowth:  revGrowth !== null ? parseFloat(revGrowth.toFixed(1)) : null,
      orderGrowth:    ordGrowth !== null ? parseFloat(ordGrowth.toFixed(1)) : null,
    },
    catalog: {
      totalProducts,
      totalCustomers,
      lowStockCount:  Number(lowStockCount[0]?.count ?? 0),
    },
    debt: {
      totalOutstanding: parseFloat((totalDebt._sum.balance ?? 0).toFixed(2)),
      debtorCount:      totalDebt._count.id,
      overdueOrders,
    },
    pendingActions: {
      purchaseOrders: pendingPurchaseOrders,
      returns:        pendingReturns,
      discounts:      pendingDiscounts,
      reviews:        pendingReviews,
    },
  };

  await set(cacheKey, result, CACHE_TTL);
  return result;
};

// ── Revenue chart data ────────────────────────────────────────────────────────
export const getRevenueChart = async (type: 'daily' | 'monthly' | 'yearly' = 'daily', days = 30) => {
  const cacheKey = `dashboard:revenue:${type}:${days}`;
  const cached   = await get<unknown>(cacheKey);
  if (cached) return cached;

  const from = new Date();
  from.setDate(from.getDate() - days);

  const orders = await prisma.order.findMany({
    where:   { createdAt: { gte: from }, status: 'COMPLETED' },
    select:  { finalAmount: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });

  const buckets = new Map<string, { revenue: number; orders: number }>();
  for (const order of orders) {
    let key: string;
    const d = order.createdAt;
    if (type === 'daily')   key = d.toISOString().split('T')[0]!;
    else if (type === 'monthly') key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    else key = String(d.getFullYear());

    const bucket = buckets.get(key) ?? { revenue: 0, orders: 0 };
    bucket.revenue += order.finalAmount;
    bucket.orders  += 1;
    buckets.set(key, bucket);
  }

  const result = Array.from(buckets.entries())
    .map(([date, data]) => ({ date, revenue: parseFloat(data.revenue.toFixed(2)), orders: data.orders }))
    .sort((a, b) => a.date.localeCompare(b.date));

  await set(cacheKey, result, CACHE_TTL);
  return result;
};

// ── Profit breakdown ──────────────────────────────────────────────────────────
export const getProfitBreakdown = async (months = 6) => {
  const cacheKey = `dashboard:profit:${months}`;
  const cached   = await get<unknown>(cacheKey);
  if (cached) return cached;

  const rows: Array<{ month: string; revenue: number; expenses: number; profit: number; margin: number }> = [];

  for (let i = months - 1; i >= 0; i--) {
    const d     = new Date();
    d.setMonth(d.getMonth() - i, 1);
    d.setHours(0, 0, 0, 0);
    const from  = new Date(d);
    const to    = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
    const label = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

    const [rev, exp] = await Promise.all([
      prisma.order.aggregate({ where: { createdAt: { gte: from, lte: to }, status: 'COMPLETED' }, _sum: { finalAmount: true } }),
      prisma.expense.aggregate({ where: { createdAt: { gte: from, lte: to } }, _sum: { amount: true } }),
    ]);

    const revenue  = rev._sum.finalAmount ?? 0;
    const expenses = exp._sum.amount ?? 0;
    const profit   = revenue - expenses;
    rows.push({ month: label, revenue: parseFloat(revenue.toFixed(2)), expenses: parseFloat(expenses.toFixed(2)), profit: parseFloat(profit.toFixed(2)), margin: revenue > 0 ? parseFloat(((profit / revenue) * 100).toFixed(1)) : 0 });
  }

  await set(cacheKey, rows, CACHE_TTL);
  return rows;
};

// ── Top employees ─────────────────────────────────────────────────────────────
export const getTopEmployees = async (limit = 10) => {
  const { from } = periodRange('month');

  const sales = await prisma.order.groupBy({
    by:      ['userId'],
    where:   { createdAt: { gte: from }, status: 'COMPLETED' },
    _sum:    { finalAmount: true },
    _count:  { id: true },
    orderBy: { _sum: { finalAmount: 'desc' } },
    take:    limit,
  });

  const users = await prisma.user.findMany({
    where:  { id: { in: sales.map((s) => s.userId) } },
    select: { id: true, name: true, role: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));

  return sales.map((s) => ({
    employee: userMap.get(s.userId) ?? { id: s.userId, name: 'Unknown', role: 'employee' },
    revenue:  parseFloat((s._sum.finalAmount ?? 0).toFixed(2)),
    orders:   s._count.id,
  }));
};

// ── Top products ──────────────────────────────────────────────────────────────
export const getTopProducts = async (limit = 10) => {
  const { from } = periodRange('month');

  const top = await prisma.orderItem.groupBy({
    by:      ['productId'],
    where:   { order: { createdAt: { gte: from }, status: 'COMPLETED' } },
    _sum:    { quantity: true },
    _count:  { id: true },
    orderBy: { _sum: { quantity: 'desc' } },
    take:    limit,
  });

  const products = await prisma.product.findMany({
    where:  { id: { in: top.map((t) => t.productId) } },
    select: { id: true, name: true, price: true, imageUrl: true, category: true },
  });
  const productMap = new Map(products.map((p) => [p.id, p]));

  return top.map((t) => ({
    product:    productMap.get(t.productId),
    unitsSold:  t._sum.quantity ?? 0,
    orderCount: t._count.id,
  })).filter((t) => t.product);
};

// ── Expense breakdown ─────────────────────────────────────────────────────────
export const getExpenseBreakdown = async () => {
  const { from } = periodRange('month');
  const byCategory = await prisma.expense.groupBy({
    by:      ['category'],
    where:   { createdAt: { gte: from } },
    _sum:    { amount: true },
    _count:  { id: true },
    orderBy: { _sum: { amount: 'desc' } },
  });
  return byCategory.map((c) => ({ category: c.category, total: parseFloat((c._sum.amount ?? 0).toFixed(2)), count: c._count.id }));
};
