import prisma from '../../config/prisma';
import { get, set, invalidate } from '../../shared/utils/cache.util';

const CACHE_TTL = 600;

export type TaxType = 'VAT' | 'GST' | 'SALES' | 'CUSTOM';

export interface CreateTaxRateInput {
  name:         string;
  rate:         number;
  type?:        TaxType;
  countryCode?: string;
  isDefault?:   boolean;
  isActive?:    boolean;
}

// ── Get all tax rates ──────────────────────────────────────────────────────────
export const getAll = async (activeOnly = false) => {
  const cacheKey = `tax-rates:${String(activeOnly)}`;
  const cached   = await get<unknown>(cacheKey);
  if (cached) return cached;

  const where = activeOnly ? { isActive: true } : {};
  const rates = await prisma.taxRate.findMany({
    where,
    orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
  });

  await set(cacheKey, rates, CACHE_TTL);
  return rates;
};

// ── Get default tax rate ───────────────────────────────────────────────────────
export const getDefault = async () => {
  const rate = await prisma.taxRate.findFirst({ where: { isDefault: true, isActive: true } });
  return rate;
};

// ── Calculate tax for a given amount and customer ─────────────────────────────
export const calculate = async (
  subtotal:      number,
  taxRateId?:    number,
  customerId?:   number,
): Promise<{ taxRate: number; taxAmount: number; total: number; taxExempt: boolean }> => {
  // Check customer tax exempt status
  if (customerId) {
    const customer = await prisma.customer.findUnique({ where: { id: customerId }, select: { taxExempt: true } });
    if (customer?.taxExempt) {
      return { taxRate: 0, taxAmount: 0, total: subtotal, taxExempt: true };
    }
  }

  let rate = 0;
  if (taxRateId) {
    const taxRate = await prisma.taxRate.findUnique({ where: { id: taxRateId } });
    if (taxRate?.isActive) rate = taxRate.rate;
  } else {
    const defaultRate = await getDefault();
    if (defaultRate) rate = defaultRate.rate;
  }

  const taxAmount = parseFloat(((subtotal * rate) / 100).toFixed(2));
  return {
    taxRate:   rate,
    taxAmount,
    total:     parseFloat((subtotal + taxAmount).toFixed(2)),
    taxExempt: false,
  };
};

// ── CRUD ───────────────────────────────────────────────────────────────────────
export const create = async (data: CreateTaxRateInput) => {
  if (data.rate < 0 || data.rate > 100) throw new Error('INVALID_RATE');

  if (data.isDefault) {
    await prisma.taxRate.updateMany({ where: { isDefault: true }, data: { isDefault: false } });
  }

  const rate = await prisma.taxRate.create({ data: { type: 'VAT', ...data } });
  await invalidate('tax-rates:');
  return rate;
};

export const update = async (id: number, data: Partial<CreateTaxRateInput>) => {
  const existing = await prisma.taxRate.findUnique({ where: { id } });
  if (!existing) throw new Error('TAX_RATE_NOT_FOUND');

  if (data.rate !== undefined && (data.rate < 0 || data.rate > 100)) throw new Error('INVALID_RATE');

  if (data.isDefault) {
    await prisma.taxRate.updateMany({ where: { isDefault: true, id: { not: id } }, data: { isDefault: false } });
  }

  const rate = await prisma.taxRate.update({ where: { id }, data });
  await invalidate('tax-rates:');
  return rate;
};

export const remove = async (id: number): Promise<void> => {
  const existing = await prisma.taxRate.findUnique({ where: { id } });
  if (!existing) throw new Error('TAX_RATE_NOT_FOUND');
  if (existing.isDefault) throw new Error('TAX_RATE_IS_DEFAULT');
  await prisma.taxRate.delete({ where: { id } });
  await invalidate('tax-rates:');
};

// ── Tax collection report ──────────────────────────────────────────────────────
export const getReport = async (from: Date, to: Date) => {
  const [invoices, orderTax] = await Promise.all([
    prisma.invoice.aggregate({
      where:  { createdAt: { gte: from, lte: to }, status: { not: 'CANCELLED' } },
      _sum:   { taxAmount: true, subtotal: true, total: true },
      _count: { id: true },
    }),
    prisma.order.aggregate({
      where:  { createdAt: { gte: from, lte: to }, status: 'COMPLETED' },
      _sum:   { tax: true, finalAmount: true },
      _count: { id: true },
    }),
  ]);

  return {
    period:       { from, to },
    invoiceTax:   parseFloat((invoices._sum.taxAmount ?? 0).toFixed(2)),
    invoiceCount: invoices._count.id,
    invoiceRevenue: parseFloat((invoices._sum.total ?? 0).toFixed(2)),
    orderTax:     parseFloat((orderTax._sum.tax ?? 0).toFixed(2)),
    orderCount:   orderTax._count.id,
    orderRevenue: parseFloat((orderTax._sum.finalAmount ?? 0).toFixed(2)),
    totalTaxCollected: parseFloat(((invoices._sum.taxAmount ?? 0) + (orderTax._sum.tax ?? 0)).toFixed(2)),
  };
};
