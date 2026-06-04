import prisma from '../../config/prisma';
import { sendEmail } from '../../services/email.service';

export type ReportType = 'DAILY_SALES' | 'WEEKLY_INVENTORY' | 'MONTHLY_PROFIT' | 'LOW_STOCK';
export type Frequency  = 'DAILY' | 'WEEKLY' | 'MONTHLY';

function nextRunDate(frequency: Frequency): Date {
  const d = new Date();
  if (frequency === 'DAILY')   d.setDate(d.getDate() + 1);
  if (frequency === 'WEEKLY')  d.setDate(d.getDate() + 7);
  if (frequency === 'MONTHLY') d.setMonth(d.getMonth() + 1);
  d.setHours(8, 0, 0, 0);
  return d;
}

// ── Schedule CRUD ─────────────────────────────────────────────────────────────
export const getAll = async () =>
  prisma.reportSchedule.findMany({ orderBy: { type: 'asc' } });

export const upsert = async (data: {
  type:       ReportType;
  frequency:  Frequency;
  recipients: string[];
  isActive?:  boolean;
}) => {
  const schedule = await prisma.reportSchedule.upsert({
    where:  { type: data.type },
    create: {
      type:       data.type,
      frequency:  data.frequency,
      recipients: data.recipients,
      isActive:   data.isActive ?? true,
      nextRunAt:  nextRunDate(data.frequency),
    },
    update: {
      frequency:  data.frequency,
      recipients: data.recipients,
      isActive:   data.isActive ?? true,
      nextRunAt:  nextRunDate(data.frequency),
    },
  });
  return schedule;
};

export const remove = async (type: string): Promise<void> => {
  await prisma.reportSchedule.deleteMany({ where: { type } });
};

// ── Report generators ─────────────────────────────────────────────────────────
async function buildDailySalesReport(): Promise<{ subject: string; html: string }> {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const [orders, revenue, topProducts] = await Promise.all([
    prisma.order.count({ where: { createdAt: { gte: today }, status: 'COMPLETED' } }),
    prisma.order.aggregate({ where: { createdAt: { gte: today }, status: 'COMPLETED' }, _sum: { finalAmount: true } }),
    prisma.orderItem.groupBy({
      by: ['productId'], where: { order: { createdAt: { gte: today }, status: 'COMPLETED' } },
      _sum: { quantity: true }, orderBy: { _sum: { quantity: 'desc' } }, take: 5,
    }),
  ]);

  const topRows = await Promise.all(topProducts.map(async (p) => {
    const prod = await prisma.product.findUnique({ where: { id: p.productId }, select: { name: true } });
    return `<tr><td>${prod?.name ?? 'Unknown'}</td><td>${p._sum.quantity ?? 0}</td></tr>`;
  }));

  const subject = `Daily Sales Report — ${today.toDateString()}`;
  const html = `
    <h2 style="color:#4f46e5">Daily Sales Summary</h2>
    <p><strong>Date:</strong> ${today.toDateString()}</p>
    <table border="1" cellpadding="8" style="border-collapse:collapse">
      <tr><td><strong>Completed Orders</strong></td><td>${orders}</td></tr>
      <tr><td><strong>Total Revenue</strong></td><td>$${(revenue._sum.finalAmount ?? 0).toFixed(2)}</td></tr>
    </table>
    <h3>Top Products Sold</h3>
    <table border="1" cellpadding="8" style="border-collapse:collapse">
      <tr><th>Product</th><th>Qty Sold</th></tr>
      ${topRows.join('')}
    </table>`;
  return { subject, html };
}

async function buildWeeklyInventoryReport(): Promise<{ subject: string; html: string }> {
  const [lowStock, totalProducts, totalValue] = await Promise.all([
    prisma.product.findMany({
      where: { isActive: true, deletedAt: null, quantity: { lte: prisma.product.fields.lowStockAlert } },
      select: { name: true, quantity: true, lowStockAlert: true, sku: true },
      orderBy: { quantity: 'asc' },
      take: 20,
    }),
    prisma.product.count({ where: { isActive: true, deletedAt: null } }),
    prisma.product.aggregate({ where: { isActive: true, deletedAt: null }, _sum: { quantity: true } }),
  ]);

  const lowRows = lowStock.map((p) =>
    `<tr style="background:${p.quantity === 0 ? '#fee2e2' : '#fef3c7'}">
      <td>${p.name}</td><td>${p.sku ?? '—'}</td>
      <td>${p.quantity}</td><td>${p.lowStockAlert}</td></tr>`,
  ).join('');

  const subject = `Weekly Inventory Report — ${new Date().toDateString()}`;
  const html = `
    <h2 style="color:#4f46e5">Weekly Inventory Summary</h2>
    <table border="1" cellpadding="8" style="border-collapse:collapse">
      <tr><td><strong>Total Active Products</strong></td><td>${totalProducts}</td></tr>
      <tr><td><strong>Total Units in Stock</strong></td><td>${totalValue._sum.quantity ?? 0}</td></tr>
      <tr><td><strong>Low / Out of Stock Items</strong></td><td>${lowStock.length}</td></tr>
    </table>
    ${lowStock.length ? `
    <h3>Low Stock Items</h3>
    <table border="1" cellpadding="8" style="border-collapse:collapse">
      <tr><th>Product</th><th>SKU</th><th>Qty</th><th>Alert Level</th></tr>
      ${lowRows}
    </table>` : '<p style="color:green">All products are adequately stocked.</p>'}`;
  return { subject, html };
}

async function buildMonthlyProfitReport(): Promise<{ subject: string; html: string }> {
  const now   = new Date();
  const from  = new Date(now.getFullYear(), now.getMonth(), 1);
  const month = from.toLocaleString('default', { month: 'long', year: 'numeric' });

  const [revenue, expenses, topCats] = await Promise.all([
    prisma.order.aggregate({ where: { createdAt: { gte: from }, status: 'COMPLETED' }, _sum: { finalAmount: true }, _count: { id: true } }),
    prisma.expense.aggregate({ where: { createdAt: { gte: from } }, _sum: { amount: true } }),
    prisma.orderItem.groupBy({
      by: ['productId'], where: { order: { createdAt: { gte: from }, status: 'COMPLETED' } },
      _sum: { quantity: true }, orderBy: { _sum: { quantity: 'desc' } }, take: 5,
    }),
  ]);

  const rev     = revenue._sum.finalAmount ?? 0;
  const exp     = expenses._sum.amount ?? 0;
  const profit  = rev - exp;
  const margin  = rev > 0 ? ((profit / rev) * 100).toFixed(1) : '0.0';

  const catRows = await Promise.all(topCats.map(async (p) => {
    const prod = await prisma.product.findUnique({ where: { id: p.productId }, select: { name: true } });
    return `<tr><td>${prod?.name ?? 'Unknown'}</td><td>${p._sum.quantity ?? 0}</td></tr>`;
  }));

  const subject = `Monthly Profit Report — ${month}`;
  const html = `
    <h2 style="color:#4f46e5">Monthly Profit Report — ${month}</h2>
    <table border="1" cellpadding="8" style="border-collapse:collapse">
      <tr><td><strong>Total Revenue</strong></td><td>$${rev.toFixed(2)}</td></tr>
      <tr><td><strong>Total Expenses</strong></td><td>$${exp.toFixed(2)}</td></tr>
      <tr><td><strong>Net Profit</strong></td><td style="color:${profit >= 0 ? 'green' : 'red'}">$${profit.toFixed(2)}</td></tr>
      <tr><td><strong>Profit Margin</strong></td><td>${margin}%</td></tr>
      <tr><td><strong>Orders</strong></td><td>${revenue._count.id}</td></tr>
    </table>
    <h3>Top Selling Products</h3>
    <table border="1" cellpadding="8" style="border-collapse:collapse">
      <tr><th>Product</th><th>Units Sold</th></tr>
      ${catRows.join('')}
    </table>`;
  return { subject, html };
}

async function buildLowStockReport(): Promise<{ subject: string; html: string }> {
  const items = await prisma.$queryRaw<Array<{ id: number; name: string; sku: string | null; quantity: number; lowStockAlert: number }>>`
    SELECT id, name, sku, quantity, "lowStockAlert"
    FROM "Product"
    WHERE "isActive" = true AND "deletedAt" IS NULL AND quantity <= "lowStockAlert"
    ORDER BY quantity ASC
    LIMIT 50
  `;

  const rows = items.map((p) =>
    `<tr style="background:${p.quantity === 0 ? '#fee2e2' : '#fef3c7'}">
      <td>${p.name}</td><td>${p.sku ?? '—'}</td><td>${p.quantity}</td><td>${p.lowStockAlert}</td></tr>`,
  ).join('');

  const subject = `Low Stock Alert — ${items.length} item${items.length !== 1 ? 's' : ''} need attention`;
  const html = `
    <h2 style="color:#ef4444">Low Stock Alert</h2>
    <p><strong>${items.length}</strong> product${items.length !== 1 ? 's are' : ' is'} at or below reorder level.</p>
    <table border="1" cellpadding="8" style="border-collapse:collapse">
      <tr><th>Product</th><th>SKU</th><th>In Stock</th><th>Alert Level</th></tr>
      ${rows || '<tr><td colspan="4">All products are adequately stocked.</td></tr>'}
    </table>`;
  return { subject, html };
}

// ── Send a report on demand ────────────────────────────────────────────────────
export const sendReport = async (type: ReportType, recipients?: string[]): Promise<{ sent: boolean; recipientCount: number }> => {
  let subject = '';
  let html    = '';

  if (type === 'DAILY_SALES')      ({ subject, html } = await buildDailySalesReport());
  else if (type === 'WEEKLY_INVENTORY') ({ subject, html } = await buildWeeklyInventoryReport());
  else if (type === 'MONTHLY_PROFIT')   ({ subject, html } = await buildMonthlyProfitReport());
  else if (type === 'LOW_STOCK')        ({ subject, html } = await buildLowStockReport());
  else throw new Error('INVALID_REPORT_TYPE');

  let toList = recipients ?? [];
  if (!toList.length) {
    const schedule = await prisma.reportSchedule.findUnique({ where: { type } });
    toList = (schedule?.recipients as string[]) ?? [];
  }
  if (!toList.length) throw new Error('NO_RECIPIENTS');

  const sent = await sendEmail({ to: toList, subject, html });

  if (sent) {
    await prisma.reportSchedule.updateMany({
      where: { type },
      data:  { lastSentAt: new Date() },
    });
  }

  return { sent, recipientCount: toList.length };
};
