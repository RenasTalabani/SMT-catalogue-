import prisma from '../../config/prisma';
import { get, set } from '../../shared/utils/cache.util';

const CACHE_TTL         = 300;
const DASHBOARD_CACHE_TTL = 15; // fast refresh for live dashboard

export const getDashboard = async () => {
  const cacheKey = 'reports:dashboard';
  const cached   = await get<unknown>(cacheKey);
  if (cached) return cached;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    totalProducts, totalOrders, totalUsers,
    todayOrders, completedOrders, pendingOrders, cancelledOrders,
    revenueAgg, inventoryAgg, recentOrders, allActiveForLowStock,
  ] = await Promise.all([
    prisma.product.count({ where: { deletedAt: null } }),
    prisma.order.count(),
    prisma.user.count(),
    prisma.order.count({ where: { createdAt: { gte: today } } }),
    prisma.order.count({ where: { status: 'COMPLETED' } }),
    prisma.order.count({ where: { status: 'PENDING' } }),
    prisma.order.count({ where: { status: 'CANCELLED' } }),
    prisma.order.aggregate({ where: { status: 'COMPLETED' }, _sum: { totalAmount: true } }),
    prisma.product.aggregate({ where: { deletedAt: null }, _sum: { quantity: true } }),
    prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      take:    10,
      select:  { id: true, finalAmount: true, status: true, createdAt: true },
    }),
    prisma.product.findMany({
      where:   { deletedAt: null, isActive: true },
      select:  { id: true, name: true, sku: true, quantity: true, lowStockAlert: true },
    }),
  ]);

  // Use each product's own lowStockAlert threshold (not a hardcoded 5)
  const lowStockProducts = allActiveForLowStock
    .filter((p) => p.quantity <= p.lowStockAlert)
    .sort((a, b) => a.quantity - b.quantity);
  const lowStockCount = lowStockProducts.length;
  const lowStockItems = lowStockProducts.slice(0, 10);

  const result = {
    totalProducts, totalOrders, totalUsers,
    todayOrders, completedOrders, pendingOrders, cancelledOrders,
    totalRevenue:    parseFloat((revenueAgg._sum.totalAmount ?? 0).toFixed(2)),
    totalStockUnits: inventoryAgg._sum.quantity ?? 0,
    lowStockCount,
    lowStockItems,
    recentOrders,
  };

  await set(cacheKey, result, DASHBOARD_CACHE_TTL);
  return result;
};

export const getSalesAnalytics = async ({ from, to, groupBy = 'day' }: { from?: string; to?: string; groupBy?: string } = {}) => {
  const cacheKey = `reports:sales:${String(from)}:${String(to)}:${groupBy}`;
  const cached   = await get<unknown>(cacheKey);
  if (cached) return cached;

  const where: Record<string, unknown> = { status: 'COMPLETED' };
  if (from || to) {
    const createdAt: Record<string, Date> = {};
    if (from) createdAt['gte'] = new Date(from);
    if (to)   createdAt['lte'] = new Date(to);
    where['createdAt'] = createdAt;
  }

  const orders = await prisma.order.findMany({
    where,
    select: { totalAmount: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });

  const grouped: Record<string, { date: string; revenue: number; orders: number }> = {};
  for (const order of orders) {
    const d = new Date(order.createdAt);
    let key: string;
    if (groupBy === 'month') {
      key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    } else if (groupBy === 'week') {
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      key = weekStart.toISOString().split('T')[0]!;
    } else {
      key = d.toISOString().split('T')[0]!;
    }
    if (!grouped[key]) grouped[key] = { date: key, revenue: 0, orders: 0 };
    grouped[key]!.revenue += order.totalAmount;
    grouped[key]!.orders  += 1;
  }

  const data = Object.values(grouped).map((g) => ({ ...g, revenue: parseFloat(g.revenue.toFixed(2)) }));
  const result = {
    data,
    totalRevenue: parseFloat(data.reduce((s, d) => s + d.revenue, 0).toFixed(2)),
    totalOrders:  data.reduce((s, d) => s + d.orders, 0),
  };

  await set(cacheKey, result, CACHE_TTL);
  return result;
};

export const getTopProducts = async ({ limit = 10, from, to }: { limit?: string | number; from?: string; to?: string } = {}) => {
  const cacheKey = `reports:top-products:${String(limit)}:${String(from)}:${String(to)}`;
  const cached   = await get<unknown>(cacheKey);
  if (cached) return cached;

  const orderWhere: Record<string, unknown> = { order: { status: 'COMPLETED' } };
  if (from || to) {
    const createdAt: Record<string, Date> = {};
    if (from) createdAt['gte'] = new Date(from);
    if (to)   createdAt['lte'] = new Date(to);
    (orderWhere['order'] as Record<string, unknown>)['createdAt'] = createdAt;
  }

  const items = await prisma.orderItem.groupBy({
    by: ['productId'],
    where: orderWhere,
    _sum:   { quantity: true },
    _count: { id: true },
    orderBy: { _sum: { quantity: 'desc' } },
    take: parseInt(String(limit)),
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
      totalSold:    item._sum.quantity ?? 0,
      orderCount:   item._count.id,
      totalRevenue: parseFloat(((item._sum.quantity ?? 0) * (p?.price ?? 0)).toFixed(2)),
    };
  });

  await set(cacheKey, result, CACHE_TTL);
  return result;
};

export const getCategoryBreakdown = async () => {
  const cacheKey = 'reports:category-breakdown';
  const cached   = await get<unknown>(cacheKey);
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

export const getAuditLogs = async ({
  entity, action, userId, search, from, to, page = 1, limit = 50,
}: {
  entity?: string; action?: string; userId?: string; search?: string;
  from?: string; to?: string;
  page?: string | number; limit?: string | number;
} = {}) => {
  const where: Record<string, unknown> = {};
  if (entity) where['entity'] = entity;
  if (action) where['action'] = action;
  if (userId) where['userId'] = parseInt(String(userId));
  if (from || to) {
    const createdAt: Record<string, Date> = {};
    if (from) createdAt['gte'] = new Date(from);
    if (to)   createdAt['lte'] = new Date(new Date(to).setHours(23, 59, 59, 999));
    where['createdAt'] = createdAt;
  }
  if (search) {
    where['user'] = { name: { contains: search, mode: 'insensitive' } };
  }

  const skip = (parseInt(String(page)) - 1) * parseInt(String(limit));
  const take = parseInt(String(limit));

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where, orderBy: { createdAt: 'desc' }, skip, take,
      select: {
        id: true, action: true, entity: true, entityId: true,
        metadata: true, ipAddress: true, createdAt: true,
        user: { select: { id: true, name: true, role: true } },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { logs, total, page: parseInt(String(page)), limit: take };
};

export const exportAuditLogs = async ({
  entity, action, userId, from, to,
}: {
  entity?: string; action?: string; userId?: string; from?: string; to?: string;
} = {}) => {
  const where: Record<string, unknown> = {};
  if (entity) where['entity'] = entity;
  if (action) where['action'] = action;
  if (userId) where['userId'] = parseInt(String(userId));
  if (from || to) {
    const createdAt: Record<string, Date> = {};
    if (from) createdAt['gte'] = new Date(from);
    if (to)   createdAt['lte'] = new Date(new Date(to).setHours(23, 59, 59, 999));
    where['createdAt'] = createdAt;
  }

  return prisma.auditLog.findMany({
    where, orderBy: { createdAt: 'desc' }, take: 5000,
    select: {
      id: true, action: true, entity: true, entityId: true,
      metadata: true, ipAddress: true, createdAt: true,
      user: { select: { id: true, name: true, role: true } },
    },
  });
};

export const getEmployeePerformance = async ({
  from, to, month,
}: { from?: string; to?: string; month?: string } = {}) => {
  const cacheKey = `reports:employee-perf:${String(from)}:${String(to)}:${String(month)}`;
  const cached   = await get<unknown>(cacheKey);
  if (cached) return cached;

  // Build date range
  let startDate: Date | undefined;
  let endDate:   Date | undefined;

  if (month) {
    // month format: YYYY-MM
    startDate = new Date(`${month}-01T00:00:00.000Z`);
    endDate   = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0, 23, 59, 59, 999);
  } else if (from || to) {
    if (from) startDate = new Date(from);
    if (to)   endDate   = new Date(new Date(to).setHours(23, 59, 59, 999));
  } else {
    // Default: current month
    const now = new Date();
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    endDate   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  }

  const dateWhere = startDate || endDate
    ? { createdAt: { ...(startDate ? { gte: startDate } : {}), ...(endDate ? { lte: endDate } : {}) } }
    : {};

  // Get all employees + admins
  const employees = await prisma.user.findMany({
    where:  { role: { in: ['employee', 'admin', 'super_admin'] }, isActive: true },
    select: { id: true, name: true, role: true },
  });

  const results = await Promise.all(employees.map(async (emp) => {
    const [orders, invoices, discountLogs] = await Promise.all([
      // Orders created by this employee
      prisma.order.findMany({
        where:  { userId: emp.id, ...dateWhere },
        select: { id: true, finalAmount: true, discount: true, status: true, createdAt: true },
      }),
      // Invoices created by this employee
      prisma.invoice.count({ where: { createdById: emp.id, ...dateWhere } }),
      // Discount usage from audit logs
      prisma.auditLog.findMany({
        where:  { userId: emp.id, action: 'DISCOUNT', ...dateWhere },
        select: { metadata: true, createdAt: true },
      }),
    ]);

    const completedOrders   = orders.filter((o) => o.status === 'COMPLETED');
    const totalSales        = completedOrders.reduce((s, o) => s + (o.finalAmount ?? 0), 0);
    const totalOrders       = orders.length;
    const totalDiscount     = orders.reduce((s, o) => s + (o.discount ?? 0), 0);
    const avgOrderValue     = completedOrders.length > 0 ? totalSales / completedOrders.length : 0;
    const discountUsage     = discountLogs.length;
    const totalDiscountAmt  = discountLogs.reduce((s, d) => {
      const meta = d.metadata as Record<string, unknown> | null;
      return s + (Number(meta?.['discountAmount'] ?? 0));
    }, 0);

    return {
      id:             emp.id,
      name:           emp.name,
      role:           emp.role,
      totalOrders,
      completedOrders: completedOrders.length,
      totalSales:     parseFloat(totalSales.toFixed(2)),
      avgOrderValue:  parseFloat(avgOrderValue.toFixed(2)),
      totalDiscount:  parseFloat(totalDiscount.toFixed(2)),
      invoicesCreated: invoices,
      discountUsage,
      totalDiscountAmt: parseFloat(totalDiscountAmt.toFixed(2)),
    };
  }));

  // Sort by total sales descending
  const sorted = results.sort((a, b) => b.totalSales - a.totalSales);
  const result = { employees: sorted, period: { from: startDate, to: endDate } };
  await set(cacheKey, result, 60);
  return result;
};

export const getProfitAnalytics = async ({
  from, to, groupBy = 'day',
}: { from?: string; to?: string; groupBy?: string } = {}) => {
  const cacheKey = `reports:profit:${String(from)}:${String(to)}:${groupBy}`;
  const cached   = await get<unknown>(cacheKey);
  if (cached) return cached;

  // Default: last 30 days
  const endDate   = to   ? new Date(new Date(to).setHours(23, 59, 59, 999)) : new Date();
  const startDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const dateWhere = { createdAt: { gte: startDate, lte: endDate } };

  // Fetch completed orders with items + product cost prices
  const [orders, expenses, products] = await Promise.all([
    prisma.order.findMany({
      where:  { status: 'COMPLETED', ...dateWhere },
      select: {
        id: true, finalAmount: true, createdAt: true,
        items: {
          select: {
            quantity: true, price: true,
            product: { select: { id: true, name: true, costPrice: true } },
          },
        },
      },
    }),
    prisma.expense.findMany({
      where:  dateWhere,
      select: { amount: true, createdAt: true },
    }),
    prisma.product.findMany({
      select: { id: true, name: true, sku: true, price: true, costPrice: true, category: true },
    }),
  ]);

  // ── Daily / Monthly breakdown ─────────────────────────────────────────────
  const fmt = (d: Date) =>
    groupBy === 'month'
      ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const dayMap: Record<string, { revenue: number; cogs: number; expenses: number }> = {};

  for (const order of orders) {
    const key  = fmt(new Date(order.createdAt));
    if (!dayMap[key]) dayMap[key] = { revenue: 0, cogs: 0, expenses: 0 };
    dayMap[key].revenue += order.finalAmount ?? 0;
    for (const item of order.items) {
      dayMap[key].cogs += (item.product.costPrice ?? 0) * item.quantity;
    }
  }
  for (const exp of expenses) {
    const key = fmt(new Date(exp.createdAt));
    if (!dayMap[key]) dayMap[key] = { revenue: 0, cogs: 0, expenses: 0 };
    dayMap[key].expenses += exp.amount;
  }

  const timeline = Object.entries(dayMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, d]) => ({
      date,
      revenue:     parseFloat(d.revenue.toFixed(2)),
      cogs:        parseFloat(d.cogs.toFixed(2)),
      expenses:    parseFloat(d.expenses.toFixed(2)),
      grossProfit: parseFloat((d.revenue - d.cogs).toFixed(2)),
      netProfit:   parseFloat((d.revenue - d.cogs - d.expenses).toFixed(2)),
    }));

  // ── Product profit analysis ───────────────────────────────────────────────
  const productSales: Record<number, { name: string; sku: string | null; category: string; revenue: number; cogs: number; unitsSold: number }> = {};

  for (const order of orders) {
    for (const item of order.items) {
      const pid = item.product.id;
      if (!productSales[pid]) {
        const p = products.find((x) => x.id === pid);
        productSales[pid] = { name: p?.name ?? 'Unknown', sku: p?.sku ?? null, category: p?.category ?? '', revenue: 0, cogs: 0, unitsSold: 0 };
      }
      productSales[pid].revenue  += item.price * item.quantity;
      productSales[pid].cogs     += (item.product.costPrice ?? 0) * item.quantity;
      productSales[pid].unitsSold += item.quantity;
    }
  }

  const productList = Object.entries(productSales).map(([id, d]) => ({
    id:          parseInt(id),
    name:        d.name,
    sku:         d.sku,
    category:    d.category,
    revenue:     parseFloat(d.revenue.toFixed(2)),
    cogs:        parseFloat(d.cogs.toFixed(2)),
    grossProfit: parseFloat((d.revenue - d.cogs).toFixed(2)),
    margin:      d.revenue > 0 ? parseFloat(((d.revenue - d.cogs) / d.revenue * 100).toFixed(1)) : 0,
    unitsSold:   d.unitsSold,
  })).sort((a, b) => b.grossProfit - a.grossProfit);

  // ── Totals ────────────────────────────────────────────────────────────────
  const totalRevenue  = parseFloat(orders.reduce((s, o) => s + (o.finalAmount ?? 0), 0).toFixed(2));
  const totalCogs     = parseFloat(orders.reduce((s, o) => s + o.items.reduce((si, i) => si + (i.product.costPrice ?? 0) * i.quantity, 0), 0).toFixed(2));
  const totalExpenses = parseFloat(expenses.reduce((s, e) => s + e.amount, 0).toFixed(2));
  const grossProfit   = parseFloat((totalRevenue - totalCogs).toFixed(2));
  const netProfit     = parseFloat((grossProfit - totalExpenses).toFixed(2));
  const grossMargin   = totalRevenue > 0 ? parseFloat((grossProfit / totalRevenue * 100).toFixed(1)) : 0;

  const result = {
    summary: { totalRevenue, totalCogs, totalExpenses, grossProfit, netProfit, grossMargin },
    timeline,
    topProducts:   productList.slice(0, 10),
    worstProducts: [...productList].sort((a, b) => a.grossProfit - b.grossProfit).slice(0, 10),
    period: { from: startDate, to: endDate },
  };

  await set(cacheKey, result, CACHE_TTL);
  return result;
};
