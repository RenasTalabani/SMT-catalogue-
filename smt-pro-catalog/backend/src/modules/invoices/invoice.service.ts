import prisma from '../../config/prisma';
import { generateInvoicePDF, generateReceiptPDF } from '../../services/pdf.service';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import { createNotification } from '../notifications/notification.service';
import { invalidate } from '../../shared/utils/cache.util';

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

function buildReceiptNumber(paymentId: number): string {
  const year = new Date().getFullYear();
  return `RCPT-${year}-${String(paymentId).padStart(6, '0')}`;
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
    showLoanSummary?: boolean;
    initialPayment?: number;
  },
) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: { include: { product: { select: { name: true, sku: true, unit: true } } } } },
  });
  if (!order) throw new Error('ORDER_NOT_FOUND');

  const existing = await prisma.invoice.findUnique({ where: { orderId } });
  if (existing) throw new Error('INVOICE_ALREADY_EXISTS');

  const taxRate       = opts?.taxRate ?? 0;
  const discountType  = opts?.discountType ?? 'FIXED';
  const discountValue = opts?.discountValue ?? 0;
  const isLoan           = opts?.isLoan ?? false;
  const showLoanSummary  = opts?.showLoanSummary ?? true;
  const initialPayment   = opts?.initialPayment ?? 0;

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
      showLoanSummary,
      paidAmount,
      paymentMethod: order.paymentMethod,
      notes:         opts?.notes ?? null,
      paidAt:        !isLoan || paidAmount >= total ? new Date() : null,
      items: {
        create: order.items.map((i) => ({
          productName: i.product.name,
          productSku:  i.product.sku ?? null,
          quantity:    i.quantity,
          unit:        i.product.unit ?? 'piece',
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
    showLoanSummary,
    paidAmount,
    payments: pdfPayments,
    items: order.items.map((i) => ({
      productName: i.product.name,
      productSku:  i.product.sku ?? null,
      quantity:    i.quantity,
      unit:        i.product.unit ?? 'piece',
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

// ── Regenerate + upload PDF and update invoice.pdfUrl ────────────────────────
async function refreshStoredPDF(id: number): Promise<void> {
  const inv = await prisma.invoice.findUnique({
    where:   { id },
    include: { items: true, createdBy: { select: { name: true } }, payments: { orderBy: { paidAt: 'asc' } } },
  });
  if (!inv) return;
  const buf    = await generateInvoicePDF({
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
    showLoanSummary: inv.showLoanSummary,
    paidAmount:      inv.paidAmount,
    payments:        inv.payments,
    items:           inv.items,
    createdBy:       inv.createdBy,
  });
  const stored = await uploadPDF(buf, inv.invoiceNumber);
  if (stored) {
    await prisma.invoice.update({
      where: { id },
      data:  { pdfUrl: stored.url, pdfPublicId: stored.publicId },
    });
  }
}

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
    showLoanSummary: inv.showLoanSummary,
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

  let payment = await prisma.invoicePayment.create({
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
    showLoanSummary: updated.showLoanSummary,
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

  // Generate a permanent payment receipt PDF
  const receiptNum = buildReceiptNumber(payment.id);
  const creator    = await prisma.user.findUnique({ where: { id: createdById }, select: { name: true } });
  const receiptBuf = await generateReceiptPDF({
    receiptNumber:  receiptNum,
    invoiceNumber:  updated.invoiceNumber,
    customerName:   updated.customerName,
    customerPhone:  updated.customerPhone,
    invoiceTotal:   updated.total,
    paymentAmount:  actualAmount,
    totalPaid:      newPaidAmount,
    remaining:      parseFloat((updated.total - newPaidAmount).toFixed(2)),
    paidAt:         payment.paidAt,
    notes:          payment.notes,
    createdByName:  creator?.name ?? 'System',
  });

  const storedReceipt = await uploadPDF(receiptBuf, receiptNum);
  if (storedReceipt) {
    await prisma.invoicePayment.update({
      where: { id: payment.id },
      data:  { receiptNumber: receiptNum, receiptPdfUrl: storedReceipt.url },
    });
    payment = { ...payment, receiptNumber: receiptNum, receiptPdfUrl: storedReceipt.url };
  }

  return { invoice: updated, payment };
};

// ── Get single payment receipt (for re-download) ──────────────────────────────
export const getPaymentReceipt = async (invoiceId: number, paymentId: number) => {
  const inv = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  if (!inv) throw new Error('INVOICE_NOT_FOUND');

  const payment = await prisma.invoicePayment.findFirst({
    where:   { id: paymentId, invoiceId },
    include: { createdBy: { select: { name: true } } },
  });
  if (!payment) throw new Error('PAYMENT_NOT_FOUND');

  // If we already have a stored receipt PDF, return its URL
  if (payment.receiptPdfUrl) {
    return { url: payment.receiptPdfUrl, receiptNumber: payment.receiptNumber };
  }

  // Regenerate on the fly (for older payments before this feature)
  const receiptNum = payment.receiptNumber ?? buildReceiptNumber(payment.id);
  const allPayments = await prisma.invoicePayment.findMany({
    where:   { invoiceId, paidAt: { lte: payment.paidAt } },
    orderBy: { paidAt: 'asc' },
  });
  const totalPaidAtTime = parseFloat(allPayments.reduce((s, p) => s + p.amount, 0).toFixed(2));

  const buf = await generateReceiptPDF({
    receiptNumber:  receiptNum,
    invoiceNumber:  inv.invoiceNumber,
    customerName:   inv.customerName,
    customerPhone:  inv.customerPhone,
    invoiceTotal:   inv.total,
    paymentAmount:  payment.amount,
    totalPaid:      totalPaidAtTime,
    remaining:      parseFloat((inv.total - totalPaidAtTime).toFixed(2)),
    paidAt:         payment.paidAt,
    notes:          payment.notes,
    createdByName:  payment.createdBy.name,
  });
  return { buffer: buf, receiptNumber: receiptNum };
};

// ── Delete a single payment and recalculate paidAmount ───────────────────────
export const deletePayment = async (invoiceId: number, paymentId: number) => {
  const inv = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { payments: true },
  });
  if (!inv) throw new Error('INVOICE_NOT_FOUND');
  if (!inv.isLoan) throw new Error('NOT_A_LOAN');

  const payment = inv.payments.find((p) => p.id === paymentId);
  if (!payment) throw new Error('PAYMENT_NOT_FOUND');

  await prisma.invoicePayment.delete({ where: { id: paymentId } });

  const newPaidAmount = parseFloat(
    inv.payments.filter((p) => p.id !== paymentId).reduce((s, p) => s + p.amount, 0).toFixed(2),
  );
  const fullyPaid = newPaidAmount >= inv.total;

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

  await generateInvoicePDF({
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
    showLoanSummary: updated.showLoanSummary,
    paidAmount:      updated.paidAmount,
    payments:        updated.payments,
    items:           updated.items,
    createdBy:       updated.createdBy,
  }).then((buf) => uploadPDF(buf, updated.invoiceNumber)).then((stored) => {
    if (stored) {
      return prisma.invoice.update({
        where: { id: invoiceId },
        data:  { pdfUrl: stored.url, pdfPublicId: stored.publicId },
      });
    }
  }).catch(() => { /* non-fatal — PDF regeneration failure doesn't block the response */ });

  return updated;
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

// ── Edit invoice items (admin) ────────────────────────────────────────────────
export interface EditItemInput {
  productName: string;
  productSku?:  string | null;
  quantity:    number;
  unit?:       string;
  unitPrice:   number;  // original/catalog price shown as strikethrough
  salePrice:   number;  // actual price charged per unit
}

export const editItems = async (id: number, newItems: EditItemInput[]) => {
  const inv = await prisma.invoice.findUnique({ where: { id }, include: { items: true } });
  if (!inv) throw new Error('INVOICE_NOT_FOUND');
  if (!newItems.length) throw new Error('ITEMS_REQUIRED');

  const subtotal = parseFloat(newItems.reduce((s, i) => s + i.salePrice * i.quantity, 0).toFixed(2));
  const discountAmount = inv.discountType === 'PERCENTAGE'
    ? parseFloat(((subtotal * inv.discountValue) / 100).toFixed(2))
    : inv.discountValue;
  const taxAmount = parseFloat((((subtotal - discountAmount) * inv.taxRate) / 100).toFixed(2));
  const total     = parseFloat((subtotal - discountAmount + taxAmount).toFixed(2));

  // ── Reconcile product stock with the quantity change ────────────────────────
  // Match old vs new line items by SKU (fallback: product name) and adjust
  // Product.quantity by the net change in quantity sold (delta = newQty - oldQty).
  // e.g. stock 50, sold 25 (stock→25), edit invoice to 30 → delta +5 → stock→20.
  const keyOf = (sku: string | null | undefined, name: string) =>
    sku && sku.trim() ? `sku:${sku.trim()}` : `name:${name.trim()}`;

  const oldQtyByKey = new Map<string, number>();
  for (const it of inv.items) {
    const k = keyOf(it.productSku, it.productName);
    oldQtyByKey.set(k, (oldQtyByKey.get(k) ?? 0) + it.quantity);
  }
  const newQtyByKey = new Map<string, number>();
  const metaByKey   = new Map<string, { sku: string | null; name: string }>();
  for (const it of newItems) {
    const k = keyOf(it.productSku, it.productName);
    newQtyByKey.set(k, (newQtyByKey.get(k) ?? 0) + it.quantity);
    metaByKey.set(k, { sku: it.productSku ?? null, name: it.productName });
  }
  for (const it of inv.items) {
    const k = keyOf(it.productSku, it.productName);
    if (!metaByKey.has(k)) metaByKey.set(k, { sku: it.productSku ?? null, name: it.productName });
  }

  const allKeys  = new Set([...oldQtyByKey.keys(), ...newQtyByKey.keys()]);
  const stockOps: Array<ReturnType<typeof prisma.product.update>> = [];

  for (const k of allKeys) {
    const delta = (newQtyByKey.get(k) ?? 0) - (oldQtyByKey.get(k) ?? 0);
    if (delta === 0) continue;

    const meta    = metaByKey.get(k)!;
    const product = meta.sku
      ? await prisma.product.findUnique({ where: { sku: meta.sku } })
      : await prisma.product.findFirst({ where: { name: meta.name } });
    if (!product) continue; // no catalog match (e.g. a free-text line item) — skip stock sync

    if (delta > 0 && product.quantity < delta) throw new Error(`INSUFFICIENT_STOCK:${product.name}`);

    stockOps.push(
      prisma.product.update({
        where: { id: product.id },
        data:  delta > 0 ? { quantity: { decrement: delta } } : { quantity: { increment: -delta } },
      }),
    );
  }

  // Batch: adjust stock + replace items + update invoice totals
  await prisma.$transaction([
    ...stockOps,
    prisma.invoiceItem.deleteMany({ where: { invoiceId: id } }),
    prisma.invoiceItem.createMany({
      data: newItems.map((i) => ({
        invoiceId:   id,
        productName: i.productName.trim(),
        productSku:  i.productSku ?? null,
        quantity:    i.quantity,
        unit:        i.unit?.trim() || 'piece',
        unitPrice:   i.salePrice,
        discount:    parseFloat((i.unitPrice - i.salePrice).toFixed(2)),
        total:       parseFloat((i.salePrice * i.quantity).toFixed(2)),
      })),
    }),
    prisma.invoice.update({
      where: { id },
      data:  { subtotal, discountAmount, taxAmount, total },
    }),
  ]);

  if (stockOps.length > 0) {
    await invalidate('products:');
    await invalidate('reports:');
    await invalidate('dashboard:');
  }

  await refreshStoredPDF(id);

  return prisma.invoice.findUnique({
    where:   { id },
    include: { items: true, createdBy: { select: { name: true } }, payments: { orderBy: { paidAt: 'asc' } } },
  });
};

// ── Edit invoice (admin) ──────────────────────────────────────────────────────
export interface InvoiceEditInput {
  customerName?:    string | null;
  customerPhone?:   string | null;
  paymentMethod?:   string;
  notes?:           string | null;
  isLoan?:          boolean;
  showLoanSummary?: boolean;
  paidAmount?:      number;
  status?:          string;
}

export const edit = async (id: number, data: InvoiceEditInput) => {
  const inv = await prisma.invoice.findUnique({ where: { id } });
  if (!inv) throw new Error('INVOICE_NOT_FOUND');

  const updates: Record<string, unknown> = { ...data };

  // Auto-resolve status from paidAmount when status not explicitly set
  if (data.paidAmount !== undefined && data.status === undefined) {
    const paid = data.paidAmount;
    if (paid >= inv.total) {
      updates['status']  = 'PAID';
      updates['paidAt']  = new Date();
    } else {
      updates['status']  = 'ISSUED';
      updates['paidAt']  = null;
    }
  }
  // If status explicitly set to PAID, stamp paidAt
  if (data.status === 'PAID' && !inv.paidAt) {
    updates['paidAt'] = new Date();
  }
  if (data.status && data.status !== 'PAID') {
    updates['paidAt'] = null;
  }

  const updated = await prisma.invoice.update({ where: { id }, data: updates });
  await refreshStoredPDF(id);
  return updated;
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
