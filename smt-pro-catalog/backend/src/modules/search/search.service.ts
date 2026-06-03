import prisma from '../../config/prisma';

export const globalSearch = async (q: string, role: string) => {
  if (!q || q.trim().length < 2) return { products: [], customers: [], orders: [], invoices: [], suppliers: [] };

  const term = q.trim();
  const isAdmin = ['admin', 'super_admin'].includes(role);

  const [products, customers, orders, invoices, suppliers] = await Promise.all([
    // Products — all roles
    prisma.product.findMany({
      where: {
        OR: [
          { name:    { contains: term, mode: 'insensitive' } },
          { sku:     { contains: term, mode: 'insensitive' } },
          { barcode: { contains: term, mode: 'insensitive' } },
          { category:{ contains: term, mode: 'insensitive' } },
        ],
      },
      select: { id: true, name: true, sku: true, price: true, quantity: true, category: true, imageUrl: true },
      take: 5,
    }),

    // Customers — all roles
    prisma.customer.findMany({
      where: {
        OR: [
          { name:  { contains: term, mode: 'insensitive' } },
          { phone: { contains: term, mode: 'insensitive' } },
          { email: { contains: term, mode: 'insensitive' } },
        ],
      },
      select: { id: true, name: true, phone: true, email: true },
      take: 5,
    }),

    // Orders — all roles (employees see all orders)
    prisma.order.findMany({
      where: {
        OR: [
          { id: parseInt(term) || undefined },
          { paymentMethod: { contains: term, mode: 'insensitive' } },
          { customer: { name: { contains: term, mode: 'insensitive' } } },
        ],
      },
      select: { id: true, status: true, finalAmount: true, createdAt: true, customer: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),

    // Invoices — all roles
    prisma.invoice.findMany({
      where: {
        OR: [
          { invoiceNumber: { contains: term, mode: 'insensitive' } },
          { customerName:  { contains: term, mode: 'insensitive' } },
        ],
      },
      select: { id: true, invoiceNumber: true, customerName: true, total: true, status: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),

    // Suppliers — admin+ only
    isAdmin ? prisma.supplier.findMany({
      where: {
        OR: [
          { name:  { contains: term, mode: 'insensitive' } },
          { phone: { contains: term, mode: 'insensitive' } },
          { email: { contains: term, mode: 'insensitive' } },
        ],
      },
      select: { id: true, name: true, phone: true, email: true },
      take: 5,
    }) : Promise.resolve([]),
  ]);

  const total = products.length + customers.length + orders.length + invoices.length + suppliers.length;

  return { products, customers, orders, invoices, suppliers, total, query: term };
};
