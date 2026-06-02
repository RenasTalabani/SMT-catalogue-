import ExcelJS from 'exceljs';
import prisma from '../config/prisma';

// ── Helpers ───────────────────────────────────────────────────────────────────

const BRAND = '6C5CE7';
const HEADER_FILL: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + BRAND } };
const HEADER_FONT: Partial<ExcelJS.Font> = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };

const styleSheet = (sheet: ExcelJS.Worksheet, headers: string[]) => {
  const header = sheet.getRow(1);
  headers.forEach((h, i) => {
    const cell   = header.getCell(i + 1);
    cell.value   = h;
    cell.fill    = HEADER_FILL;
    cell.font    = HEADER_FONT;
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getColumn(i + 1).width = Math.max(h.length + 6, 16);
  });
  header.height = 24;
  sheet.autoFilter = { from: 'A1', to: { row: 1, column: headers.length } };
};

const buildWorkbook = async (
  sheetName: string,
  headers: string[],
  rows: (string | number | null | undefined)[][],
): Promise<ExcelJS.Buffer> => {
  const wb    = new ExcelJS.Workbook();
  wb.creator  = 'DaralIraq';
  wb.created  = new Date();
  const sheet = wb.addWorksheet(sheetName);
  styleSheet(sheet, headers);
  rows.forEach((r) => sheet.addRow(r));
  return wb.xlsx.writeBuffer();
};

const toCsv = (headers: string[], rows: (string | number | null | undefined)[][]): string => {
  const escape = (v: unknown) => {
    const s = v == null ? '' : String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers, ...rows].map((r) => r.map(escape).join(',')).join('\n');
};

// ── Products ──────────────────────────────────────────────────────────────────

export const exportProducts = async (format: 'excel' | 'csv') => {
  const products = await prisma.product.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, name: true, category: true, sku: true, barcode: true, price: true, costPrice: true, quantity: true, lowStockAlert: true, unit: true, isActive: true, createdAt: true },
  });
  const headers = ['ID', 'Name', 'Category', 'SKU', 'Barcode', 'Price', 'Cost Price', 'Quantity', 'Low Stock Alert', 'Unit', 'Active', 'Created'];
  const rows = products.map((p) => [p.id, p.name, p.category, p.sku ?? '', p.barcode ?? '', p.price, p.costPrice, p.quantity, p.lowStockAlert, p.unit, p.isActive ? 'Yes' : 'No', new Date(p.createdAt).toLocaleDateString()]);
  if (format === 'csv') return toCsv(headers, rows);
  return buildWorkbook('Products', headers, rows);
};

// ── Orders ────────────────────────────────────────────────────────────────────

export const exportOrders = async (format: 'excel' | 'csv', from?: string, to?: string) => {
  const where: Record<string, unknown> = {};
  if (from || to) {
    const createdAt: Record<string, Date> = {};
    if (from) createdAt['gte'] = new Date(from);
    if (to)   createdAt['lte'] = new Date(new Date(to).setHours(23, 59, 59, 999));
    where['createdAt'] = createdAt;
  }
  const orders = await prisma.order.findMany({
    where, orderBy: { createdAt: 'desc' },
    select: { id: true, status: true, totalAmount: true, discount: true, tax: true, finalAmount: true, paymentMethod: true, notes: true, createdAt: true, user: { select: { name: true } }, customer: { select: { name: true } } },
  });
  const headers = ['ID', 'Status', 'Employee', 'Customer', 'Total', 'Discount', 'Tax', 'Final Amount', 'Payment', 'Notes', 'Date'];
  const rows = orders.map((o) => [o.id, o.status, o.user.name, o.customer?.name ?? 'Walk-in', o.totalAmount, o.discount, o.tax, o.finalAmount, o.paymentMethod, o.notes ?? '', new Date(o.createdAt).toLocaleDateString()]);
  if (format === 'csv') return toCsv(headers, rows);
  return buildWorkbook('Orders', headers, rows);
};

// ── Customers ─────────────────────────────────────────────────────────────────

export const exportCustomers = async (format: 'excel' | 'csv') => {
  const customers = await prisma.customer.findMany({
    orderBy: { name: 'asc' },
    select:  { id: true, name: true, phone: true, email: true, address: true, notes: true, createdAt: true },
  });
  const headers = ['ID', 'Name', 'Phone', 'Email', 'Address', 'Notes', 'Created'];
  const rows = customers.map((c) => [c.id, c.name, c.phone ?? '', c.email ?? '', c.address ?? '', c.notes ?? '', new Date(c.createdAt).toLocaleDateString()]);
  if (format === 'csv') return toCsv(headers, rows);
  return buildWorkbook('Customers', headers, rows);
};

// ── Suppliers ─────────────────────────────────────────────────────────────────

export const exportSuppliers = async (format: 'excel' | 'csv') => {
  const suppliers = await prisma.supplier.findMany({
    orderBy: { name: 'asc' },
    select:  { id: true, name: true, phone: true, email: true, address: true, notes: true, createdAt: true },
  });
  const headers = ['ID', 'Name', 'Phone', 'Email', 'Address', 'Notes', 'Created'];
  const rows = suppliers.map((s) => [s.id, s.name, s.phone ?? '', s.email ?? '', s.address ?? '', s.notes ?? '', new Date(s.createdAt).toLocaleDateString()]);
  if (format === 'csv') return toCsv(headers, rows);
  return buildWorkbook('Suppliers', headers, rows);
};

// ── Finance ───────────────────────────────────────────────────────────────────

export const exportFinance = async (format: 'excel' | 'csv', from?: string, to?: string) => {
  const where: Record<string, unknown> = {};
  if (from || to) {
    const createdAt: Record<string, Date> = {};
    if (from) createdAt['gte'] = new Date(from);
    if (to)   createdAt['lte'] = new Date(new Date(to).setHours(23, 59, 59, 999));
    where['createdAt'] = createdAt;
  }

  const [expenses, incomes] = await Promise.all([
    prisma.expense.findMany({ where, orderBy: { createdAt: 'desc' }, select: { id: true, amount: true, category: true, notes: true, createdAt: true, creator: { select: { name: true } } } }),
    prisma.income.findMany({  where, orderBy: { createdAt: 'desc' }, select: { id: true, amount: true, source: true,   notes: true, createdAt: true, creator: { select: { name: true } } } }),
  ]);

  if (format === 'csv') {
    const expCsv = toCsv(['ID', 'Type', 'Amount', 'Category/Source', 'By', 'Notes', 'Date'], [
      ...expenses.map((e) => [e.id, 'Expense', e.amount, e.category, e.creator.name, e.notes ?? '', new Date(e.createdAt).toLocaleDateString()]),
      ...incomes.map((i)  => [i.id, 'Income',  i.amount, i.source,   i.creator.name, i.notes ?? '', new Date(i.createdAt).toLocaleDateString()]),
    ]);
    return expCsv;
  }

  const wb    = new ExcelJS.Workbook();
  wb.creator  = 'DaralIraq';
  wb.created  = new Date();

  const expSheet = wb.addWorksheet('Expenses');
  styleSheet(expSheet, ['ID', 'Amount', 'Category', 'By', 'Notes', 'Date']);
  expenses.forEach((e) => expSheet.addRow([e.id, e.amount, e.category, e.creator.name, e.notes ?? '', new Date(e.createdAt).toLocaleDateString()]));

  const incSheet = wb.addWorksheet('Incomes');
  styleSheet(incSheet, ['ID', 'Amount', 'Source', 'By', 'Notes', 'Date']);
  incomes.forEach((i) => incSheet.addRow([i.id, i.amount, i.source, i.creator.name, i.notes ?? '', new Date(i.createdAt).toLocaleDateString()]));

  return wb.xlsx.writeBuffer();
};
