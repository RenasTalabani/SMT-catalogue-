import prisma from '../../config/prisma';
import { get, set, invalidate } from '../../shared/utils/cache.util';

const CACHE_TTL = 120; // 2 minutes

export interface CustomerItem {
  id:        number;
  name:      string;
  phone:     string | null;
  email:     string | null;
  address:   string | null;
  notes:     string | null;
  createdAt: Date;
  updatedAt: Date;
}

const SELECT = {
  id: true, name: true, phone: true, email: true,
  address: true, notes: true, createdAt: true, updatedAt: true,
} as const;

export const getAll = async (
  page = 1, limit = 20, search?: string,
): Promise<{ customers: CustomerItem[]; total: number; page: number; limit: number }> => {
  const cacheKey = `customers:list:${String(search)}:${page}:${limit}`;
  const cached   = await get<{ customers: CustomerItem[]; total: number; page: number; limit: number }>(cacheKey);
  if (cached) return cached;

  const skip  = (page - 1) * limit;
    const baseWhere = { deletedAt: null };
  const where = search ? {
    ...baseWhere,
    OR: [
      { name:  { contains: search, mode: 'insensitive' as const } },
      { phone: { contains: search, mode: 'insensitive' as const } },
      { email: { contains: search, mode: 'insensitive' as const } },
    ],
  } : baseWhere;

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({ where, select: SELECT, orderBy: { createdAt: 'desc' }, skip, take: limit }),
    prisma.customer.count({ where }),
  ]);

  const result = { customers, total, page, limit };
  await set(cacheKey, result, CACHE_TTL);
  return result;
};

export const getById = async (id: number) =>
  prisma.customer.findUnique({ where: { id }, select: SELECT });

export const getStats = async (id: number) => {
  const [orderCount, totalSpent, recentOrders] = await Promise.all([
    prisma.order.count({ where: { customerId: id } }),
    prisma.order.aggregate({
      where: { customerId: id, status: 'COMPLETED' },
      _sum:  { finalAmount: true },
    }),
    prisma.order.findMany({
      where:   { customerId: id },
      orderBy: { createdAt: 'desc' },
      take:    5,
      select:  { id: true, finalAmount: true, status: true, paymentMethod: true, createdAt: true },
    }),
  ]);

  return {
    orderCount,
    totalSpent:   parseFloat((totalSpent._sum.finalAmount ?? 0).toFixed(2)),
    recentOrders,
  };
};

export const create = async (data: {
  name: string; phone?: string; email?: string; address?: string; notes?: string;
}): Promise<CustomerItem> => {
  if (data.email) {
    const existing = await prisma.customer.findUnique({ where: { email: data.email } });
    if (existing) throw new Error('EMAIL_TAKEN');
  }
  const customer = await prisma.customer.create({ data, select: SELECT });
  await invalidate('customers:');
  return customer;
};

export const update = async (id: number, data: {
  name?: string; phone?: string; email?: string; address?: string; notes?: string;
}): Promise<CustomerItem> => {
  if (data.email) {
    const existing = await prisma.customer.findUnique({ where: { email: data.email } });
    if (existing && existing.id !== id) throw new Error('EMAIL_TAKEN');
  }
  const customer = await prisma.customer.update({ where: { id }, data, select: SELECT });
  await invalidate('customers:');
  return customer;
};

export const remove = async (id: number): Promise<void> => {
  const existing = await prisma.customer.findUnique({ where: { id } });
  if (!existing) throw new Error('CUSTOMER_NOT_FOUND');
  await prisma.customer.update({ where: { id }, data: { deletedAt: new Date() } });
  await invalidate('customers:');
};

export const restore = async (id: number): Promise<CustomerItem> => {
  const existing = await prisma.customer.findUnique({ where: { id } });
  if (!existing) throw new Error('CUSTOMER_NOT_FOUND');
  if (!existing.deletedAt) throw new Error('CUSTOMER_NOT_DELETED');
  const customer = await prisma.customer.update({ where: { id }, data: { deletedAt: null }, select: SELECT });
  await invalidate('customers:');
  return customer;
};

export const getDeleted = async (
  page = 1, limit = 20,
): Promise<{ customers: CustomerItem[]; total: number; page: number; limit: number }> => {
  const skip  = (page - 1) * limit;
  const where = { deletedAt: { not: null as null } };
  const [customers, total] = await Promise.all([
    prisma.customer.findMany({ where, select: SELECT, orderBy: { createdAt: 'desc' }, skip, take: limit }),
    prisma.customer.count({ where }),
  ]);
  return { customers, total, page, limit };
};

export const permanentDelete = async (id: number): Promise<void> => {
  const existing = await prisma.customer.findUnique({ where: { id } });
  if (!existing) throw new Error('CUSTOMER_NOT_FOUND');
  await prisma.order.updateMany({ where: { customerId: id }, data: { customerId: null } });
  await prisma.customer.delete({ where: { id } });
  await invalidate('customers:');
};
