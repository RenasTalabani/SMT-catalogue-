import prisma from '../../config/prisma';
import { generateInvoicePDF } from '../../services/pdf.service';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

const BUCKET = 'invoices';

function getSupabase() {
  const url = process.env['SUPABASE_URL'];
  const key = process.env['SUPABASE_SERVICE_KEY'];
  if (!url || !key) return null;
  return createClient(url, key);
}

// ── Invoice number generator: INV-YYYY-000001 ─────────────────────────────────
async function nextInvoiceNumber(): Promise<string> {
  const year  = new Date().getFullYear();
  const count = await prisma.invoice.count();
  const seq   = String(count + 1).padStart(6, '0');
  return `INV-${year}-${seq}`;
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
  },
) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: { include: { product: { select: { name: true, sku: true } } } } },
  });
  if (!order) throw new Error('ORDER_NOT_FOUND');

  const existing = await prisma.invoice.findUnique({ where: { orderId } });
  if (existing) throw new Error('INVOICE_ALREADY_EXISTS');

  const taxRate      = opts?.taxRate ?? 0;
  const discountType = opts?.discountType ?? 'FIXED';
  const discountValue = opts?.discountValue ?? 0;

  const subtotal      = order.items.reduce((s, i) => s + i.price * i.quantity, 0);
  const discountAmount = discountType === 'PERCENTAGE'
    ? parseFloat(((subtotal * discountValue) / 100).toFixed(2))
    : discountValue;
  const taxAmount    = parseFloat((((subtotal - discountAmount) * taxRate) / 100).toFixed(2));
  const total        = parseFloat((subtotal - discountAmount + taxAmount).toFixed(2));

  const invoiceNumber = await nextInvoiceNumber();
  const creator       = await prisma.user.findUnique({ where: { id: createdById }, select: { name: true } });

  // Build PDF
  const pdfData = {
    invoiceNumber,
    issuedAt:   new Date(),
    status:     'ISSUED',
    paymentMethod: order.paymentMethod,
    notes:      opts?.notes ?? null,
    customerName:    opts?.customerName    ?? null,
    customerPhone:   opts?.customerPhone   ?? null,
    customerEmail:   opts?.customerEmail   ?? null,
    customerAddress: opts?.customerAddress ?? null,
    subtotal, discountAmount, discountValue, discountType, taxRate, taxAmount, total,
    items: order.items.map((i) => ({
      productName: i.product.name,
      productSku:  i.product.sku ?? null,
      quantity:    i.quantity,
      unitPrice:   i.price,
      discount:    0,
      total:       parseFloat((i.price * i.quantity).toFixed(2)),
    })),
    createdBy: { name: creator?.name ?? 'System' },
  };

  const pdfBuffer = await generateInvoicePDF(pdfData);
  const stored    = await uploadPDF(pdfBuffer, invoiceNumber);

  const invoice = await prisma.invoice.create({
    data: {
      invoiceNumber,
      orderId,
      createdById,
      status:          'ISSUED',
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
      paymentMethod: order.paymentMethod,
      notes:         opts?.notes ?? null,
      pdfUrl:        stored?.url      ?? null,
      pdfPublicId:   stored?.publicId ?? null,
      qrData:        `INV:${invoiceNumber}|TOTAL:${total}`,
      items: {
        create: order.items.map((i) => ({
          productName: i.product.name,
          productSku:  i.product.sku ?? null,
          quantity:    i.quantity,
          unitPrice:   i.price,
          discount:    0,
          total:       parseFloat((i.price * i.quantity).toFixed(2)),
        })),
      },
    },
    include: { items: true, createdBy: { select: { name: true } } },
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
    },
  });
  if (!inv) throw new Error('INVOICE_NOT_FOUND');
  return inv;
};

// ── Regenerate PDF (re-download if lost) ──────────────────────────────────────
export const regeneratePDF = async (id: number): Promise<Buffer> => {
  const inv = await prisma.invoice.findUnique({
    where: { id },
    include: { items: true, createdBy: { select: { name: true } } },
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
    items:           inv.items,
    createdBy:       inv.createdBy,
  });
  return buf;
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
