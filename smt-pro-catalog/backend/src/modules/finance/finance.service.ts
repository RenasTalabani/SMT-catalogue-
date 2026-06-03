import prisma from '../../config/prisma';
import { checkAndAlert } from '../budgets/budget.service';

const EXPENSE_SELECT = {
  id: true, amount: true, category: true, notes: true, createdAt: true,
  creator: { select: { id: true, name: true } },
} as const;

const INCOME_SELECT = {
  id: true, amount: true, source: true, notes: true, createdAt: true,
  creator: { select: { id: true, name: true } },
} as const;

interface PaginatedQuery { page?: string | number; limit?: string | number; }

export const getExpenses = async ({ category, page = 1, limit = 20 }: PaginatedQuery & { category?: string } = {}) => {
  const where: Record<string, unknown> = {};
  if (category) where['category'] = category;
  const skip = (parseInt(String(page)) - 1) * parseInt(String(limit));
  const take = parseInt(String(limit));
  const [expenses, total] = await Promise.all([
    prisma.expense.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take, select: EXPENSE_SELECT }),
    prisma.expense.count({ where }),
  ]);
  return { expenses, total, page: parseInt(String(page)), limit: take };
};

export const createExpense = async (createdBy: number, { amount, category, notes }: { amount: number; category: string; notes?: string }) => {
  const expense = await prisma.expense.create({
    data: { amount, category, notes: notes ?? null, createdBy },
    select: EXPENSE_SELECT,
  });
  void checkAndAlert(category);
  return expense;
};

export const deleteExpense = async (id: string | number): Promise<void> => {
  const existing = await prisma.expense.findUnique({ where: { id: parseInt(String(id)) } });
  if (!existing) throw new Error('EXPENSE_NOT_FOUND');
  await prisma.expense.delete({ where: { id: parseInt(String(id)) } });
};

export const getIncomes = async ({ source, page = 1, limit = 20 }: PaginatedQuery & { source?: string } = {}) => {
  const where: Record<string, unknown> = {};
  if (source) where['source'] = source;
  const skip = (parseInt(String(page)) - 1) * parseInt(String(limit));
  const take = parseInt(String(limit));
  const [incomes, total] = await Promise.all([
    prisma.income.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take, select: INCOME_SELECT }),
    prisma.income.count({ where }),
  ]);
  return { incomes, total, page: parseInt(String(page)), limit: take };
};

export const createIncome = async (createdBy: number, { amount, source, notes }: { amount: number; source: string; notes?: string }) =>
  prisma.income.create({
    data: { amount, source, notes: notes ?? null, createdBy },
    select: INCOME_SELECT,
  });

export const deleteIncome = async (id: string | number): Promise<void> => {
  const existing = await prisma.income.findUnique({ where: { id: parseInt(String(id)) } });
  if (!existing) throw new Error('INCOME_NOT_FOUND');
  await prisma.income.delete({ where: { id: parseInt(String(id)) } });
};

export const getSummary = async () => {
  const [expenseAgg, incomeAgg, orderAgg, expenses, incomes] = await Promise.all([
    prisma.expense.aggregate({ _sum: { amount: true } }),
    prisma.income.aggregate({ _sum: { amount: true } }),
    prisma.order.aggregate({ where: { status: 'COMPLETED' }, _sum: { totalAmount: true } }),
    prisma.expense.findMany({ orderBy: { createdAt: 'desc' }, take: 20, select: { id: true, amount: true, category: true, createdAt: true } }),
    prisma.income.findMany({ orderBy: { createdAt: 'desc' }, take: 20, select: { id: true, amount: true, source: true, createdAt: true } }),
  ]);
  const totalExpenses = expenseAgg._sum.amount    ?? 0;
  const totalIncome   = (incomeAgg._sum.amount ?? 0) + (orderAgg._sum.totalAmount ?? 0);
  return {
    totalIncome:   parseFloat(totalIncome.toFixed(2)),
    totalExpenses: parseFloat(totalExpenses.toFixed(2)),
    netProfit:     parseFloat((totalIncome - totalExpenses).toFixed(2)),
    expenses,
    incomes,
  };
};

export const getProfitLoss = async ({ from, to }: { from?: string; to?: string } = {}) => {
  const where: Record<string, unknown> = {};
  if (from || to) {
    const createdAt: Record<string, Date> = {};
    if (from) createdAt['gte'] = new Date(from);
    if (to)   createdAt['lte'] = new Date(to);
    where['createdAt'] = createdAt;
  }

  const [expenseAgg, incomeAgg, orderAgg] = await Promise.all([
    prisma.expense.aggregate({ where, _sum: { amount: true } }),
    prisma.income.aggregate({ where, _sum: { amount: true } }),
    prisma.order.aggregate({ where: { ...where, status: 'COMPLETED' }, _sum: { totalAmount: true } }),
  ]);

  const totalExpenses = expenseAgg._sum.amount    ?? 0;
  const manualIncome  = incomeAgg._sum.amount     ?? 0;
  const salesIncome   = orderAgg._sum.totalAmount ?? 0;
  const totalIncome   = parseFloat((manualIncome + salesIncome).toFixed(2));
  const netProfit     = parseFloat((totalIncome - totalExpenses).toFixed(2));

  return {
    totalIncome,
    salesIncome:   parseFloat(salesIncome.toFixed(2)),
    manualIncome:  parseFloat(manualIncome.toFixed(2)),
    totalExpenses: parseFloat(totalExpenses.toFixed(2)),
    netProfit,
    profitMargin:  totalIncome > 0 ? parseFloat(((netProfit / totalIncome) * 100).toFixed(2)) : 0,
  };
};
