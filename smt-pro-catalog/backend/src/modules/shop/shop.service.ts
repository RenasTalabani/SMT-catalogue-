import prisma from '../../config/prisma';
import { getIO } from '../../config/socket';
import { invalidate } from '../../shared/utils/cache.util';

interface GuestOrderInput {
  customerName:  string;
  customerPhone: string;
  paymentMethod: string;
  notes?:        string;
  items: Array<{ productId: number; quantity: number }>;
}

const GUEST_EMAIL = 'guest@daraliraq.shop';

// Get or create a system guest user so orders have a valid userId
async function getGuestUser(): Promise<number> {
  let guest = await prisma.user.findUnique({ where: { email: GUEST_EMAIL } });
  if (!guest) {
    const bcrypt = await import('bcryptjs');
    guest = await prisma.user.create({
      data: {
        name:     'Guest Customer',
        email:    GUEST_EMAIL,
        password: await bcrypt.hash('guest-system-account-not-for-login', 10),
        role:     'customer',
      },
    });
  }
  return guest.id;
}

export const getPublicProducts = async (params: {
  category?: string;
  search?:   string;
  page?:     number;
  limit?:    number;
}) => {
  const { category, search, page = 1, limit = 24 } = params;
  const where: Record<string, unknown> = { isActive: true };
  if (category) where['category'] = { equals: category, mode: 'insensitive' };
  if (search) where['OR'] = [
    { name:        { contains: search, mode: 'insensitive' } },
    { description: { contains: search, mode: 'insensitive' } },
  ];
  const skip = (page - 1) * limit;
  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      select: {
        id: true, name: true, description: true, price: true,
        quantity: true, imageUrl: true, category: true, unit: true,
      },
    }),
    prisma.product.count({ where }),
  ]);
  return { products, total, page, limit };
};

export const getPublicCategories = async () => {
  return prisma.category.findMany({
    where:   { isActive: true },
    orderBy: { order: 'asc' },
    select:  { id: true, name: true, slug: true, imageUrl: true },
  });
};

export const createGuestOrder = async (input: GuestOrderInput) => {
  const guestUserId = await getGuestUser();

  // Validate products and stock
  const productIds = input.items.map((i) => i.productId);
  const products   = await prisma.product.findMany({
    where: { id: { in: productIds }, isActive: true },
  });

  if (products.length !== productIds.length) throw new Error('PRODUCT_NOT_FOUND');

  for (const item of input.items) {
    const product = products.find((p) => p.id === item.productId);
    if (!product) throw new Error('PRODUCT_NOT_FOUND');
    if (product.quantity < item.quantity) throw new Error(`INSUFFICIENT_STOCK:${product.name}`);
  }

  const totalAmount = input.items.reduce((sum, item) => {
    const product = products.find((p) => p.id === item.productId)!;
    return sum + product.price * item.quantity;
  }, 0);

  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        userId:        guestUserId,
        totalAmount:   parseFloat(totalAmount.toFixed(2)),
        finalAmount:   parseFloat(totalAmount.toFixed(2)),
        status:        'PENDING',
        paymentMethod: input.paymentMethod,
        notes:         input.notes
          ? `Customer: ${input.customerName} (${input.customerPhone})\n${input.notes}`
          : `Customer: ${input.customerName} (${input.customerPhone})`,
        items: {
          create: input.items.map((item) => {
            const product = products.find((p) => p.id === item.productId)!;
            return { productId: item.productId, quantity: item.quantity, price: product.price };
          }),
        },
      },
      include: { items: { include: { product: { select: { name: true } } } } },
    });

    // Deduct stock
    for (const item of input.items) {
      await tx.product.update({
        where: { id: item.productId },
        data:  { quantity: { decrement: item.quantity } },
      });
    }

    return created;
  });

  await invalidate('products:');
  getIO()?.to('all').emit('order:created', order);

  return { order, customerName: input.customerName, customerPhone: input.customerPhone };
};
