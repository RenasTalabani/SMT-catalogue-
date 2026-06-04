import prisma from '../../config/prisma';
import { validate as validateCoupon, applyToOrder as applyCoupon } from '../coupons/coupon.service';
import { calculate as calculateTax } from '../tax-rates/tax-rate.service';
import { addDebt as addCreditDebt } from '../credit/credit.service';

// ── Get or create cart ─────────────────────────────────────────────────────────
const getOrCreateCart = async (userId: number) =>
  prisma.cart.upsert({
    where:  { userId },
    create: { userId },
    update: {},
    include: {
      items: {
        include: {
          product: { select: { id: true, name: true, price: true, quantity: true, imageUrl: true, sku: true, unit: true } },
          variant: { select: { id: true, name: true, price: true, quantity: true, attributes: true } },
        },
        orderBy: { addedAt: 'desc' },
      },
    },
  });

// ── Enrich cart with totals ────────────────────────────────────────────────────
const enrichCart = (cart: Awaited<ReturnType<typeof getOrCreateCart>>) => {
  const items = cart.items.map((item) => {
    const unitPrice = item.variant?.price ?? item.product.price;
    const subtotal  = parseFloat((unitPrice * item.quantity).toFixed(2));
    return { ...item, unitPrice, subtotal };
  });

  const subtotal = parseFloat(items.reduce((s, i) => s + i.subtotal, 0).toFixed(2));
  return { ...cart, items, subtotal, itemCount: items.reduce((s, i) => s + i.quantity, 0) };
};

// ── Get cart ───────────────────────────────────────────────────────────────────
export const getCart = async (userId: number) => enrichCart(await getOrCreateCart(userId));

// ── Add / update item ──────────────────────────────────────────────────────────
export const addItem = async (userId: number, productId: number, quantity: number, variantId?: number) => {
  if (quantity <= 0) throw new Error('INVALID_QUANTITY');

  const product = await prisma.product.findFirst({ where: { id: productId, isActive: true, deletedAt: null } });
  if (!product) throw new Error('PRODUCT_NOT_FOUND');

  const stockQty = variantId
    ? (await prisma.productVariant.findUnique({ where: { id: variantId } }))?.quantity ?? 0
    : product.quantity;
  if (stockQty < quantity) throw new Error('INSUFFICIENT_STOCK');

  const cart = await getOrCreateCart(userId);

  await prisma.cartItem.upsert({
    where:  { cartId_productId_variantId: { cartId: cart.id, productId, variantId: variantId ?? null! } },
    create: { cartId: cart.id, productId, variantId: variantId ?? null, quantity },
    update: { quantity },
  });

  return getCart(userId);
};

// ── Remove item ────────────────────────────────────────────────────────────────
export const removeItem = async (userId: number, cartItemId: number) => {
  const cart = await prisma.cart.findUnique({ where: { userId } });
  if (!cart) throw new Error('CART_NOT_FOUND');
  await prisma.cartItem.deleteMany({ where: { id: cartItemId, cartId: cart.id } });
  return getCart(userId);
};

// ── Clear cart ─────────────────────────────────────────────────────────────────
export const clearCart = async (userId: number): Promise<void> => {
  const cart = await prisma.cart.findUnique({ where: { userId } });
  if (cart) await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
};

// ── Checkout ───────────────────────────────────────────────────────────────────
export interface CheckoutInput {
  paymentMethod:   string;   // CASH | CREDIT_ACCOUNT | PARTIAL
  couponCode?:     string;
  taxRateId?:      number;
  customerId?:     number;
  notes?:          string;
  paidNow?:        number;   // for PARTIAL: amount paid upfront
}

export const checkout = async (userId: number, input: CheckoutInput) => {
  const rawCart = await getOrCreateCart(userId);
  const cart    = enrichCart(rawCart);

  if (!cart.items.length) throw new Error('CART_EMPTY');

  let subtotal = cart.subtotal;
  let couponDiscount = 0;
  let couponId: number | undefined;

  // Apply coupon
  if (input.couponCode) {
    const { coupon, discountAmount } = await validateCoupon(input.couponCode, subtotal, userId);
    couponDiscount = discountAmount;
    couponId       = coupon.id;
  }

  const afterCoupon = parseFloat((subtotal - couponDiscount).toFixed(2));

  // Calculate tax
  const { taxRate, taxAmount } = await calculateTax(afterCoupon, input.taxRateId, input.customerId);

  const finalAmount = parseFloat((afterCoupon + taxAmount).toFixed(2));
  const paidNow     = input.paymentMethod === 'CASH' ? finalAmount
    : input.paidNow !== undefined ? Math.min(input.paidNow, finalAmount) : 0;
  const remaining   = parseFloat((finalAmount - paidNow).toFixed(2));
  const paymentStatus =
    paidNow >= finalAmount ? 'PAID' :
    paidNow > 0            ? 'PARTIAL' : 'UNPAID';

  // Validate credit account if needed
  if ((input.paymentMethod === 'CREDIT_ACCOUNT' || remaining > 0) && input.customerId) {
    const account = await prisma.creditAccount.findUnique({ where: { customerId: input.customerId } });
    if (account && account.creditLimit > 0 && account.balance + remaining > account.creditLimit) {
      throw new Error('CREDIT_LIMIT_EXCEEDED');
    }
  }

  const order = await prisma.$transaction(async (tx) => {
    // Validate and decrement stock
    for (const item of cart.items) {
      if (item.variantId) {
        const v = await tx.productVariant.findUnique({ where: { id: item.variantId } });
        if (!v || v.quantity < item.quantity) throw new Error(`INSUFFICIENT_STOCK:${item.product.name}`);
        await tx.productVariant.update({ where: { id: item.variantId }, data: { quantity: { decrement: item.quantity } } });
      } else {
        const p = await tx.product.findUnique({ where: { id: item.productId } });
        if (!p || p.quantity < item.quantity) throw new Error(`INSUFFICIENT_STOCK:${item.product.name}`);
        await tx.product.update({ where: { id: item.productId }, data: { quantity: { decrement: item.quantity } } });
      }
    }

    // Create order
    const newOrder = await tx.order.create({
      data: {
        userId,
        customerId:      input.customerId ?? null,
        totalAmount:     subtotal,
        discount:        couponDiscount,
        tax:             taxAmount,
        finalAmount,
        paidAmount:      paidNow,
        remainingAmount: remaining,
        paymentStatus,
        status:          'COMPLETED',
        paymentMethod:   input.paymentMethod,
        notes:           input.notes ?? null,
        items: {
          create: cart.items.map((item) => ({
            productId: item.productId,
            quantity:  item.quantity,
            price:     item.unitPrice,
            discount:  0,
          })),
        },
      },
      include: {
        items:    { include: { product: { select: { id: true, name: true } } } },
        customer: { select: { id: true, name: true } },
      },
    });

    // Apply coupon usage
    if (couponId) {
      await applyCoupon(couponId, newOrder.id, userId, couponDiscount);
    }

    // Record StockMovements
    for (const item of cart.items) {
      await tx.stockMovement.create({
        data: {
          productId:   item.productId,
          type:        'OUT',
          quantity:    item.quantity,
          previousQty: 0, // approximate — full previous qty not critical for cart orders
          newQty:      0,
          notes:       `Order #${newOrder.id} via cart checkout`,
          employeeId:  userId,
          reference:   `ORD-${String(newOrder.id).padStart(6, '0')}`,
        },
      });
    }

    return newOrder;
  });

  // Record debt if on credit
  if (remaining > 0 && input.customerId) {
    await addCreditDebt(order.id, input.customerId, remaining, userId);
  }

  // Clear cart after successful checkout
  await clearCart(userId);

  return {
    order,
    summary: {
      subtotal,
      couponDiscount,
      taxRate,
      taxAmount,
      finalAmount,
      paidNow,
      remaining,
      paymentStatus,
    },
  };
};
