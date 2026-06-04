import prisma from '../../config/prisma';
import { getIO } from '../../config/socket';

async function nextTransferRef(): Promise<string> {
  const count = await prisma.stockTransfer.count();
  return `TRF-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
}

// ── Location CRUD ─────────────────────────────────────────────────────────────
export const getAll = async () =>
  prisma.location.findMany({ orderBy: [{ isDefault: 'desc' }, { name: 'asc' }] });

export const getById = async (id: number) => {
  const loc = await prisma.location.findUnique({
    where:   { id },
    include: { _count: { select: { stocks: true, fromTransfers: true, toTransfers: true } } },
  });
  if (!loc) throw new Error('LOCATION_NOT_FOUND');
  return loc;
};

export const create = async (data: { name: string; code: string; address?: string; isDefault?: boolean }) => {
  const code = data.code.toUpperCase().trim();
  const exists = await prisma.location.findUnique({ where: { code } });
  if (exists) throw new Error('CODE_TAKEN');

  if (data.isDefault) {
    await prisma.location.updateMany({ where: { isDefault: true }, data: { isDefault: false } });
  }
  return prisma.location.create({ data: { ...data, code } });
};

export const update = async (id: number, data: { name?: string; address?: string; isDefault?: boolean; isActive?: boolean }) => {
  const existing = await prisma.location.findUnique({ where: { id } });
  if (!existing) throw new Error('LOCATION_NOT_FOUND');
  if (data.isDefault) {
    await prisma.location.updateMany({ where: { isDefault: true, id: { not: id } }, data: { isDefault: false } });
  }
  return prisma.location.update({ where: { id }, data });
};

export const remove = async (id: number): Promise<void> => {
  const loc = await prisma.location.findUnique({ where: { id } });
  if (!loc) throw new Error('LOCATION_NOT_FOUND');
  if (loc.isDefault) throw new Error('CANNOT_DELETE_DEFAULT');
  const hasStock = await prisma.locationStock.findFirst({ where: { locationId: id, quantity: { gt: 0 } } });
  if (hasStock) throw new Error('LOCATION_HAS_STOCK');
  await prisma.location.delete({ where: { id } });
};

// ── Location inventory ────────────────────────────────────────────────────────
export const getInventory = async (locationId: number, page = 1, limit = 20) => {
  const loc = await prisma.location.findUnique({ where: { id: locationId } });
  if (!loc) throw new Error('LOCATION_NOT_FOUND');

  const skip = (page - 1) * limit;
  const [stocks, total] = await Promise.all([
    prisma.locationStock.findMany({
      where:   { locationId },
      orderBy: { product: { name: 'asc' } },
      skip, take: limit,
      include: { product: { select: { id: true, name: true, sku: true, unit: true, price: true } } },
    }),
    prisma.locationStock.count({ where: { locationId } }),
  ]);

  return { location: loc, stocks, total, page, limit };
};

export const setStock = async (locationId: number, productId: number, quantity: number) => {
  if (quantity < 0) throw new Error('INVALID_QUANTITY');
  return prisma.locationStock.upsert({
    where:  { locationId_productId: { locationId, productId } },
    create: { locationId, productId, quantity },
    update: { quantity },
  });
};

// ── Stock transfers ────────────────────────────────────────────────────────────
export const createTransfer = async (
  createdById: number,
  data: {
    fromId: number;
    toId:   number;
    notes?: string;
    items:  Array<{ productId: number; quantity: number }>;
  },
) => {
  if (data.fromId === data.toId) throw new Error('SAME_LOCATION');
  if (!data.items.length)        throw new Error('ITEMS_REQUIRED');

  const [from, to] = await Promise.all([
    prisma.location.findUnique({ where: { id: data.fromId } }),
    prisma.location.findUnique({ where: { id: data.toId } }),
  ]);
  if (!from) throw new Error('FROM_NOT_FOUND');
  if (!to)   throw new Error('TO_NOT_FOUND');

  // Validate sufficient stock at source
  for (const item of data.items) {
    const stock = await prisma.locationStock.findUnique({
      where: { locationId_productId: { locationId: data.fromId, productId: item.productId } },
    });
    if (!stock || stock.quantity < item.quantity) throw new Error(`INSUFFICIENT_STOCK:${item.productId}`);
  }

  const reference = await nextTransferRef();

  const transfer = await prisma.stockTransfer.create({
    data: {
      reference, fromId: data.fromId, toId: data.toId,
      createdById, notes: data.notes ?? null,
      items: { create: data.items },
    },
    include: {
      from:      { select: { id: true, name: true } },
      to:        { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
      items:     { include: { product: { select: { id: true, name: true, sku: true } } } },
    },
  });

  getIO()?.to('admin').emit('transfer:created', { id: transfer.id, reference, fromId: data.fromId, toId: data.toId });
  return transfer;
};

export const completeTransfer = async (id: number) => {
  const transfer = await prisma.stockTransfer.findUnique({ where: { id }, include: { items: true } });
  if (!transfer)                     throw new Error('TRANSFER_NOT_FOUND');
  if (transfer.status !== 'PENDING') throw new Error('TRANSFER_NOT_PENDING');

  await prisma.$transaction(async (tx) => {
    for (const item of transfer.items) {
      await tx.locationStock.upsert({
        where:  { locationId_productId: { locationId: transfer.fromId, productId: item.productId } },
        create: { locationId: transfer.fromId, productId: item.productId, quantity: 0 },
        update: { quantity: { decrement: item.quantity } },
      });
      await tx.locationStock.upsert({
        where:  { locationId_productId: { locationId: transfer.toId, productId: item.productId } },
        create: { locationId: transfer.toId, productId: item.productId, quantity: item.quantity },
        update: { quantity: { increment: item.quantity } },
      });
    }
    await tx.stockTransfer.update({ where: { id }, data: { status: 'COMPLETED', completedAt: new Date() } });
  });

  getIO()?.to('admin').emit('transfer:completed', { id, reference: transfer.reference });
  return prisma.stockTransfer.findUnique({
    where: { id },
    include: { from: true, to: true, items: { include: { product: { select: { id: true, name: true } } } } },
  });
};

export const cancelTransfer = async (id: number): Promise<void> => {
  const transfer = await prisma.stockTransfer.findUnique({ where: { id } });
  if (!transfer)                     throw new Error('TRANSFER_NOT_FOUND');
  if (transfer.status !== 'PENDING') throw new Error('TRANSFER_NOT_PENDING');
  await prisma.stockTransfer.update({ where: { id }, data: { status: 'CANCELLED' } });
};

export const getTransfers = async (params: { page?: number; limit?: number; locationId?: number; status?: string } = {}) => {
  const { page = 1, limit = 20, locationId, status } = params;
  const skip  = (page - 1) * limit;
  const where: Record<string, unknown> = {};
  if (status) where['status'] = status;
  if (locationId) where['OR'] = [{ fromId: locationId }, { toId: locationId }];

  const [transfers, total] = await Promise.all([
    prisma.stockTransfer.findMany({
      where, orderBy: { createdAt: 'desc' }, skip, take: limit,
      include: {
        from:      { select: { id: true, name: true, code: true } },
        to:        { select: { id: true, name: true, code: true } },
        createdBy: { select: { id: true, name: true } },
        _count:    { select: { items: true } },
      },
    }),
    prisma.stockTransfer.count({ where }),
  ]);

  return { transfers, total, page, limit };
};
