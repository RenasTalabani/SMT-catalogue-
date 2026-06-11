import prisma from '../../config/prisma';
import { generateInvoicePDF } from '../../services/pdf.service';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import { createNotification } from '../notifications/notification.service';

const BUCKET = 'invoices';

function getSupabase() {
  const url = process.env['SUPABASE_URL'];
  const key = process.env['SUPABASE_SERVICE_KEY'];
  if (!url || !key) return null;
  return createClient(url, key);
}

// ── Invoice number from DB id (race-condition safe) ───────────────────────────
function buildInvoiceNumber(id: number): string {
  const year = new Date().getFullYear();
  return `INV-${year}-${String(id).padStart(6, '0')}`;
}

// ── Upload PDF buffer to Supabase Storage ─────────────────────────────────────
async function uploadPDF(buffer: Buffer, invoiceNumber: string): Promise<{ url: string; publicId: string } | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const fileName = `${invoiceNumber}-${randomUUID()}.pdf`;
  const { error } = await supabase.storage.from(BUCKET).upload(fileName, buffer, {
    contentType: 'application/pdf',
    upsert: false,
  });
  if (error) throw new Error(`PDF upload failed: ${error.message}`);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(fileName);
  return { url: data.publicUrl, publicId: fileName };
}

// ── Create invoice from order ──────────────────────────────────────────────────
export const createFromOrder = async (
  orderId: number,
  createdById: number,
  opts?: {
    customerName?: string;
    customerPhone?: string;
    customerEmail?: string;
    customerAddress?: string;
    taxRate?: number;
    discountType?: 'FIXED' | 'PERCENTAGE';
    discountValue?: number;
    notes?: string;
    isLoan?: boolean;
    initialPayment?: number;
  },
) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: { include: { product: { select: { name: true, sku: true } } } } },
  });
  if (!order) throw new Error('ORDER_NOT_FOUND');

  const existing = await prisma.invoice.findUnique({ where: { orderId } });
  if (existing) throw new Error('INVOICE_ALREADY_EXISTS');

  const taxRate       = opts?.taxRate ?? 0;
  const discountType  = opts?.discountType ?? 'FIXED';
  const discountValue = opts?.discountValue ?? 0;
  const isLoan        = opts?.isLoan ?? false;
  const initialPayment = opts?.initialPayment ?? 0;

  const subtotal      = order.items.reduce((s, i) => s + i.price * i.quantity, 0);
  const discountAmount = discountType === 'PERCENTAGE'
    ? parseFloat(((subtotal * discountValue) / 100).toFixed(2))
    : discountValue;
  const taxAmount    = parseFloat((((subtotal - discountAmount) * taxRate) / 100).toFixed(2));
  const total        = parseFloat((subtotal - discountAmount + taxAmount).toFixed(2));

  const paidAmount   = isLoan
    ? parseFloat(Math.min(initialPayment, total).toFixed(2))
    : total;

  const creator = await prisma.user.findUnique({ where: { id: createdById }, select: { name: true } });

  // Step 1: Create invoice with a temp number to claim a unique DB id
  const invoiceStatus = isLoan && paidAmount < total ? 'ISSUED' : (isLoan ? 'PAID' : 'ISSUED');
  const tempInvoice = await prisma.invoice.create({
    data: {
      invoiceNumber:   `TEMP-${randomUUID()}`,
      orderId,
      createdById,
      status:          invoiceStatus,
      customerName:    opts?.customerName    ?? null,
      customerPhone:   opts?.customerPhone   ?? null,
      customerEmail:   opts?.customerEmail   ?? null,
      customerAddress: opts?.customerAddress ?? null,
      subtotal,
      discountType,
      discountValue,
      discountAmount,
      taxRate,
      taxAmount,
      total,
      isLoan,
      paidAmount,
      paymentMethod: order.paymentMethod,
      notes:         opts?.notes ?? null,
      paidAt:        !isLoan || paidAmount >= total ? new Date() : null,
      items: {
        create: order.items.map((i) => ({
          productName: i.product.name,
          productSku:  i.product.sku ?? null,
          quantity:    i.quantity,
          unitPrice:   i.price,
          discount:    i.discount,
          total:       parseFloat((i.price * i.quantity).toFixed(2)),
        })),
      },
    },
  });

  // If this is a loan with an initial payment, record it
  if (isLoan && initialPayment > 0) {
    await prisma.invoicePayment.create({
      data: {
        invoiceId:   tempInvoice.id,
        amount:      paidAmount,
        notes:       'Initial payment',
        createdById,
        paidAt:      new Date(),
      },
    });
  }

  // Step 2: Derive invoice number from the auto-assigned id (guaranteed unique)
  const invoiceNumber = buildInvoiceNumber(tempInvoice.id);

  // Step 3: Generate PDF with the real invoice number
  const pdfPayments = isLoan && initialPayment > 0
    ? [{ amount: paidAmount, notes: 'Initial payment', paidAt: new Date() }]
    : [];

  const pdfData = {
    invoiceNumber,
    issuedAt:   new Date(),
    status:     invoiceStatus,
    paymentMethod: order.paymentMethod,
    notes:      opts?.notes ?? null,
    customerName:    opts?.customerName    ?? null,
    customerPhone:   opts?.customerPhone   ?? null,
    customerEmail:   opts?.customerEmail   ?? null,
    customerAddress: opts?.customerAddress ?? null,
    subtotal, discountAmount, discountValue, discountType, taxRate, taxAmount, total,
    isLoan,
    paidAmount,
    payments: pdfPayments,
    items: order.items.map((i) => ({
      productName: i.product.name,
      productSku:  i.product.sku ?? null,
      quantity:    i.quantity,
      unitPrice:   i.price,
      discount:    i.discount,
      total:       parseFloat((i.price * i.quantity).toFixed(2)),
    })),
    createdBy: { name: creator?.name ?? 'System' },
  };

  const pdfBuffer = await generateInvoicePDF(pdfData);
  const stored    = await uploadPDF(pdfBuffer, invoiceNumber);

  // Step 4: Update invoice with real number and PDF URLs
  const invoice = await prisma.invoice.update({
    where: { id: tempInvoice.id },
    data: {
      invoiceNumber,
      pdfUrl:      stored?.url      ?? null,
      pdfPublicId: stored?.publicId ?? null,
      qrData:      `INV:${invoiceNumber}|TOTAL:${total}`,
    },
    include: { items: true, createdBy: { select: { name: true } } },
  });

  // Notify the employee who created the invoice
  void createNotification({
    userId: createdById,
    title:  '🧾 Invoice Generated',
    body:   `${invoiceNumber} — $${total.toFixed(2)} for Order #${orderId}`,
    type:   'invoice',
    data:   { invoiceId: invoice.id, invoiceNumber, total },
  });

  return { invoice, pdfBuffer };
};

// ── Get all invoices ──────────────────────────────────────────────────────────
export const getAll = async (page = 1, limit = 20, search?: string) => {
  const skip  = (page - 1) * limit;
  const where = search
    ? { invoiceNumber: { contains: search, mode: 'insensitive' as const } }
    : {};
  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: { createdBy: { select: { name: true } } },
    }),
    prisma.invoice.count({ where }),
  ]);
  return { invoices, total, page, limit };
};

// ── Get one invoice ───────────────────────────────────────────────────────────
export const getById = async (id: number) => {
  const inv = await prisma.invoice.findUnique({
    where: { id },
    include: {
      items:     true,
      createdBy: { select: { name: true, email: true } },
      order:     { select: { id: true, status: true, paymentMethod: true } },
      payments:  { orderBy: { paidAt: 'asc' }, include: { createdBy: { select: { name: true } } } },
    },
  });
  if (!inv) throw new Error('INVOICE_NOT_FOUND');
  return inv;
};

// ── Regenerate PDF (re-download if lost) ──────────────────────────────────────
export const regeneratePDF = async (id: number): Promise<Buffer> => {
  const inv = await prisma.invoice.findUnique({
    where: { id },
    include: {
      items:    true,
      createdBy: { select: { name: true } },
      payments: { orderBy: { paidAt: 'asc' } },
    },
  });
  if (!inv) throw new Error('INVOICE_NOT_FOUND');

  const buf = await generateInvoicePDF({
    invoiceNumber:   inv.invoiceNumber,
    issuedAt:        inv.issuedAt,
    status:          inv.status,
    paymentMethod:   inv.paymentMethod,
    notes:           inv.notes,
    customerName:    inv.customerName,
    customerPhone:   inv.customerPhone,
    customerEmail:   inv.customerEmail,
    customerAddress: inv.customerAddress,
    subtotal:        inv.subtotal,
    discountAmount:  inv.discountAmount,
    discountValue:   inv.discountValue,
    discountType:    inv.discountType,
    taxRate:         inv.taxRate,
    taxAmount:       inv.taxAmount,
    total:           inv.total,
    isLoan:          inv.isLoan,
    paidAmount:      inv.paidAmount,
    payments:        inv.payments,
    items:           inv.items,
    createdBy:       inv.createdBy,
  });
  return buf;
};

// ── Add a payment installment ─────────────────────────────────────────────────
export const addPayment = async (invoiceId: number, amount: number, notes: string | undefined, createdById: number) => {
  const inv = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { payments: true },
  });
  if (!inv) throw new Error('INVOICE_NOT_FOUND');
  if (!inv.isLoan) throw new Error('NOT_A_LOAN');

  const alreadyPaid = inv.paidAmount;
  const remaining   = parseFloat((inv.total - alreadyPaid).toFixed(2));
  if (remaining <= 0) throw new Error('ALREADY_FULLY_PAID');

  const actualAmount = parseFloat(Math.min(amount, remaining).toFixed(2));
  const newPaidAmount = parseFloat((alreadyPaid + actualAmount).toFixed(2));
  const fullyPaid     = newPaidAmount >= inv.total;

  const payment = await prisma.invoicePayment.create({
    data: { invoiceId, amount: actualAmount, notes: notes ?? null, createdById, paidAt: new Date() },
  });

  const updated = await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      paidAmount: newPaidAmount,
      status:     fullyPaid ? 'PAID' : 'ISSUED',
      paidAt:     fullyPaid ? new Date() : null,
    },
    include: {
      items:    true,
      createdBy: { select: { name: true } },
      payments: { orderBy: { paidAt: 'asc' } },
    },
  });

  // Re-generate PDF with updated payment history
  const pdfBuf = await generateInvoicePDF({
    invoiceNumber:   updated.invoiceNumber,
    issuedAt:        updated.issuedAt,
    status:          updated.status,
    paymentMethod:   updated.paymentMethod,
    notes:           updated.notes,
    customerName:    updated.customerName,
    customerPhone:   updated.customerPhone,
    customerEmail:   updated.customerEmail,
    customerAddress: updated.customerAddress,
    subtotal:        updated.subtotal,
    discountAmount:  updated.discountAmount,
    discountValue:   updated.discountValue,
    discountType:    updated.discountType,
    taxRate:         updated.taxRate,
    taxAmount:       updated.taxAmount,
    total:           updated.total,
    isLoan:          updated.isLoan,
    paidAmount:      updated.paidAmount,
    payments:        updated.payments,
    items:           updated.items,
    createdBy:       updated.createdBy,
  });

  const stored = await uploadPDF(pdfBuf, updated.invoiceNumber);
  if (stored) {
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: { pdfUrl: stored.url, pdfPublicId: stored.publicId },
    });
  }

  return { invoice: updated, payment };
};

// ── Outstanding loans summary ─────────────────────────────────────────────────
export const getOutstandingLoans = async () => {
  const loans = await prisma.invoice.findMany({
    where: { isLoan: true, status: { not: 'CANCELLED' } },
    orderBy: { createdAt: 'desc' },
    select: {
      id:           true,
      invoiceNumber: true,
      customerName:  true,
      customerPhone: true,
      total:         true,
      paidAmount:    true,
      status:        true,
      issuedAt:      true,
      createdAt:     true,
    },
  });

  const outstanding = loans.filter((l) => l.paidAmount < l.total);
  const totalOwed   = parseFloat(outstanding.reduce((s, l) => s + (l.total - l.paidAmount), 0).toFixed(2));

  return {
    totalOwed,
    count: outstanding.length,
    loans: outstanding.map((l) => ({
      ...l,
      remaining: parseFloat((l.total - l.paidAmount).toFixed(2)),
    })),
  };
};

// ── Delete invoice ────────────────────────────────────────────────────────────
export const remove = async (id: number): Promise<void> => {
  const inv = await prisma.invoice.findUnique({ where: { id } });
  if (!inv) throw new Error('INVOICE_NOT_FOUND');
  await prisma.invoice.delete({ where: { id } });
};

// ── Mark as paid ──────────────────────────────────────────────────────────────
export const markPaid = async (id: number) => {
  const inv = await prisma.invoice.findUnique({ where: { id } });
  if (!inv) throw new Error('INVOICE_NOT_FOUND');
  return prisma.invoice.update({
    where: { id },
    data: { status: 'PAID', paidAt: new Date() },
  });
};
