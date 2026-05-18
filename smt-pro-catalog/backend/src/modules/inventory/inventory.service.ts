import prisma from '../../config/prisma';
import { getIO } from '../../config/socket';
import { invalidate } from '../../shared/utils/cache.util';

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
  return movement;
};

export const getInventoryValue = async () => {
  const products = await prisma.product.findMany({
    select: { id: true, name: true, category: true, price: true, quantity: true },
  });
  const items      = products.map((p) => ({ ...p, totalValue: parseFloat((p.price * p.quantity).toFixed(2)) }));
  const totalValue = items.reduce((sum, p) => sum + p.totalValue, 0);
  const lowStock   = items.filter((p) => p.quantity <= 5);
  return { items, totalValue: parseFloat(totalValue.toFixed(2)), lowStock };
};

export const getSuppliers = async ({ page = 1, limit = 20 }: { page?: string | number; limit?: string | number } = {}) => {
  const skip = (parseInt(String(page)) - 1) * parseInt(String(limit));
  const take = parseInt(String(limit));
  const [suppliers, total] = await Promise.all([
    prisma.supplier.findMany({ orderBy: { name: 'asc' }, skip, take }),
    prisma.supplier.count(),
  ]);
  return { suppliers, total, page: parseInt(String(page)), limit: take };
};

export const createSupplier = async (data: SupplierInput) => {
  try {
    return await prisma.supplier.create({ data });
  } catch (e) {
    if ((e as { code?: string }).code === 'P2002') throw new Error('SUPPLIER_EMAIL_EXISTS');
    throw e;
  }
};

export const updateSupplier = async (id: string | number, data: Partial<SupplierInput>) => {
  const existing = await prisma.supplier.findUnique({ where: { id: parseInt(String(id)) } });
  if (!existing) throw new Error('SUPPLIER_NOT_FOUND');
  try {
    return await prisma.supplier.update({ where: { id: parseInt(String(id)) }, data });
  } catch (e) {
    if ((e as { code?: string }).code === 'P2002') throw new Error('SUPPLIER_EMAIL_EXISTS');
    throw e;
  }
};

export const deleteSupplier = async (id: string | number): Promise<void> => {
  const existing = await prisma.supplier.findUnique({ where: { id: parseInt(String(id)) } });
  if (!existing) throw new Error('SUPPLIER_NOT_FOUND');
  await prisma.supplier.delete({ where: { id: parseInt(String(id)) } });
};
