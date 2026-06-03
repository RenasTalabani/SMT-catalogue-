import prisma from '../../config/prisma';
import { getIO } from '../../config/socket';

export interface OpenShiftInput {
  registerId:    number;
  openingFloat?: number;
  notes?:        string;
}

export interface CloseShiftInput {
  closingFloat: number;
  notes?:       string;
}

// ── Register CRUD ─────────────────────────────────────────────────────────────
export const getRegisters = async () =>
  prisma.register.findMany({ orderBy: { name: 'asc' } });

export const createRegister = async (data: { name: string; location?: string }) => {
  const register = await prisma.register.create({ data });
  return register;
};

export const updateRegister = async (id: number, data: { name?: string; location?: string; isActive?: boolean }) => {
  const existing = await prisma.register.findUnique({ where: { id } });
  if (!existing) throw new Error('REGISTER_NOT_FOUND');
  return prisma.register.update({ where: { id }, data });
};

// ── Open a shift ──────────────────────────────────────────────────────────────
export const openShift = async (employeeId: number, input: OpenShiftInput) => {
  const register = await prisma.register.findUnique({ where: { id: input.registerId } });
  if (!register)        throw new Error('REGISTER_NOT_FOUND');
  if (!register.isActive) throw new Error('REGISTER_INACTIVE');

  const openShift = await prisma.shift.findFirst({
    where: { registerId: input.registerId, status: 'OPEN' },
  });
  if (openShift) throw new Error('REGISTER_ALREADY_OPEN');

  const shift = await prisma.shift.create({
    data: {
      registerId:   input.registerId,
      employeeId,
      openingFloat: input.openingFloat ?? 0,
      notes:        input.notes ?? null,
    },
    include: {
      register: { select: { id: true, name: true } },
      employee: { select: { id: true, name: true } },
    },
  });

  getIO()?.to('admin').emit('shift:opened', { id: shift.id, registerId: input.registerId, employeeId });
  return shift;
};

// ── Get current open shift for a register ─────────────────────────────────────
export const getCurrentShift = async (registerId: number) => {
  const shift = await prisma.shift.findFirst({
    where:   { registerId, status: 'OPEN' },
    include: {
      register: { select: { id: true, name: true } },
      employee: { select: { id: true, name: true } },
      _count:   { select: { orders: true } },
    },
  });
  return shift;
};

// ── Add order to shift ─────────────────────────────────────────────────────────
export const addOrderToShift = async (shiftId: number, orderId: number, orderAmount: number) => {
  const shift = await prisma.shift.findUnique({ where: { id: shiftId } });
  if (!shift)                throw new Error('SHIFT_NOT_FOUND');
  if (shift.status !== 'OPEN') throw new Error('SHIFT_NOT_OPEN');

  await prisma.$transaction([
    prisma.shiftOrder.upsert({
      where:  { shiftId_orderId: { shiftId, orderId } },
      create: { shiftId, orderId },
      update: {},
    }),
    prisma.shift.update({
      where: { id: shiftId },
      data: {
        totalSales:  { increment: orderAmount },
        totalOrders: { increment: 1 },
      },
    }),
  ]);
};

// ── Close a shift ─────────────────────────────────────────────────────────────
export const closeShift = async (id: number, employeeId: number, input: CloseShiftInput) => {
  const shift = await prisma.shift.findUnique({
    where:   { id },
    include: { _count: { select: { orders: true } } },
  });
  if (!shift)                    throw new Error('SHIFT_NOT_FOUND');
  if (shift.status !== 'OPEN')   throw new Error('SHIFT_NOT_OPEN');
  if (shift.employeeId !== employeeId) throw new Error('SHIFT_UNAUTHORIZED');

  // Expected cash = opening float + cash sales
  const cashOrders = await prisma.order.count({
    where: { shiftOrders: { some: { shiftId: id } }, paymentMethod: 'CASH', status: 'COMPLETED' },
  });
  const cashSales = await prisma.order.aggregate({
    where: { shiftOrders: { some: { shiftId: id } }, paymentMethod: 'CASH', status: 'COMPLETED' },
    _sum:  { finalAmount: true },
  });

  const expectedCash  = shift.openingFloat + (cashSales._sum.finalAmount ?? 0);
  const cashVariance  = parseFloat((input.closingFloat - expectedCash).toFixed(2));

  const closed = await prisma.shift.update({
    where: { id },
    data: {
      status:       'CLOSED',
      closingFloat: input.closingFloat,
      expectedCash: parseFloat(expectedCash.toFixed(2)),
      cashVariance,
      notes:        input.notes ?? shift.notes,
      closedAt:     new Date(),
    },
    include: {
      register: { select: { id: true, name: true } },
      employee: { select: { id: true, name: true } },
    },
  });

  getIO()?.to('admin').emit('shift:closed', {
    id,
    registerId:  shift.registerId,
    totalSales:  shift.totalSales,
    cashVariance,
  });

  return { ...closed, cashOrders };
};

// ── Get shifts list ────────────────────────────────────────────────────────────
export const getAll = async (params: {
  page?:       number;
  limit?:      number;
  registerId?: number;
  employeeId?: number;
  status?:     string;
} = {}) => {
  const { page = 1, limit = 20, registerId, employeeId, status } = params;
  const skip  = (page - 1) * limit;
  const where: Record<string, unknown> = {};
  if (registerId) where['registerId'] = registerId;
  if (employeeId) where['employeeId'] = employeeId;
  if (status)     where['status']     = status;

  const [shifts, total] = await Promise.all([
    prisma.shift.findMany({
      where,
      orderBy: { openedAt: 'desc' },
      skip,
      take: limit,
      include: {
        register: { select: { id: true, name: true } },
        employee: { select: { id: true, name: true } },
        _count:   { select: { orders: true } },
      },
    }),
    prisma.shift.count({ where }),
  ]);

  return { shifts, total, page, limit };
};

// ── Get full shift detail ──────────────────────────────────────────────────────
export const getById = async (id: number) => {
  const shift = await prisma.shift.findUnique({
    where: { id },
    include: {
      register: true,
      employee: { select: { id: true, name: true, email: true } },
      orders: {
        include: {
          order: {
            select: { id: true, finalAmount: true, paymentMethod: true, status: true, createdAt: true },
          },
        },
      },
    },
  });
  if (!shift) throw new Error('SHIFT_NOT_FOUND');
  return shift;
};

// ── Daily / per-register stats ─────────────────────────────────────────────────
export const getStats = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [openShifts, todayShifts, topEmployees] = await Promise.all([
    prisma.shift.count({ where: { status: 'OPEN' } }),
    prisma.shift.findMany({
      where:   { openedAt: { gte: today } },
      include: { employee: { select: { name: true } }, register: { select: { name: true } } },
    }),
    prisma.shift.groupBy({
      by:     ['employeeId'],
      where:  { status: 'CLOSED', openedAt: { gte: new Date(Date.now() - 30 * 86400_000) } },
      _sum:   { totalSales: true },
      _count: { id: true },
      orderBy: { _sum: { totalSales: 'desc' } },
      take:   5,
    }),
  ]);

  const totalRevToday = todayShifts.reduce((s, sh) => s + sh.totalSales, 0);

  return {
    openShifts,
    todayShifts,
    totalRevToday: parseFloat(totalRevToday.toFixed(2)),
    topEmployees,
  };
};
