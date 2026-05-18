const prisma          = require('../../config/prisma');
const { getIO }       = require('../../config/socket');
const { invalidate }  = require('../../shared/utils/cache.util');

// ─── Stock Movements ──────────────────────────────────────────────────────────

const getMovements = async ({ productId, type, page = 1, limit = 20 } = {}) => {
  const where = {};
  if (productId) where.productId = parseInt(productId);
  if (type)      where.type      = type;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);

  const [movements, total] = await Promise.all([
    prisma.stockMovement.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip, take,
      select: {
        id: true, type: true, quantity: true, previousQty: true,
        newQty: true, notes: true, createdAt: true,
        product:  { select: { id: true, name: true } },
        employee: { select: { id: true, name: true } },
      },
    }),
    prisma.stockMovement.count({ where }),
  ]);
  return { movements, total, page: parseInt(page), limit: take };
};

const recordMovement = async (employeeId, { productId, type, quantity, notes }) => {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw new Error('PRODUCT_NOT_FOUND');

  let newQty = product.quantity;
  if (type === 'IN' || type === 'RETURN') newQty += quantity;
  else if (type === 'OUT') {
    if (product.quantity < quantity) throw new Error('INSUFFICIENT_STOCK');
    newQty -= quantity;
  } else if (type === 'ADJUSTMENT') {
    newQty = quantity;
  }

  const [movement] = await prisma.$transaction([
    prisma.stockMovement.create({
      data: {
        productId,
        type,
        quantity,
        previousQty: product.quantity,
        newQty,
        notes: notes ?? null,
        employeeId,
      },
      select: {
        id: true, type: true, quantity: true, previousQty: true,
        newQty: true, notes: true, createdAt: true,
        product:  { select: { id: true, name: true } },
        employee: { select: { id: true, name: true } },
      },
    }),
    prisma.product.update({
      where: { id: productId },
      data:  { quantity: newQty },
    }),
  ]);

  await invalidate('products:');
  getIO()?.to('all').emit('stock:updated', { productId, newQty, type });
  return movement;
};

// ─── Inventory Value ──────────────────────────────────────────────────────────

const getInventoryValue = async () => {
  const products = await prisma.product.findMany({
    select: { id: true, name: true, category: true, price: true, quantity: true },
  });

  const items = products.map((p) => ({
    ...p,
    totalValue: parseFloat((p.price * p.quantity).toFixed(2)),
  }));

  const totalValue = items.reduce((sum, p) => sum + p.totalValue, 0);
  const lowStock   = items.filter((p) => p.quantity <= 5);

  return { items, totalValue: parseFloat(totalValue.toFixed(2)), lowStock };
};

// ─── Suppliers ────────────────────────────────────────────────────────────────

const getSuppliers = async ({ page = 1, limit = 20 } = {}) => {
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);
  const [suppliers, total] = await Promise.all([
    prisma.supplier.findMany({ orderBy: { name: 'asc' }, skip, take }),
    prisma.supplier.count(),
  ]);
  return { suppliers, total, page: parseInt(page), limit: take };
};

const createSupplier = async (data) => {
  try {
    return await prisma.supplier.create({ data });
  } catch (e) {
    if (e.code === 'P2002') throw new Error('SUPPLIER_EMAIL_EXISTS');
    throw e;
  }
};

const updateSupplier = async (id, data) => {
  const existing = await prisma.supplier.findUnique({ where: { id: parseInt(id) } });
  if (!existing) throw new Error('SUPPLIER_NOT_FOUND');
  try {
    return await prisma.supplier.update({ where: { id: parseInt(id) }, data });
  } catch (e) {
    if (e.code === 'P2002') throw new Error('SUPPLIER_EMAIL_EXISTS');
    throw e;
  }
};

const deleteSupplier = async (id) => {
  const existing = await prisma.supplier.findUnique({ where: { id: parseInt(id) } });
  if (!existing) throw new Error('SUPPLIER_NOT_FOUND');
  await prisma.supplier.delete({ where: { id: parseInt(id) } });
};

module.exports = {
  getMovements, recordMovement,
  getInventoryValue,
  getSuppliers, createSupplier, updateSupplier, deleteSupplier,
};
