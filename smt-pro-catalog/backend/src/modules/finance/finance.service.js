const prisma = require('../../config/prisma');

// ─── Expenses ─────────────────────────────────────────────────────────────────

const getExpenses = async ({ category, page = 1, limit = 20 } = {}) => {
  const where = {};
  if (category) where.category = category;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);
  const [expenses, total] = await Promise.all([
    prisma.expense.findMany({
      where, orderBy: { createdAt: 'desc' }, skip, take,
      select: {
        id: true, amount: true, category: true, notes: true, createdAt: true,
        creator: { select: { id: true, name: true } },
      },
    }),
    prisma.expense.count({ where }),
  ]);
  return { expenses, total, page: parseInt(page), limit: take };
};

const createExpense = async (createdBy, { amount, category, notes }) => {
  return prisma.expense.create({
    data: { amount, category, notes: notes ?? null, createdBy },
    select: {
      id: true, amount: true, category: true, notes: true, createdAt: true,
      creator: { select: { id: true, name: true } },
    },
  });
};

const deleteExpense = async (id) => {
  const existing = await prisma.expense.findUnique({ where: { id: parseInt(id) } });
  if (!existing) throw new Error('EXPENSE_NOT_FOUND');
  await prisma.expense.delete({ where: { id: parseInt(id) } });
};

// ─── Incomes ──────────────────────────────────────────────────────────────────

const getIncomes = async ({ source, page = 1, limit = 20 } = {}) => {
  const where = {};
  if (source) where.source = source;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);
  const [incomes, total] = await Promise.all([
    prisma.income.findMany({
      where, orderBy: { createdAt: 'desc' }, skip, take,
      select: {
        id: true, amount: true, source: true, notes: true, createdAt: true,
        creator: { select: { id: true, name: true } },
      },
    }),
    prisma.income.count({ where }),
  ]);
  return { incomes, total, page: parseInt(page), limit: take };
};

const createIncome = async (createdBy, { amount, source, notes }) => {
  return prisma.income.create({
    data: { amount, source, notes: notes ?? null, createdBy },
    select: {
      id: true, amount: true, source: true, notes: true, createdAt: true,
      creator: { select: { id: true, name: true } },
    },
  });
};

const deleteIncome = async (id) => {
  const existing = await prisma.income.findUnique({ where: { id: parseInt(id) } });
  if (!existing) throw new Error('INCOME_NOT_FOUND');
  await prisma.income.delete({ where: { id: parseInt(id) } });
};

// ─── P&L Summary ──────────────────────────────────────────────────────────────

const getProfitLoss = async ({ from, to } = {}) => {
  const where = {};
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from);
    if (to)   where.createdAt.lte = new Date(to);
  }

  const [expenseAgg, incomeAgg, orderAgg] = await Promise.all([
    prisma.expense.aggregate({ where, _sum: { amount: true } }),
    prisma.income.aggregate({ where, _sum: { amount: true } }),
    prisma.order.aggregate({
      where: { ...where, status: 'COMPLETED' },
      _sum: { totalAmount: true },
    }),
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

module.exports = {
  getExpenses, createExpense, deleteExpense,
  getIncomes, createIncome, deleteIncome,
  getProfitLoss,
};
