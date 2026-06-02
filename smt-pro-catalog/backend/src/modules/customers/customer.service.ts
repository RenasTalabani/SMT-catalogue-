import prisma from '../../config/prisma';

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
  const skip  = (page - 1) * limit;
  const where = search ? {
    OR: [
      { name:  { contains: search, mode: 'insensitive' as const } },
      { phone: { contains: search, mode: 'insensitive' as const } },
      { email: { contains: search, mode: 'insensitive' as const } },
    ],
  } : {};

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({ where, select: SELECT, orderBy: { createdAt: 'desc' }, skip, take: limit }),
    prisma.customer.count({ where }),
  ]);

  return { customers, total, page, limit };
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
  return prisma.customer.create({ data, select: SELECT });
};

export const update = async (id: number, data: {
  name?: string; phone?: string; email?: string; address?: string; notes?: string;
}): Promise<CustomerItem> => {
  if (data.email) {
    const existing = await prisma.customer.findUnique({ where: { email: data.email } });
    if (existing && existing.id !== id) throw new Error('EMAIL_TAKEN');
  }
  return prisma.customer.update({ where: { id }, data, select: SELECT });
};

export const remove = async (id: number): Promise<void> => {
  // Detach orders before deleting
  await prisma.order.updateMany({ where: { customerId: id }, data: { customerId: null } });
  await prisma.customer.delete({ where: { id } });
};
