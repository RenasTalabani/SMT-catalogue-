import prisma from '../../config/prisma';
import { broadcastToAdmins } from '../notifications/notification.service';

const LARGE_DEBT_THRESHOLD = 5000;

// ── Get or create credit account ──────────────────────────────────────────────
export const getOrCreate = async (customerId: number) => {
  const customer = await prisma.customer.findFirst({ where: { id: customerId, deletedAt: null } });
  if (!customer) throw new Error('CUSTOMER_NOT_FOUND');
  return prisma.creditAccount.upsert({
    where:  { customerId },
    create: { customerId },
    update: {},
    include: { customer: { select: { id: true, name: true, email: true, phone: true } } },
  });
};

// ── Get account detail with payment history ────────────────────────────────────
export const getAccount = async (customerId: number) => {
  const account = await prisma.creditAccount.findUnique({
    where:   { customerId },
    include: {
      customer: { select: { id: true, name: true, email: true, phone: true } },
      payments: {
        orderBy: { createdAt: 'desc' },
        take:    10,
        include: {
          order:          { select: { id: true, finalAmount: true } },
          recordedByUser: { select: { id: true, name: true } },
        },
      },
    },
  });
  if (!account) throw new Error('ACCOUNT_NOT_FOUND');

  // Fetch outstanding orders
  const outstandingOrders = await prisma.order.findMany({
    where:   { customerId, paymentStatus: { in: ['UNPAID', 'PARTIAL', 'OVERDUE'] } },
    orderBy: { createdAt: 'desc' },
    select:  { id: true, finalAmount: true, paidAmount: true, remainingAmount: true, paymentStatus: true, createdAt: true },
  });

  return { ...account, outstandingOrders };
};

// ── Set credit limit ───────────────────────────────────────────────────────────
export const setCreditLimit = async (customerId: number, creditLimit: number, notes?: string) => {
  if (creditLimit < 0) throw new Error('INVALID_LIMIT');
  const account = await getOrCreate(customerId);
  return prisma.creditAccount.update({
    where: { id: account.id },
    data:  { creditLimit, notes: notes ?? account.notes },
  });
};

// ── Add debt when an order is created on credit ───────────────────────────────
export const addDebt = async (orderId: number, customerId: number, amount: number, employeeId: number) => {
  const account = await getOrCreate(customerId);

  if (account.creditLimit > 0 && account.balance + amount > account.creditLimit) {
    throw new Error('CREDIT_LIMIT_EXCEEDED');
  }

  const newBalance = parseFloat((account.balance + amount).toFixed(2));

  await prisma.$transaction([
    prisma.creditAccount.update({
      where: { id: account.id },
      data: {
        balance:   newBalance,
        totalDebt: { increment: amount },
      },
    }),
    prisma.order.update({
      where: { id: orderId },
      data: {
        paymentStatus:   'UNPAID',
        remainingAmount: amount,
        paidAmount:      0,
      },
    }),
  ]);

  if (newBalance >= LARGE_DEBT_THRESHOLD) {
    void broadcastToAdmins(
      '⚠️ Large Debt Alert',
      `Customer #${customerId} debt reached $${newBalance.toFixed(2)}`,
      'warning',
      { customerId, balance: newBalance, orderId },
    );
  }

  return getAccount(customerId);
};

// ── Record a payment ───────────────────────────────────────────────────────────
export const recordPayment = async (
  customerId:  number,
  recordedBy:  number,
  amount:      number,
  opts?: {
    orderId?:   number;
    method?:    string;
    reference?: string;
    notes?:     string;
  },
) => {
  if (amount <= 0) throw new Error('INVALID_AMOUNT');

  const account = await prisma.creditAccount.findUnique({ where: { customerId } });
  if (!account) throw new Error('ACCOUNT_NOT_FOUND');
  if (account.balance <= 0) throw new Error('NO_OUTSTANDING_BALANCE');
  if (amount > account.balance) throw new Error('PAYMENT_EXCEEDS_BALANCE');

  const newBalance = parseFloat((account.balance - amount).toFixed(2));

  await prisma.$transaction(async (tx) => {
    await tx.creditPayment.create({
      data: {
        accountId:  account.id,
        orderId:    opts?.orderId ?? null,
        amount,
        method:     opts?.method    ?? 'CASH',
        reference:  opts?.reference ?? null,
        notes:      opts?.notes     ?? null,
        recordedBy,
      },
    });

    await tx.creditAccount.update({
      where: { id: account.id },
      data: {
        balance:   newBalance,
        totalPaid: { increment: amount },
      },
    });

    // Update specific order if provided
    if (opts?.orderId) {
      const order = await tx.order.findUnique({ where: { id: opts.orderId }, select: { paidAmount: true, finalAmount: true } });
      if (order) {
        const newPaid      = parseFloat((order.paidAmount + amount).toFixed(2));
        const newRemaining = parseFloat((order.finalAmount - newPaid).toFixed(2));
        const newStatus    = newRemaining <= 0 ? 'PAID' : 'PARTIAL';
        await tx.order.update({
          where: { id: opts.orderId },
          data: {
            paidAmount:      newPaid,
            remainingAmount: Math.max(0, newRemaining),
            paymentStatus:   newStatus,
          },
        });
      }
    }
  });

  void broadcastToAdmins(
    '💰 Debt Payment Received',
    `Customer #${customerId} paid $${amount.toFixed(2)} — remaining balance: $${newBalance.toFixed(2)}`,
    'info',
    { customerId, amount, newBalance },
  );

  return getAccount(customerId);
};

// ── Mark overdue orders ────────────────────────────────────────────────────────
export const markOverdue = async (daysThreshold = 30): Promise<number> => {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysThreshold);

  const result = await prisma.order.updateMany({
    where: {
      paymentStatus: { in: ['UNPAID', 'PARTIAL'] },
      createdAt:     { lte: cutoff },
    },
    data: { paymentStatus: 'OVERDUE' },
  });

  if (result.count > 0) {
    void broadcastToAdmins(
      '🚨 Overdue Debt Alert',
      `${result.count} order${result.count > 1 ? 's have' : ' has'} become overdue (>${daysThreshold} days unpaid)`,
      'error',
      { count: result.count, daysThreshold },
    );
  }

  return result.count;
};

// ── Suspend / reactivate account ──────────────────────────────────────────────
export const setAccountStatus = async (customerId: number, status: 'ACTIVE' | 'SUSPENDED' | 'CLOSED') => {
  const account = await prisma.creditAccount.findUnique({ where: { customerId } });
  if (!account) throw new Error('ACCOUNT_NOT_FOUND');
  return prisma.creditAccount.update({ where: { id: account.id }, data: { status } });
};

// ── Debt dashboard ────────────────────────────────────────────────────────────
export const getDashboard = async () => {
  const [totals, byStatus, topDebtors, overdueOrders] = await Promise.all([
    prisma.creditAccount.aggregate({
      _sum:   { balance: true, totalDebt: true, totalPaid: true },
      _count: { id: true },
    }),
    prisma.creditAccount.groupBy({ by: ['status'], _count: { id: true }, _sum: { balance: true } }),
    prisma.creditAccount.findMany({
      where:   { balance: { gt: 0 } },
      orderBy: { balance: 'desc' },
      take:    10,
      include: { customer: { select: { id: true, name: true, phone: true } } },
    }),
    prisma.order.count({ where: { paymentStatus: 'OVERDUE' } }),
  ]);

  return {
    totalAccounts:    totals._count.id,
    totalOutstanding: parseFloat((totals._sum.balance  ?? 0).toFixed(2)),
    totalDebtEver:    parseFloat((totals._sum.totalDebt ?? 0).toFixed(2)),
    totalPaidEver:    parseFloat((totals._sum.totalPaid ?? 0).toFixed(2)),
    byStatus:         byStatus.map((s) => ({ status: s.status, count: s._count.id, balance: parseFloat((s._sum.balance ?? 0).toFixed(2)) })),
    topDebtors,
    overdueOrders,
  };
};

// ── Payment history for a customer ────────────────────────────────────────────
export const getPaymentHistory = async (customerId: number, page = 1, limit = 20) => {
  const account = await prisma.creditAccount.findUnique({ where: { customerId } });
  if (!account) throw new Error('ACCOUNT_NOT_FOUND');

  const skip = (page - 1) * limit;
  const [payments, total] = await Promise.all([
    prisma.creditPayment.findMany({
      where:   { accountId: account.id },
      orderBy: { createdAt: 'desc' },
      skip, take: limit,
      include: {
        order:          { select: { id: true, finalAmount: true } },
        recordedByUser: { select: { id: true, name: true } },
      },
    }),
    prisma.creditPayment.count({ where: { accountId: account.id } }),
  ]);

  return { payments, total, page, limit, account };
};
