import prisma from '../../config/prisma';
import bcrypt  from 'bcryptjs';
import { broadcastToAdmins } from '../notifications/notification.service';

// ── Discount tier thresholds ──────────────────────────────────────────────────
export const DISCOUNT_TIERS = {
  EMPLOYEE_MAX:  5,    // 0–5%: employee can apply freely
  MANAGER_MAX:  10,    // 5–10%: needs manager/admin approval
  // above 10%: needs super_admin approval
};

// ── Record login attempt ───────────────────────────────────────────────────────
export const recordLogin = async (
  userId:    number,
  success:   boolean,
  ipAddress?: string,
  userAgent?: string,
  failReason?: string,
) => {
  await prisma.employeeLoginHistory.create({
    data: { userId, success, ipAddress: ipAddress ?? null, userAgent: userAgent ?? null, failReason: failReason ?? null },
  });
};

// ── Get all employees ──────────────────────────────────────────────────────────
export const getAll = async (params: { page?: number; limit?: number; role?: string; isActive?: boolean } = {}) => {
  const { page = 1, limit = 20, role, isActive } = params;
  const skip  = (page - 1) * limit;
  const where: Record<string, unknown> = {};
  if (role !== undefined)     where['role']     = role;
  if (isActive !== undefined) where['isActive'] = isActive;

  const [employees, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip, take: limit,
      select: {
        id: true, name: true, email: true, role: true, isActive: true,
        lastLoginAt: true, createdAt: true,
        _count: { select: { orders: true, auditLogs: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return { employees, total, page, limit };
};

// ── Get employee detail + stats ────────────────────────────────────────────────
export const getDetail = async (id: number) => {
  const user = await prisma.user.findUnique({
    where:  { id },
    select: { id: true, name: true, email: true, role: true, isActive: true, lastLoginAt: true, createdAt: true },
  });
  if (!user) throw new Error('EMPLOYEE_NOT_FOUND');

  const now    = new Date();
  const month  = new Date(now.getFullYear(), now.getMonth(), 1);

  const [salesThisMonth, totalSales, loginHistory, discountRequests] = await Promise.all([
    prisma.order.aggregate({
      where:  { userId: id, createdAt: { gte: month }, status: 'COMPLETED' },
      _sum:   { finalAmount: true },
      _count: { id: true },
    }),
    prisma.order.aggregate({
      where:  { userId: id, status: 'COMPLETED' },
      _sum:   { finalAmount: true },
      _count: { id: true },
    }),
    prisma.employeeLoginHistory.findMany({
      where:   { userId: id },
      orderBy: { createdAt: 'desc' },
      take:    10,
    }),
    prisma.discountRequest.findMany({
      where:   { requestedBy: id },
      orderBy: { createdAt: 'desc' },
      take:    10,
      include: { reviewer: { select: { id: true, name: true } } },
    }),
  ]);

  return {
    ...user,
    stats: {
      salesThisMonth:       salesThisMonth._count.id,
      revenueThisMonth:     parseFloat((salesThisMonth._sum.finalAmount ?? 0).toFixed(2)),
      totalSalesAllTime:    totalSales._count.id,
      totalRevenueAllTime:  parseFloat((totalSales._sum.finalAmount ?? 0).toFixed(2)),
    },
    loginHistory,
    discountRequests,
  };
};

// ── Create employee ────────────────────────────────────────────────────────────
export const create = async (data: { name: string; email: string; password: string; role?: string }) => {
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) throw new Error('EMAIL_TAKEN');

  const hashed = await bcrypt.hash(data.password, 12);
  return prisma.user.create({
    data: {
      name:     data.name,
      email:    data.email,
      password: hashed,
      role:     data.role ?? 'employee',
    },
    select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
  });
};

// ── Activate / deactivate ──────────────────────────────────────────────────────
export const setActive = async (id: number, isActive: boolean) => {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new Error('EMPLOYEE_NOT_FOUND');
  return prisma.user.update({ where: { id }, data: { isActive }, select: { id: true, name: true, isActive: true } });
};

// ── Reset password ─────────────────────────────────────────────────────────────
export const resetPassword = async (id: number, newPassword: string) => {
  if (newPassword.length < 6) throw new Error('PASSWORD_TOO_SHORT');
  const hashed = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id }, data: { password: hashed } });
};

// ── Update role ────────────────────────────────────────────────────────────────
export const updateRole = async (id: number, role: string) => {
  const valid = ['super_admin', 'admin', 'employee'];
  if (!valid.includes(role)) throw new Error('INVALID_ROLE');
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new Error('EMPLOYEE_NOT_FOUND');
  return prisma.user.update({ where: { id }, data: { role }, select: { id: true, name: true, role: true } });
};

// ── Delete employee (soft-safe: only if no orders) ────────────────────────────
export const remove = async (id: number): Promise<void> => {
  const user = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true } });
  if (!user) throw new Error('EMPLOYEE_NOT_FOUND');
  if (user.role === 'super_admin') throw new Error('CANNOT_DELETE_SUPER_ADMIN');
  const orderCount = await prisma.order.count({ where: { userId: id } });
  if (orderCount > 0) throw new Error('EMPLOYEE_HAS_ORDERS');
  await prisma.user.delete({ where: { id } });
};

// ── Discount requests ──────────────────────────────────────────────────────────
export const requestDiscount = async (
  requestedBy: number,
  percentage:  number,
  reason:      string,
  orderId?:    number,
) => {
  if (percentage <= 0) throw new Error('INVALID_PERCENTAGE');

  const requester = await prisma.user.findUnique({ where: { id: requestedBy }, select: { role: true } });
  if (!requester) throw new Error('EMPLOYEE_NOT_FOUND');

  // Employees can self-approve up to EMPLOYEE_MAX
  const autoApprove = requester.role !== 'employee' || percentage <= DISCOUNT_TIERS.EMPLOYEE_MAX;
  const status = autoApprove ? 'APPROVED' : 'PENDING';

  const req = await prisma.discountRequest.create({
    data: {
      requestedBy,
      orderId:    orderId ?? null,
      percentage,
      reason,
      status,
      approvedBy: autoApprove ? requestedBy : null,
    },
    include: { requester: { select: { id: true, name: true } } },
  });

  if (!autoApprove) {
    const notifyRole = percentage <= DISCOUNT_TIERS.MANAGER_MAX ? 'admin' : 'super_admin';
    void broadcastToAdmins(
      '🏷️ Discount Approval Required',
      `${req.requester.name} requests ${percentage}% discount — ${reason}`,
      'warning',
      { requestId: req.id, percentage, requestedBy, orderId },
    );
  }

  return req;
};

export const reviewDiscount = async (id: number, reviewerId: number, approved: boolean, reviewNote?: string) => {
  const req = await prisma.discountRequest.findUnique({ where: { id } });
  if (!req) throw new Error('DISCOUNT_REQUEST_NOT_FOUND');
  if (req.status !== 'PENDING') throw new Error('REQUEST_ALREADY_REVIEWED');

  return prisma.discountRequest.update({
    where: { id },
    data: {
      status:     approved ? 'APPROVED' : 'REJECTED',
      approvedBy: reviewerId,
      reviewNote: reviewNote ?? null,
    },
    include: {
      requester: { select: { id: true, name: true } },
      reviewer:  { select: { id: true, name: true } },
    },
  });
};

export const getPendingDiscounts = async () =>
  prisma.discountRequest.findMany({
    where:   { status: 'PENDING' },
    orderBy: { createdAt: 'asc' },
    include: { requester: { select: { id: true, name: true, role: true } } },
  });

// ── Employee performance summary ──────────────────────────────────────────────
export const getPerformanceSummary = async (from?: Date, to?: Date) => {
  const now  = new Date();
  const start = from ?? new Date(now.getFullYear(), now.getMonth(), 1);
  const end   = to   ?? now;

  const salesByEmployee = await prisma.order.groupBy({
    by:     ['userId'],
    where:  { createdAt: { gte: start, lte: end }, status: 'COMPLETED' },
    _sum:   { finalAmount: true },
    _count: { id: true },
    orderBy: { _sum: { finalAmount: 'desc' } },
  });

  const userIds = salesByEmployee.map((s) => s.userId);
  const users   = await prisma.user.findMany({
    where:  { id: { in: userIds } },
    select: { id: true, name: true, role: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));

  return {
    period: { from: start, to: end },
    employees: salesByEmployee.map((s) => ({
      employee:    userMap.get(s.userId) ?? { id: s.userId, name: 'Unknown', role: 'employee' },
      orders:      s._count.id,
      revenue:     parseFloat((s._sum.finalAmount ?? 0).toFixed(2)),
    })),
  };
};
