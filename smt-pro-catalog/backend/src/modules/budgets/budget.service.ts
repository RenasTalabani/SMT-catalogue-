import prisma from '../../config/prisma';
import { broadcastToAdmins } from '../notifications/notification.service';

export type BudgetPeriod = 'MONTHLY' | 'QUARTERLY' | 'ANNUAL';

export interface CreateBudgetInput {
  category: string;
  amount:   number;
  period:   BudgetPeriod;
  year:     number;
  month?:   number;
  quarter?: number;
  notes?:   string;
}

// ── Resolve period bounds for expense queries ──────────────────────────────────
function periodBounds(period: BudgetPeriod, year: number, month?: number, quarter?: number) {
  if (period === 'MONTHLY' && month) {
    const from = new Date(year, month - 1, 1);
    const to   = new Date(year, month, 0, 23, 59, 59, 999);
    return { from, to };
  }
  if (period === 'QUARTERLY' && quarter) {
    const startMonth = (quarter - 1) * 3;
    const from = new Date(year, startMonth, 1);
    const to   = new Date(year, startMonth + 3, 0, 23, 59, 59, 999);
    return { from, to };
  }
  // ANNUAL
  return { from: new Date(year, 0, 1), to: new Date(year, 11, 31, 23, 59, 59, 999) };
}

// ── Get all active budgets with current spend ──────────────────────────────────
export const getDashboard = async (year: number, month: number) => {
  const quarter = Math.ceil(month / 3);

  const budgets = await prisma.budget.findMany({
    where: {
      isActive: true,
      year,
      OR: [
        { period: 'MONTHLY',   month },
        { period: 'QUARTERLY', quarter },
        { period: 'ANNUAL' },
      ],
    },
    orderBy: { category: 'asc' },
  });

  const results = await Promise.all(
    budgets.map(async (b) => {
      const { from, to } = periodBounds(b.period as BudgetPeriod, b.year, b.month ?? undefined, b.quarter ?? undefined);
      const spent = await prisma.expense.aggregate({
        where:   { category: b.category, createdAt: { gte: from, lte: to } },
        _sum:    { amount: true },
      });

      const spentAmount  = parseFloat((spent._sum.amount ?? 0).toFixed(2));
      const utilisation  = b.amount > 0 ? parseFloat(((spentAmount / b.amount) * 100).toFixed(1)) : 0;
      const remaining    = parseFloat((b.amount - spentAmount).toFixed(2));
      const alertLevel   = utilisation >= 100 ? 'EXCEEDED' : utilisation >= 80 ? 'WARNING' : 'OK';

      return { ...b, spentAmount, remaining, utilisation, alertLevel };
    }),
  );

  return results;
};

// ── Get one budget with spend details ─────────────────────────────────────────
export const getById = async (id: number) => {
  const b = await prisma.budget.findUnique({ where: { id } });
  if (!b) throw new Error('BUDGET_NOT_FOUND');

  const { from, to } = periodBounds(b.period as BudgetPeriod, b.year, b.month ?? undefined, b.quarter ?? undefined);

  const [agg, recentExpenses] = await Promise.all([
    prisma.expense.aggregate({
      where: { category: b.category, createdAt: { gte: from, lte: to } },
      _sum:  { amount: true },
      _count: { id: true },
    }),
    prisma.expense.findMany({
      where:   { category: b.category, createdAt: { gte: from, lte: to } },
      orderBy: { createdAt: 'desc' },
      take:    10,
      select:  { id: true, amount: true, notes: true, createdAt: true, creator: { select: { name: true } } },
    }),
  ]);

  const spentAmount = parseFloat((agg._sum.amount ?? 0).toFixed(2));
  const utilisation = b.amount > 0 ? parseFloat(((spentAmount / b.amount) * 100).toFixed(1)) : 0;

  return {
    ...b,
    period: { from, to },
    spentAmount,
    remaining:    parseFloat((b.amount - spentAmount).toFixed(2)),
    expenseCount: agg._count.id,
    utilisation,
    alertLevel:   utilisation >= 100 ? 'EXCEEDED' : utilisation >= 80 ? 'WARNING' : 'OK',
    recentExpenses,
  };
};

// ── CRUD ───────────────────────────────────────────────────────────────────────
export const create = async (data: CreateBudgetInput) => {
  if (data.amount <= 0) throw new Error('INVALID_AMOUNT');
  if (data.period === 'MONTHLY'   && !data.month)   throw new Error('MONTH_REQUIRED');
  if (data.period === 'QUARTERLY' && !data.quarter) throw new Error('QUARTER_REQUIRED');

  try {
    const budget = await prisma.budget.create({ data: { ...data, month: data.month ?? null, quarter: data.quarter ?? null } });
    return budget;
  } catch (e: unknown) {
    if ((e as { code?: string }).code === 'P2002') throw new Error('BUDGET_EXISTS');
    throw e;
  }
};

export const update = async (id: number, data: Partial<CreateBudgetInput>) => {
  const existing = await prisma.budget.findUnique({ where: { id } });
  if (!existing) throw new Error('BUDGET_NOT_FOUND');
  if (data.amount !== undefined && data.amount <= 0) throw new Error('INVALID_AMOUNT');

  return prisma.budget.update({ where: { id }, data });
};

export const remove = async (id: number): Promise<void> => {
  const existing = await prisma.budget.findUnique({ where: { id } });
  if (!existing) throw new Error('BUDGET_NOT_FOUND');
  await prisma.budget.delete({ where: { id } });
};

// ── Check & alert after each new expense ─────────────────────────────────────
export const checkAndAlert = async (category: string): Promise<void> => {
  const now     = new Date();
  const year    = now.getFullYear();
  const month   = now.getMonth() + 1;
  const quarter = Math.ceil(month / 3);

  const budgets = await prisma.budget.findMany({
    where: {
      category, isActive: true, year,
      OR: [
        { period: 'MONTHLY',   month },
        { period: 'QUARTERLY', quarter },
        { period: 'ANNUAL' },
      ],
    },
  });

  for (const b of budgets) {
    const { from, to } = periodBounds(b.period as BudgetPeriod, b.year, b.month ?? undefined, b.quarter ?? undefined);
    const spent = await prisma.expense.aggregate({
      where: { category, createdAt: { gte: from, lte: to } },
      _sum:  { amount: true },
    });
    const spentAmount = spent._sum.amount ?? 0;
    const pct = b.amount > 0 ? (spentAmount / b.amount) * 100 : 0;

    if (pct >= 100) {
      void broadcastToAdmins(
        '🚨 Budget Exceeded',
        `${category} (${b.period}) — spent $${spentAmount.toFixed(2)} of $${b.amount.toFixed(2)} budget`,
        'error',
        { budgetId: b.id, category, utilisation: pct },
      );
    } else if (pct >= 80) {
      void broadcastToAdmins(
        '⚠️ Budget Warning',
        `${category} (${b.period}) — ${pct.toFixed(0)}% of budget used ($${spentAmount.toFixed(2)} / $${b.amount.toFixed(2)})`,
        'warning',
        { budgetId: b.id, category, utilisation: pct },
      );
    }
  }
};
