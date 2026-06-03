import prisma from '../../config/prisma';
import { getIO } from '../../config/socket';
import { get, set, invalidate } from '../../shared/utils/cache.util';
import { broadcastToAdmins } from '../notifications/notification.service';
import { sendLowStockAlert } from '../../services/email.service';

const MOVEMENT_SELECT = {
  id: true, type: true, quantity: true, previousQty: true,
  newQty: true, notes: true, createdAt: true,
  product:  { select: { id: true, name: true } },
  employee: { select: { id: true, name: true } },
} as const;

interface MovementFilters { productId?: string; type?: string; page?: string | number; limit?: string | number; }
interface MovementInput   { productId: number; type: string; quantity: number; notes?: string; }
interface SupplierInput   { name: string; phone?: string; email?: string; address?: string; }

export const getMovements = async ({ productId, type, page = 1, limit = 20 }: MovementFilters = {}) => {
  const where: Record<string, unknown> = {};
  if (productId) where['productId'] = parseInt(String(productId));
  if (type)      where['type']      = type;
  const skip = (parseInt(String(page)) - 1) * parseInt(String(limit));
  const take = parseInt(String(limit));
  const [movements, total] = await Promise.all([
    prisma.stockMovement.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take, select: MOVEMENT_SELECT }),
    prisma.stockMovement.count({ where }),
  ]);
  return { movements, total, page: parseInt(String(page)), limit: take };
};

export const recordMovement = async (employeeId: number, { productId, type, quantity, notes }: MovementInput) => {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw new Error('PRODUCT_NOT_FOUND');

  let newQty = product.quantity;
  if (type === 'IN' || type === 'RETURN')  newQty += quantity;
  else if (type === 'OUT') {
    if (product.quantity < quantity) throw new Error('INSUFFICIENT_STOCK');
    newQty -= quantity;
  } else if (type === 'ADJUSTMENT') {
    newQty = quantity;
  }

  const [movement] = await prisma.$transaction([
    prisma.stockMovement.create({
      data: { productId, type, quantity, previousQty: product.quantity, newQty, notes: notes ?? null, employeeId },
      select: MOVEMENT_SELECT,
    }),
    prisma.product.update({ where: { id: productId }, data: { quantity: newQty } }),
  ]);

  await invalidate('products:');
  getIO()?.to('all').emit('stock:updated', { productId, newQty, type });

  // Notify admins if product falls below low stock threshold
  const updated = await prisma.product.findUnique({
    where:  { id: productId },
    select: { name: true, quantity: true, lowStockAlert: true },
  });
  if (updated && updated.quantity <= updated.lowStockAlert) {
    getIO()?.to('admin').emit('stock:low', { productId, name: updated.name, quantity: updated.quantity });
    void broadcastToAdmins(
      '⚠️ Low Stock Alert',
      `${updated.name} — only ${updated.quantity} unit${updated.quantity !== 1 ? 's' : ''} remaining`,
      'warning',
      { productId, quantity: updated.quantity },
    );
    // Send email alert to all admin + super_admin users
    const admins = await prisma.user.findMany({
      where:  { role: { in: ['admin', 'super_admin'] }, isActive: true, email: { not: undefined } },
      select: { email: true },
    });
    const emails = admins.map((a) => a.email).filter(Boolean) as string[];
    void sendLowStockAlert([{ ...updated, sku: null }], emails);
  }

  return movement;
};

export const getInventoryValue = async () => {
  const products = await prisma.product.findMany({
    select: { id: true, name: true, category: true, price: true, quantity: true, lowStockAlert: true },
  });
  const items      = products.map((p) => ({ ...p, totalValue: parseFloat((p.price * p.quantity).toFixed(2)) }));
  const totalValue = items.reduce((sum, p) => sum + p.totalValue, 0);
  const lowStock   = items.filter((p) => p.quantity <= p.lowStockAlert);
  return { items, totalValue: parseFloat(totalValue.toFixed(2)), lowStock };
};

export const getSuppliers = async ({ page = 1, limit = 20 }: { page?: string | number; limit?: string | number } = {}) => {
  const cacheKey = `suppliers:list:${String(page)}:${String(limit)}`;
  const cached   = await get<unknown>(cacheKey);
  if (cached) return cached;

  const skip = (parseInt(String(page)) - 1) * parseInt(String(limit));
  const take = parseInt(String(limit));
  const where = { deletedAt: null };
  const [suppliers, total] = await Promise.all([
    prisma.supplier.findMany({ where, orderBy: { name: 'asc' }, skip, take }),
    prisma.supplier.count({ where }),
  ]);
  const result = { suppliers, total, page: parseInt(String(page)), limit: take };
  await set(cacheKey, result, 300);
  return result;
};

export const createSupplier = async (data: SupplierInput) => {
  try {
    const supplier = await prisma.supplier.create({ data });
    await invalidate('suppliers:');
    return supplier;
  } catch (e) {
    if ((e as { code?: string }).code === 'P2002') throw new Error('SUPPLIER_EMAIL_EXISTS');
    throw e;
  }
};

export const updateSupplier = async (id: string | number, data: Partial<SupplierInput>) => {
  const existing = await prisma.supplier.findUnique({ where: { id: parseInt(String(id)) } });
  if (!existing) throw new Error('SUPPLIER_NOT_FOUND');
  try {
    const supplier = await prisma.supplier.update({ where: { id: parseInt(String(id)) }, data });
    await invalidate('suppliers:');
    return supplier;
  } catch (e) {
    if ((e as { code?: string }).code === 'P2002') throw new Error('SUPPLIER_EMAIL_EXISTS');
    throw e;
  }
};

export const deleteSupplier = async (id: string | number): Promise<void> => {
  const sid = parseInt(String(id));
  const existing = await prisma.supplier.findUnique({ where: { id: sid } });
  if (!existing) throw new Error('SUPPLIER_NOT_FOUND');
  await prisma.supplier.update({ where: { id: sid }, data: { deletedAt: new Date() } });
  await invalidate('suppliers:');
};

export const restoreSupplier = async (id: string | number) => {
  const sid = parseInt(String(id));
  const existing = await prisma.supplier.findUnique({ where: { id: sid } });
  if (!existing) throw new Error('SUPPLIER_NOT_FOUND');
  if (!existing.deletedAt) throw new Error('SUPPLIER_NOT_DELETED');
  const supplier = await prisma.supplier.update({ where: { id: sid }, data: { deletedAt: null } });
  await invalidate('suppliers:');
  return supplier;
};

export const getDeletedSuppliers = async ({ page = 1, limit = 20 }: { page?: string | number; limit?: string | number } = {}) => {
  const skip = (parseInt(String(page)) - 1) * parseInt(String(limit));
  const take = parseInt(String(limit));
  const where = { deletedAt: { not: null as null } };
  const [suppliers, total] = await Promise.all([
    prisma.supplier.findMany({ where, orderBy: { deletedAt: 'desc' }, skip, take }),
    prisma.supplier.count({ where }),
  ]);
  return { suppliers, total, page: parseInt(String(page)), limit: take };
};
