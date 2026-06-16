import prisma from '../../config/prisma';
import { getIO } from '../../config/socket';
import { invalidate } from '../../shared/utils/cache.util';
import { audit } from '../../shared/middlewares/audit.middleware';
import { JwtPayload } from '../../types';
import { broadcastToAdmins } from '../notifications/notification.service';
import { sendLowStockAlert } from '../../services/email.service';
import { fire as fireWebhook } from '../webhooks/webhook.service';

const ORDER_SELECT = {
  id: true, totalAmount: true, finalAmount: true, discount: true,
  tax: true, status: true, paymentMethod: true, notes: true,
  receiptUrl: true, createdAt: true, updatedAt: true,
  user:  { select: { id: true, name: true, email: true } },
  items: {
    select: {
      id: true, quantity: true, price: true, discount: true,
      product: { select: { id: true, name: true, imageUrl: true } },
    },
  },
} as const;

interface PaginationInput { page?: string | number; limit?: string | number; }
interface OrderItemInput  { productId: number; quantity: number; price?: number; }
interface CreateOrderInput {
  items:         OrderItemInput[];
  paymentMethod?: string;
  notes?:         string;
  discount?:      number;
  tax?:           number;
}

export const getAll = async ({ page = 1, limit = 20, status, userId }: PaginationInput & { status?: string; userId?: string } = {}) => {
  const where: Record<string, unknown> = {};
  if (status) where['status'] = status;
  if (userId) where['userId'] = parseInt(String(userId));
  const skip = (parseInt(String(page)) - 1) * parseInt(String(limit));
  const take = parseInt(String(limit));
  const [orders, total] = await Promise.all([
    prisma.order.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take, select: ORDER_SELECT }),
    prisma.order.count({ where }),
  ]);
  return { orders, total, page: parseInt(String(page)), limit: take };
};

export const getMyOrders = async (userId: number, { page = 1, limit = 20 }: PaginationInput = {}) => {
  const skip  = (parseInt(String(page)) - 1) * parseInt(String(limit));
  const take  = parseInt(String(limit));
  const where = { userId };
  const [orders, total] = await Promise.all([
    prisma.order.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take, select: ORDER_SELECT }),
    prisma.order.count({ where }),
  ]);
  return { orders, total, page: parseInt(String(page)), limit: take };
};

export const getById = async (id: string | number, requestingUser: JwtPayload) => {
  const order = await prisma.order.findUnique({ where: { id: parseInt(String(id)) }, select: ORDER_SELECT });
  if (!order) throw new Error('ORDER_NOT_FOUND');
  if (requestingUser.role === 'customer' && order.user.id !== requestingUser.id)
    throw new Error('ORDER_FORBIDDEN');
  return order;
};

export const create = async (userId: number, input: CreateOrderInput) => {
  const { items, paymentMethod = 'CASH', notes, discount = 0, tax = 0 } = input;

  const productIds = items.map((i) => i.productId);
  const products   = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, name: true, price: true, quantity: true },
  });
  const productMap = Object.fromEntries(products.map((p) => [p.id, p]));

  for (const item of items) {
    const product = productMap[item.productId];
    if (!product)                         throw new Error(`PRODUCT_NOT_FOUND:${item.productId}`);
    if (product.quantity < item.quantity) throw new Error(`INSUFFICIENT_STOCK:${product.name}`);
  }

  // totalAmount = catalog prices (original, for tracking)
  // saleSubtotal = prices actually charged per item (after per-item price edits)
  const totalAmount   = parseFloat(items.reduce((sum, item) => sum + (productMap[item.productId]?.price ?? 0) * item.quantity, 0).toFixed(2));
  const saleSubtotal  = parseFloat(items.reduce((sum, item) => {
    const salePrice = item.price ?? productMap[item.productId]?.price ?? 0;
    return sum + salePrice * item.quantity;
  }, 0).toFixed(2));
  const finalAmount   = parseFloat((saleSubtotal - discount + tax).toFixed(2));

  // Use batch $transaction (PgBouncer-compatible) — interactive form fails with Supabase pooler
  const [order] = await prisma.$transaction([
    prisma.order.create({
      data: {
        userId,
        totalAmount,
        finalAmount,
        discount,
        tax,
        paymentMethod,
        notes: notes ?? null,
        items: {
          create: items.map((item) => {
            const catalogPrice = productMap[item.productId]?.price ?? 0;
            const salePrice    = item.price ?? catalogPrice;
            const unitDiscount = parseFloat(Math.max(0, catalogPrice - salePrice).toFixed(2));
            return {
              productId: item.productId,
              quantity:  item.quantity,
              price:     salePrice,
              discount:  unitDiscount,
            };
          }),
        },
      },
      select: ORDER_SELECT,
    }),
    ...items.map((item) =>
      prisma.product.update({ where: { id: item.productId }, data: { quantity: { decrement: item.quantity } } }),
    ),
  ]);

  await invalidate('products:');
  await invalidate('reports:');
  await invalidate('dashboard:');
  getIO()?.to('all').emit('order:created', { id: order.id, totalAmount, finalAmount, userId, itemCount: items.length });
  void fireWebhook('order.created', { id: order.id, totalAmount, finalAmount, status: 'PENDING', itemCount: items.length });

  void broadcastToAdmins(
    '🛒 New Order',
    `Order #${order.id} — $${finalAmount.toFixed(2)} (${items.length} item${items.length !== 1 ? 's' : ''})`,
    'order',
    { orderId: order.id, finalAmount, paymentMethod },
  );

  // Check if any ordered products are now low stock and send email
  const nowLowStock = await prisma.product.findMany({
    where:  { id: { in: productIds } },
    select: { name: true, sku: true, quantity: true, lowStockAlert: true },
  }).then((ps) => ps.filter((p) => p.quantity <= p.lowStockAlert)).catch(() => []);

  if (nowLowStock.length > 0) {
    const admins = await prisma.user.findMany({
      where:  { role: { in: ['admin', 'super_admin'] }, isActive: true, email: { not: undefined } },
      select: { email: true },
    });
    const emails = admins.map((a) => a.email).filter(Boolean) as string[];
    void sendLowStockAlert(nowLowStock, emails);
  }

  // Track discount usage for employee monitoring
  if (discount > 0) {
    const discountPct = parseFloat(((discount / totalAmount) * 100).toFixed(2));
    void audit(userId, 'DISCOUNT', 'Order', order.id, {
      discountAmount:     discount,
      discountPercentage: discountPct,
      totalAmount,
      finalAmount,
      paymentMethod,
    });
    // Alert admin room if discount ≥ 10%
    if (discountPct >= 10) {
      getIO()?.to('admin').emit('discount:high', {
        orderId:    order.id,
        employeeId: userId,
        discountPct,
        discount,
        totalAmount,
      });
    }
  }

  return order;
};

export const remove = async (id: string | number): Promise<void> => {
  const oid = parseInt(String(id));
  const order = await prisma.order.findUnique({
    where: { id: oid },
    select: { id: true, status: true, items: { select: { productId: true, quantity: true } } },
  });
  if (!order) throw new Error('ORDER_NOT_FOUND');
  // Restore stock for orders that haven't been completed or already cancelled
  if (order.status !== 'COMPLETED' && order.status !== 'CANCELLED') {
    await prisma.$transaction(
      order.items.map((item) =>
        prisma.product.update({ where: { id: item.productId }, data: { quantity: { increment: item.quantity } } }),
      ),
    );
    await invalidate('products:');
    await invalidate('reports:');
    await invalidate('dashboard:');
  }
  await prisma.order.delete({ where: { id: oid } });
  // All cascades (Invoice, OrderItem, ReturnRequest, CouponUsage, etc.) handled by schema
};

export const updateStatus = async (id: string | number, status: string) => {
  const existing = await prisma.order.findUnique({ where: { id: parseInt(String(id)) } });
  if (!existing) throw new Error('ORDER_NOT_FOUND');
  if (existing.status === 'COMPLETED' || existing.status === 'CANCELLED')
    throw new Error('ORDER_NOT_MODIFIABLE');

  const order = await prisma.order.update({
    where: { id: parseInt(String(id)) },
    data:  { status },
    select: ORDER_SELECT,
  });

  if (status === 'CANCELLED') {
    await prisma.$transaction(
      order.items.map((item) =>
        prisma.product.update({ where: { id: item.product.id }, data: { quantity: { increment: item.quantity } } }),
      ),
    );
    await invalidate('products:');
    await invalidate('reports:');
    await invalidate('dashboard:');
  }

  getIO()?.to('all').emit('order:updated', { id: order.id, status });
  if (status === 'COMPLETED') void fireWebhook('order.completed', { id: order.id, status });
  if (status === 'CANCELLED') void fireWebhook('order.cancelled', { id: order.id, status });
  return order;
};
