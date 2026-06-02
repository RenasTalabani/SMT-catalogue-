import bcrypt from 'bcryptjs';
import prisma from '../../config/prisma';
import { UserRole } from '../../types';

export interface UserItem {
  id:          number;
  name:        string;
  email:       string;
  role:        string;
  isActive:    boolean;
  lastLoginAt: Date | null;
  createdAt:   Date;
}

const SELECT = {
  id: true, name: true, email: true, role: true,
  isActive: true, lastLoginAt: true, createdAt: true,
} as const;

export const getAll = async (
  page = 1, limit = 20, search?: string,
): Promise<{ users: UserItem[]; total: number; page: number; limit: number }> => {
  const skip  = (page - 1) * limit;
  const where = search
    ? { OR: [
        { name:  { contains: search, mode: 'insensitive' as const } },
        { email: { contains: search, mode: 'insensitive' as const } },
      ] }
    : {};

  const [users, total] = await Promise.all([
    prisma.user.findMany({ where, select: SELECT, orderBy: { createdAt: 'desc' }, skip, take: limit }),
    prisma.user.count({ where }),
  ]);

  return { users, total, page, limit };
};

export const getById = async (id: number): Promise<UserItem | null> =>
  prisma.user.findUnique({ where: { id }, select: SELECT });

export const createUser = async (
  name: string, email: string, password: string, role: UserRole = 'employee',
): Promise<UserItem> => {
  if (await prisma.user.findUnique({ where: { email } })) throw new Error('EMAIL_TAKEN');
  const hashed = await bcrypt.hash(password, 12);
  return prisma.user.create({ data: { name, email, password: hashed, role }, select: SELECT });
};

export const updateUser = async (
  id: number, data: { name?: string; email?: string },
): Promise<UserItem> => {
  if (data.email) {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing && existing.id !== id) throw new Error('EMAIL_TAKEN');
  }
  return prisma.user.update({ where: { id }, data, select: SELECT });
};

export const updateRole = async (id: number, role: UserRole): Promise<UserItem> =>
  prisma.user.update({ where: { id }, data: { role }, select: SELECT });

export const toggleActive = async (id: number, isActive: boolean): Promise<UserItem> =>
  prisma.user.update({ where: { id }, data: { isActive }, select: SELECT });

export const deleteUser = async (id: number): Promise<void> => {
  await prisma.user.delete({ where: { id } });
};

export const resetPassword = async (id: number, newPassword: string): Promise<void> => {
  if (newPassword.length < 8) throw new Error('PASSWORD_TOO_SHORT');
  const hashed = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id }, data: { password: hashed } });
};

export const getRoleCounts = async (): Promise<Record<string, number>> => {
  const rows = await prisma.user.groupBy({ by: ['role'], _count: { role: true } });
  return Object.fromEntries(rows.map((r) => [r.role, r._count.role]));
};
