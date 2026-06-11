import prisma from '../../config/prisma';
import { getIO } from '../../config/socket';
import { invalidate } from '../../shared/utils/cache.util';
import { broadcastToAdmins } from '../notifications/notification.service';
import { fulfillForProduct } from '../backorders/backorder.service';

export type POStatus = 'DRAFT' | 'SENT' | 'PARTIAL' | 'RECEIVED' | 'CANCELLED';

export interface CreatePOInput {
  supplierId:   number;
  notes?:       string;
  expectedDate?: string;
  items: Array<{ productId: number; orderedQty: number; unitCost: number }>;
}

export interface ReceiveItemInput {
  purchaseOrderItemId: number;
  receivedQty:         number;
}

// ── PO number generator: PO-YYYY-000001 ───────────────────────────────────────
async function nextPONumber(): Promise<string> {
  const year  = new Date().getFullYear();
  const count = await prisma.purchaseOrder.count();
  const seq   = String(count + 1).padStart(6, '0');
  return `PO-${year}-${seq}`;
}

// ── Create a new purchase order ───────────────────────────────────────────────
export const create = async (createdById: number, input: CreatePOInput) => {
  const supplier = await prisma.supplier.findFirst({ where: { id: input.supplierId, deletedAt: null } });
  if (!supplier) throw new Error('SUPPLIER_NOT_FOUND');

  if (!input.items.length) throw new Error('PO_ITEMS_REQUIRED');

  const productIds = input.items.map((i) => i.productId);
  const products   = await prisma.product.findMany({
    where: { id: { in: productIds }, deletedAt: null },
    select: { id: true, name: true, costPrice: true },
  });
  if (products.length !== productIds.length) throw new Error('PRODUCT_NOT_FOUND');

  const poNumber = await nextPONumber();
  const subtotal = input.items.reduce((s, i) => s + i.orderedQty * i.unitCost, 0);
  const total    = parseFloat(subtotal.toFixed(2));

  const po = await prisma.purchaseOrder.create({
    data: {
      poNumber,
      supplierId:   input.supplierId,
      createdById,
      notes:        input.notes ?? null,
      expectedDate: input.expectedDate ? new Date(input.expectedDate) : null,
      subtotal:     total,
      total,
      status:       'DRAFT',
      items: {
        create: input.items.map((i) => ({
          productId:   i.productId,
          orderedQty:  i.orderedQty,
          receivedQty: 0,
          unitCost:    i.unitCost,
          total:       parseFloat((i.orderedQty * i.unitCost).toFixed(2)),
        })),
      },
    },
    include: {
      supplier:  { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
      items:     { include: { product: { select: { id: true, name: true, sku: true } } } },
    },
  });

  getIO()?.to('admin').emit('po:created', { id: po.id, poNumber, total, supplierName: supplier.name });
  return po;
};

// ── Get all POs ───────────────────────────────────────────────────────────────
export const getAll = async (params: {
  page?:     number;
  limit?:    number;
  status?:   string;
  search?:   string;
  supplierId?: number;
} = {}) => {
  const { page = 1, limit = 20, status, search, supplierId } = params;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (status)     where['status']     = status;
  if (supplierId) where['supplierId'] = supplierId;
  if (search)     where['poNumber']   = { contains: search, mode: 'insensitive' };

  const [orders, total] = await Promise.all([
    prisma.purchaseOrder.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        supplier:  { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
        _count:    { select: { items: true } },
      },
    }),
    prisma.purchaseOrder.count({ where }),
  ]);

  return { orders, total, page, limit };
};

// ── Get one PO ────────────────────────────────────────────────────────────────
export const getById = async (id: number) => {
  const po = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: {
      supplier:  { select: { id: true, name: true, phone: true, email: true } },
      createdBy: { select: { id: true, name: true } },
      items: {
        include: { product: { select: { id: true, name: true, sku: true, unit: true } } },
      },
    },
  });
  if (!po) throw new Error('PO_NOT_FOUND');
  return po;
};

// ── Update status (DRAFT → SENT / CANCELLED) ──────────────────────────────────
export const updateStatus = async (id: number, status: POStatus) => {
  const po = await prisma.purchaseOrder.findUnique({ where: { id } });
  if (!po) throw new Error('PO_NOT_FOUND');

  const allowedTransitions: Record<string, POStatus[]> = {
    DRAFT:    ['SENT', 'CANCELLED'],
    SENT:     ['PARTIAL', 'RECEIVED', 'CANCELLED'],
    PARTIAL:  ['RECEIVED', 'CANCELLED'],
    RECEIVED: [],
    CANCELLED:[],
  };
  if (!allowedTransitions[po.status]?.includes(status)) {
    throw new Error(`INVALID_TRANSITION:${po.status}_TO_${status}`);
  }

  const updated = await prisma.purchaseOrder.update({
    where: { id },
    data: {
      status,
      receivedAt: status === 'RECEIVED' ? new Date() : undefined,
    },
    include: {
      supplier:  { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
    },
  });

  getIO()?.to('admin').emit('po:statusChanged', { id, status, poNumber: po.poNumber });
  return updated;
};

// ── Receive goods: update receivedQty + auto-update product stock ─────────────
export const receiveItems = async (
  id: number,
  employeeId: number,
  receivals: ReceiveItemInput[],
) => {
  const po = await prisma.purchaseOrder.findUnique({
    where:   { id },
    include: { items: true },
  });
  if (!po) throw new Error('PO_NOT_FOUND');
  if (po.status === 'CANCELLED')  throw new Error('PO_CANCELLED');
  if (po.status === 'RECEIVED')   throw new Error('PO_ALREADY_RECEIVED');
  if (po.status === 'DRAFT')      throw new Error('PO_NOT_SENT');

  const updates: Array<{ itemId: number; productId: number; addQty: number; newReceivedQty: number; unitCost: number }> = [];

  for (const recv of receivals) {
    const item = po.items.find((i) => i.id === recv.purchaseOrderItemId);
    if (!item) throw new Error(`ITEM_NOT_FOUND:${recv.purchaseOrderItemId}`);

    const remaining = item.orderedQty - item.receivedQty;
    if (recv.receivedQty <= 0) throw new Error(`INVALID_QTY:${item.id}`);
    if (recv.receivedQty > remaining) throw new Error(`EXCEEDS_ORDERED:${item.id}`);

    updates.push({
      itemId:         item.id,
      productId:      item.productId,
      addQty:         recv.receivedQty,
      newReceivedQty: item.receivedQty + recv.receivedQty,
      unitCost:       item.unitCost,
    });
  }

  // Apply all updates in a single transaction
  await prisma.$transaction(async (tx) => {
    for (const u of updates) {
      await tx.purchaseOrderItem.update({
        where: { id: u.itemId },
        data:  { receivedQty: u.newReceivedQty },
      });

      const product = await tx.product.findUnique({ where: { id: u.productId } });
      if (!product) continue;

      await tx.product.update({
        where: { id: u.productId },
        data:  { quantity: { increment: u.addQty }, costPrice: u.unitCost },
      });

      await tx.stockMovement.create({
        data: {
          productId:   u.productId,
          type:        'IN',
          quantity:    u.addQty,
          previousQty: product.quantity,
          newQty:      product.quantity + u.addQty,
          notes:       `Received via PO ${po.poNumber}`,
          employeeId,
          reference:   po.poNumber,
        },
      });
    }
  });

  // Determine new PO status
  const refreshed = await prisma.purchaseOrder.findUnique({ where: { id }, include: { items: true } });
  const allReceived = refreshed!.items.every((i) => i.receivedQty >= i.orderedQty);
  const anyReceived = refreshed!.items.some((i) => i.receivedQty > 0);

  const newStatus: POStatus = allReceived ? 'RECEIVED' : anyReceived ? 'PARTIAL' : po.status as POStatus;
  const updatedPO = await prisma.purchaseOrder.update({
    where: { id },
    data:  { status: newStatus, receivedAt: allReceived ? new Date() : undefined },
    include: {
      supplier:  { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
      items: { include: { product: { select: { id: true, name: true, sku: true, unit: true } } } },
    },
  });

  await invalidate('products:');
  getIO()?.to('all').emit('po:received', { id, status: newStatus, poNumber: po.poNumber });

  // Auto-fulfill any pending backorders for received products
  for (const u of updates) {
    const product = await prisma.product.findUnique({ where: { id: u.productId }, select: { quantity: true } });
    if (product) void fulfillForProduct(u.productId, product.quantity);
  }

  if (allReceived) {
    void broadcastToAdmins(
      '📦 Purchase Order Received',
      `${po.poNumber} — all items received from ${po.supplierId}`,
      'success',
      { poId: id, poNumber: po.poNumber },
    );
  }

  return updatedPO;
};

// ── Stats summary ─────────────────────────────────────────────────────────────
export const remove = async (id: number): Promise<void> => {
  const po = await prisma.purchaseOrder.findUnique({ where: { id } });
  if (!po) throw new Error('PO_NOT_FOUND');
  await prisma.purchaseOrder.delete({ where: { id } });
  // PurchaseOrderItems and SupplierRating cascade via schema onDelete: Cascade
};

export const getStats = async () => {
  const [byStatus, totalSpend, recentOrders] = await Promise.all([
    prisma.purchaseOrder.groupBy({
      by:    ['status'],
      _count: { id: true },
      _sum:   { total: true },
    }),
    prisma.purchaseOrder.aggregate({ _sum: { total: true } }),
    prisma.purchaseOrder.findMany({
      where:   { status: { not: 'CANCELLED' } },
      orderBy: { createdAt: 'desc' },
      take:    5,
      include: { supplier: { select: { name: true } } },
    }),
  ]);

  return {
    byStatus:    byStatus.map((s) => ({ status: s.status, count: s._count.id, total: s._sum.total ?? 0 })),
    totalSpend:  parseFloat((totalSpend._sum.total ?? 0).toFixed(2)),
    recentOrders,
  };
};
