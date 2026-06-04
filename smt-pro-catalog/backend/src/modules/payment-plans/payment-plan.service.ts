import prisma from '../../config/prisma';
import { broadcastToAdmins } from '../notifications/notification.service';

export interface CreatePlanInput {
  orderId:          number;
  installmentCount: number;
  firstDueDate?:    string;
  intervalDays?:    number;
  notes?:           string;
}

// ── Create plan for an order ───────────────────────────────────────────────────
export const create = async (input: CreatePlanInput) => {
  const order = await prisma.order.findUnique({ where: { id: input.orderId } });
  if (!order) throw new Error('ORDER_NOT_FOUND');

  const existing = await prisma.paymentPlan.findUnique({ where: { orderId: input.orderId } });
  if (existing) throw new Error('PLAN_EXISTS');

  if (input.installmentCount < 2 || input.installmentCount > 24) throw new Error('INVALID_INSTALLMENT_COUNT');

  const total       = order.finalAmount;
  const baseAmount  = parseFloat((total / input.installmentCount).toFixed(2));
  const remainder   = parseFloat((total - baseAmount * input.installmentCount).toFixed(2));
  const interval    = input.intervalDays ?? 30;
  const firstDue    = input.firstDueDate ? new Date(input.firstDueDate) : (() => {
    const d = new Date(); d.setDate(d.getDate() + interval); return d;
  })();

  const installments = Array.from({ length: input.installmentCount }, (_, i) => {
    const due = new Date(firstDue);
    due.setDate(due.getDate() + i * interval);
    const amount = i === input.installmentCount - 1
      ? parseFloat((baseAmount + remainder).toFixed(2))
      : baseAmount;
    return { number: i + 1, amount, dueDate: due };
  });

  const plan = await prisma.paymentPlan.create({
    data: {
      orderId:          input.orderId,
      totalAmount:      total,
      installmentCount: input.installmentCount,
      notes:            input.notes ?? null,
      installments:     { create: installments },
    },
    include: { installments: { orderBy: { number: 'asc' } }, order: { select: { id: true, finalAmount: true } } },
  });

  return plan;
};

// ── Get plan ──────────────────────────────────────────────────────────────────
export const getByOrder = async (orderId: number) => {
  const plan = await prisma.paymentPlan.findUnique({
    where:   { orderId },
    include: {
      installments: { orderBy: { number: 'asc' } },
      order:        { select: { id: true, finalAmount: true, customer: { select: { id: true, name: true } } } },
    },
  });
  if (!plan) throw new Error('PLAN_NOT_FOUND');
  return plan;
};

export const getById = async (id: number) => {
  const plan = await prisma.paymentPlan.findUnique({
    where:   { id },
    include: {
      installments: { orderBy: { number: 'asc' } },
      order:        { select: { id: true, finalAmount: true, customer: { select: { id: true, name: true } } } },
    },
  });
  if (!plan) throw new Error('PLAN_NOT_FOUND');
  return plan;
};

// ── Record a payment against an installment ────────────────────────────────────
export const recordPayment = async (installmentId: number, amount: number, notes?: string) => {
  if (amount <= 0) throw new Error('INVALID_AMOUNT');

  const inst = await prisma.paymentInstallment.findUnique({ where: { id: installmentId } });
  if (!inst) throw new Error('INSTALLMENT_NOT_FOUND');
  if (inst.status === 'PAID') throw new Error('ALREADY_PAID');

  const newPaid   = parseFloat((inst.paidAmount + amount).toFixed(2));
  const newStatus = newPaid >= inst.amount ? 'PAID' : 'PARTIAL';

  const [updated] = await prisma.$transaction([
    prisma.paymentInstallment.update({
      where: { id: installmentId },
      data: {
        paidAmount: newPaid,
        status:     newStatus,
        paidAt:     newStatus === 'PAID' ? new Date() : inst.paidAt,
        notes:      notes ?? inst.notes,
      },
    }),
    prisma.paymentPlan.update({
      where: { id: inst.planId },
      data:  { paidAmount: { increment: amount } },
    }),
  ]);

  // Recalculate plan status
  const allInst = await prisma.paymentInstallment.findMany({ where: { planId: inst.planId } });
  const allPaid = allInst.every((i) => i.id === installmentId ? newStatus === 'PAID' : i.status === 'PAID');
  if (allPaid) {
    await prisma.paymentPlan.update({ where: { id: inst.planId }, data: { status: 'COMPLETED' } });
  }

  return updated;
};

// ── Mark overdue installments ─────────────────────────────────────────────────
export const markOverdue = async (): Promise<number> => {
  const result = await prisma.paymentInstallment.updateMany({
    where:  { status: { in: ['PENDING', 'PARTIAL'] }, dueDate: { lt: new Date() } },
    data:   { status: 'OVERDUE' },
  });

  if (result.count > 0) {
    void broadcastToAdmins(
      '⚠️ Overdue Installments',
      `${result.count} payment installment${result.count > 1 ? 's are' : ' is'} now overdue`,
      'warning',
      { count: result.count },
    );
  }

  return result.count;
};

// ── List all plans ────────────────────────────────────────────────────────────
export const getAll = async (params: { page?: number; limit?: number; status?: string } = {}) => {
  const { page = 1, limit = 20, status } = params;
  const skip  = (page - 1) * limit;
  const where = status ? { status } : {};

  const [plans, total] = await Promise.all([
    prisma.paymentPlan.findMany({
      where, orderBy: { createdAt: 'desc' }, skip, take: limit,
      include: {
        _count: { select: { installments: true } },
        order:  { select: { id: true, finalAmount: true, customer: { select: { name: true } } } },
        installments: {
          where:   { status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] } },
          orderBy: { dueDate: 'asc' },
          take:    1,
        },
      },
    }),
    prisma.paymentPlan.count({ where }),
  ]);

  return { plans, total, page, limit };
};

// ── Stats ─────────────────────────────────────────────────────────────────────
export const getStats = async () => {
  const [byStatus, overdue, totalCollected] = await Promise.all([
    prisma.paymentPlan.groupBy({ by: ['status'], _count: { id: true }, _sum: { totalAmount: true, paidAmount: true } }),
    prisma.paymentInstallment.count({ where: { status: 'OVERDUE' } }),
    prisma.paymentPlan.aggregate({ _sum: { paidAmount: true } }),
  ]);

  return {
    byStatus: byStatus.map((s) => ({
      status:      s.status,
      count:       s._count.id,
      total:       parseFloat((s._sum.totalAmount ?? 0).toFixed(2)),
      collected:   parseFloat((s._sum.paidAmount  ?? 0).toFixed(2)),
    })),
    overdueInstallments:  overdue,
    totalCollected: parseFloat((totalCollected._sum.paidAmount ?? 0).toFixed(2)),
  };
};
