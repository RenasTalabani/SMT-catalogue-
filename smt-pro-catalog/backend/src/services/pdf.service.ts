import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';

// ── Palette ───────────────────────────────────────────────────────────────────
const BRAND  = '#6C5CE7';
const DARK   = '#1A1A2E';
const GREY   = '#64748B';
const LGREY  = '#F1F5F9';
const GREEN  = '#10B981';
const RED    = '#E53E3E';
const WHITE  = '#FFFFFF';
const SILVER = '#CBD5E1';

// ── Diamond gem logo ──────────────────────────────────────────────────────────
// Draws a faceted diamond icon + wordmark at (lx, ly) with given height h.
// All drawing uses absolute coordinates — no save/restore needed.
function drawLogo(doc: InstanceType<typeof PDFDocument>, lx: number, ly: number, h: number): void {
  const cx = lx + h * 0.40;
  const cy = ly + h * 0.50;
  const sw = h * 0.34;   // half-width
  const sh = h * 0.44;   // half-height

  // Outer diamond fill
  doc.moveTo(cx,      cy - sh)
     .lineTo(cx + sw, cy)
     .lineTo(cx,      cy + sh)
     .lineTo(cx - sw, cy)
     .closePath()
     .fillColor(BRAND)
     .fill();

  // Top-left facet (lighter)
  doc.moveTo(cx,           cy - sh)
     .lineTo(cx - sw,      cy)
     .lineTo(cx - sw * 0.3, cy - sh * 0.12)
     .closePath()
     .fillColor('#8B7CF6')
     .fill();

  // Top-right facet (darker)
  doc.moveTo(cx,            cy - sh)
     .lineTo(cx + sw,       cy)
     .lineTo(cx + sw * 0.3, cy - sh * 0.12)
     .closePath()
     .fillColor('#5A47C0')
     .fill();

  // Bottom facet (darkest)
  doc.moveTo(cx,      cy + sh)
     .lineTo(cx - sw, cy)
     .lineTo(cx + sw, cy)
     .closePath()
     .fillColor('#4237A0')
     .fill();

  // Gleam dot
  doc.circle(cx - sw * 0.20, cy - sh * 0.30, h * 0.045)
     .fillColor('#D4D0FF')
     .fill();

  // Wordmark
  const tx = lx + h * 0.86;
  doc.fillColor(WHITE)
     .font('Helvetica-Bold')
     .fontSize(h * 0.30)
     .text('DAR AL IRAQ', tx, ly + h * 0.20, { lineBreak: false });

  doc.fillColor(SILVER)
     .font('Helvetica')
     .fontSize(h * 0.16)
     .text('TRADING & DISTRIBUTION', tx, ly + h * 0.58, { lineBreak: false });
}

// ── Footer address ────────────────────────────────────────────────────────────
const FOOTER = 'DAR AL IRAQ   |   Baghdad, Tunis District, Street 600, Hamid Building   |   +964 770 919 9000';

// ── Payment receipt interface ─────────────────────────────────────────────────
export interface PaymentReceiptData {
  receiptNumber:  string;
  invoiceNumber:  string;
  customerName?:  string | null;
  customerPhone?: string | null;
  invoiceTotal:   number;
  paymentAmount:  number;
  totalPaid:      number;
  remaining:      number;
  paidAt:         Date;
  notes?:         string | null;
  createdByName:  string;
}

// ── Payment receipt PDF (A5) ──────────────────────────────────────────────────
export async function generateReceiptPDF(data: PaymentReceiptData): Promise<Buffer> {
  return new Promise<Buffer>((resolvePDF, rejectPDF) => {
    const L = 30;
    const T = 30;
    const doc = new PDFDocument({ size: 'A5', margins: { top: T, bottom: T, left: L, right: L } });
    const chunks: Buffer[] = [];
    doc.on('data',  (c) => chunks.push(c));
    doc.on('end',   () => resolvePDF(Buffer.concat(chunks)));
    doc.on('error', rejectPDF);

    const W  = doc.page.width - L * 2;
    const RE = L + W;
    let y = T;

    // Header
    const HDR_H = 60;
    doc.rect(L, y, W, HDR_H).fill(DARK);
    drawLogo(doc, L + 8, y + 8, HDR_H - 16);
    doc.fillColor(GREEN).font('Helvetica-Bold').fontSize(14)
       .text('PAYMENT RECEIPT', L, y + 12, { align: 'right', width: W - 10 });
    doc.fillColor(SILVER).font('Helvetica').fontSize(7)
       .text(data.receiptNumber, L, y + 32, { align: 'right', width: W - 10 });
    y += HDR_H + 12;

    // Ref + date
    const half = (W - 12) / 2;
    doc.fillColor(GREY).font('Helvetica-Bold').fontSize(7).text('INVOICE', L, y);
    doc.fillColor(GREY).font('Helvetica-Bold').fontSize(7).text('DATE', L + half + 12, y);
    y += 9;
    doc.fillColor(DARK).font('Helvetica-Bold').fontSize(9).text(data.invoiceNumber, L, y, { width: half });
    doc.fillColor(DARK).font('Helvetica').fontSize(9)
       .text(data.paidAt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }), L + half + 12, y);
    y += 16;

    // Customer
    doc.moveTo(L, y).lineTo(RE, y).strokeColor(LGREY).lineWidth(0.7).stroke();
    y += 8;
    doc.fillColor(BRAND).font('Helvetica-Bold').fontSize(7).text('CUSTOMER', L, y);
    y += 9;
    doc.fillColor(DARK).font('Helvetica-Bold').fontSize(10)
       .text(data.customerName ?? 'Walk-in Customer', L, y, { width: W });
    y += 13;
    if (data.customerPhone) {
      doc.fillColor(GREY).font('Helvetica').fontSize(8).text(`Tel: ${data.customerPhone}`, L, y);
      y += 11;
    }
    y += 8;

    // Amount box
    doc.moveTo(L, y).lineTo(RE, y).strokeColor(LGREY).lineWidth(0.7).stroke();
    y += 8;
    doc.rect(L, y, W, 40).fill('#F0FFF4');
    doc.fillColor(GREY).font('Helvetica-Bold').fontSize(7).text('AMOUNT PAID', L + 8, y + 6);
    doc.fillColor(GREEN).font('Helvetica-Bold').fontSize(22)
       .text(`$${data.paymentAmount.toFixed(2)}`, L, y + 8, { align: 'right', width: W - 10 });
    y += 48;

    // Summary
    const sumRow = (label: string, val: string, col = DARK) => {
      doc.fillColor(GREY).font('Helvetica').fontSize(8.5).text(label, L, y);
      doc.fillColor(col).font('Helvetica-Bold').fontSize(8.5).text(val, L, y, { align: 'right', width: W });
      y += 14;
    };
    sumRow('Invoice Total', `$${data.invoiceTotal.toFixed(2)}`);
    sumRow('Total Paid (incl. this payment)', `$${data.totalPaid.toFixed(2)}`, GREEN);
    if (data.remaining > 0) {
      sumRow('Remaining Balance', `$${data.remaining.toFixed(2)}`, RED);
    } else {
      y += 2;
      doc.rect(L, y, W, 20).fill('#F0FFF4');
      doc.fillColor(GREEN).font('Helvetica-Bold').fontSize(9)
         .text('FULLY PAID  -  Thank you!', L, y + 6, { align: 'center', width: W });
      y += 28;
    }

    if (data.notes) {
      y += 4;
      doc.moveTo(L, y).lineTo(RE, y).strokeColor(LGREY).lineWidth(0.5).stroke();
      y += 8;
      doc.fillColor(GREY).font('Helvetica-Bold').fontSize(7).text('NOTES', L, y);
      y += 9;
      doc.fillColor(DARK).font('Helvetica').fontSize(8).text(data.notes, L, y, { width: W });
    }

    const footY = doc.page.height - T - 20;
    doc.rect(L, footY, W, 0.7).fill(LGREY);
    doc.fillColor(GREY).font('Helvetica').fontSize(6.5)
       .text(FOOTER, L, footY + 7, { align: 'center', width: W });

    doc.end();
  });
}

// ── Invoice data interface ────────────────────────────────────────────────────
interface InvoiceData {
  invoiceNumber:    string;
  issuedAt:         Date;
  status:           string;
  paymentMethod:    string;
  notes?:           string | null;
  customerName?:    string | null;
  customerPhone?:   string | null;
  customerEmail?:   string | null;
  customerAddress?: string | null;
  subtotal:         number;
  discountAmount:   number;
  taxAmount:        number;
  total:            number;
  taxRate:          number;
  discountValue:    number;
  discountType:     string;
  isLoan?:          boolean;
  paidAmount?:      number;
  payments?:        Array<{ amount: number; notes?: string | null; paidAt: Date }>;
  items: Array<{
    productName: string;
    productSku?: string | null;
    quantity:    number;
    unit?:       string;
    unitPrice:   number;
    discount:    number;
    total:       number;
  }>;
  createdBy: { name: string };
}

// ── Invoice PDF (A4) ──────────────────────────────────────────────────────────
export async function generateInvoicePDF(data: InvoiceData): Promise<Buffer> {
  const qrBuf = await QRCode.toBuffer(
    `INV:${data.invoiceNumber}|TOTAL:${data.total}|DATE:${data.issuedAt.toISOString().slice(0, 10)}`,
    { width: 52, margin: 1, color: { dark: '#000000', light: '#FFFFFF' } },
  );

  const itemDiscTotal = parseFloat(data.items.reduce((s, i) => s + i.discount * i.quantity, 0).toFixed(2));
  const originalTotal = parseFloat((data.subtotal + itemDiscTotal).toFixed(2));
  const customerSaves = parseFloat((itemDiscTotal + data.discountAmount).toFixed(2));

  return new Promise<Buffer>((resolvePDF, rejectPDF) => {
    const L   = 35;
    const T   = 30;   // tighter top margin
    const QRS = 52;   // smaller QR code
    const ROW = 15;   // compact item rows

    const doc = new PDFDocument({
      size:        'A4',
      margins:     { top: T, bottom: 30, left: L, right: L },
      bufferPages: true,
    });
    const chunks: Buffer[] = [];
    doc.on('data',  (c) => chunks.push(c));
    doc.on('end',   () => resolvePDF(Buffer.concat(chunks)));
    doc.on('error', rejectPDF);

    const W  = doc.page.width - L * 2;   // ≈ 525
    const RE = L + W;                     // right edge

    let y = T;

    // ── 1. HEADER ────────────────────────────────────────────────────────────
    const HDR_H = 64;
    doc.rect(L, y, W, HDR_H).fill(DARK);
    drawLogo(doc, L + 10, y + 8, HDR_H - 16);

    doc.fillColor(BRAND).font('Helvetica-Bold').fontSize(22)
       .text('INVOICE', L, y + 14, { align: 'right', width: W - 12 });
    doc.fillColor(SILVER).font('Helvetica').fontSize(8)
       .text(data.invoiceNumber, L, y + 40, { align: 'right', width: W - 12 });

    y += HDR_H + 8;

    // ── 2. META + QR ─────────────────────────────────────────────────────────
    const qrX  = RE - QRS;
    const metaW = qrX - L - 6;
    const colW  = Math.floor(metaW / 4);

    const metas = [
      { label: 'DATE',      value: data.issuedAt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) },
      { label: 'STATUS',    value: data.status },
      { label: 'PAYMENT',   value: data.paymentMethod },
      { label: 'ISSUED BY', value: data.createdBy.name },
    ];
    metas.forEach((m, i) => {
      const mx = L + i * colW;
      doc.fillColor(GREY).font('Helvetica-Bold').fontSize(6).text(m.label, mx, y);
      doc.fillColor(DARK).font('Helvetica').fontSize(8).text(m.value, mx, y + 9, { width: colW - 4 });
    });
    doc.image(qrBuf, qrX, y - 2, { width: QRS });

    y += QRS + 6;

    // ── 3. DIVIDER ───────────────────────────────────────────────────────────
    doc.moveTo(L, y).lineTo(RE, y).strokeColor(LGREY).lineWidth(0.7).stroke();
    y += 7;

    // ── 4. BILL TO ───────────────────────────────────────────────────────────
    doc.fillColor(BRAND).font('Helvetica-Bold').fontSize(6.5).text('BILL TO', L, y);
    y += 9;
    doc.fillColor(DARK).font('Helvetica-Bold').fontSize(10)
       .text(data.customerName ?? 'Walk-in Customer', L, y, { width: W / 2 });
    y += 13;
    if (data.customerPhone) {
      doc.fillColor(GREY).font('Helvetica').fontSize(8).text(`Tel: ${data.customerPhone}`, L, y, { width: W / 2 });
      y += 11;
    }
    if (data.customerEmail) {
      doc.fillColor(GREY).font('Helvetica').fontSize(8).text(`Email: ${data.customerEmail}`, L, y, { width: W / 2 });
      y += 11;
    }
    if (data.customerAddress) {
      doc.fillColor(GREY).font('Helvetica').fontSize(8).text(data.customerAddress, L, y, { width: W / 2 });
      y += 11;
    }
    y += 8;

    // ── 5. DIVIDER ───────────────────────────────────────────────────────────
    doc.moveTo(L, y).lineTo(RE, y).strokeColor(LGREY).lineWidth(0.7).stroke();
    y += 7;

    // ── 6. ITEMS TABLE ───────────────────────────────────────────────────────
    // Cols: # | ITEM | SKU | QTY | UNIT PRICE | DISC% | SALE | LINE TOTAL
    // Widths: 18  145  60   42    62           38      60     100  = 525
    const C = {
      num:  L,          // 35
      name: L + 18,     // 53
      sku:  L + 163,    // 198
      qty:  L + 223,    // 258
      unit: L + 265,    // 300
      disc: L + 327,    // 362
      sale: L + 365,    // 400
      tot:  L + 425,    // 460  → width to RE = 100
    };

    // Header row
    const HDRR = 18;
    doc.rect(L, y, W, HDRR).fill(DARK);
    doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(6.5);
    doc.text('#',           C.num  + 2, y + 6);
    doc.text('ITEM',        C.name + 2, y + 6);
    doc.text('SKU',         C.sku  + 2, y + 6);
    doc.text('QTY',         C.qty  + 2, y + 6);
    doc.text('UNIT PRICE',  C.unit + 2, y + 6);
    doc.text('DISC%',       C.disc + 2, y + 6);
    doc.text('SALE PRICE',  C.sale + 2, y + 6);
    doc.text('LINE TOTAL',  C.tot  + 2, y + 6, { align: 'right', width: RE - C.tot - 4 });
    y += HDRR;

    // Item rows
    data.items.forEach((item, idx) => {
      const hasDsc    = item.discount > 0;
      const origPrice = parseFloat((item.unitPrice + item.discount).toFixed(2));
      const discPct   = hasDsc ? parseFloat(((item.discount / origPrice) * 100).toFixed(1)) : 0;
      const rowBg     = idx % 2 === 0 ? WHITE : '#F8FAFC';

      doc.rect(L, y, W, ROW).fill(rowBg);

      doc.fillColor(GREY).font('Helvetica').fontSize(7)
         .text(String(idx + 1), C.num + 2, y + 4);

      doc.fillColor(DARK).font('Helvetica').fontSize(7)
         .text(item.productName, C.name + 2, y + 4, { width: 140, ellipsis: true });

      doc.fillColor(GREY).font('Helvetica').fontSize(7)
         .text(item.productSku ?? '—', C.sku + 2, y + 4, { width: 55, lineBreak: false });

      // QTY: number + unit in parentheses, never wraps
      const qtyStr = item.unit && item.unit !== 'piece'
        ? `${item.quantity} (${item.unit})`
        : String(item.quantity);
      doc.fillColor(DARK).font('Helvetica-Bold').fontSize(7)
         .text(qtyStr, C.qty + 2, y + 4, { width: 40, lineBreak: false });

      if (hasDsc) {
        const origStr = `$${origPrice.toFixed(2)}`;
        doc.fillColor(GREY).font('Helvetica').fontSize(7)
           .text(origStr, C.unit + 2, y + 4, { width: 58 });
        const tw = doc.widthOfString(origStr);
        doc.moveTo(C.unit + 2, y + 8).lineTo(C.unit + 2 + tw, y + 8)
           .strokeColor(GREY).lineWidth(0.5).stroke();

        doc.fillColor(RED).font('Helvetica-Bold').fontSize(7)
           .text(`-${discPct}%`, C.disc + 2, y + 4, { width: 34 });

        doc.fillColor(BRAND).font('Helvetica-Bold').fontSize(7)
           .text(`$${item.unitPrice.toFixed(2)}`, C.sale + 2, y + 4, { width: 56 });
      } else {
        doc.fillColor(DARK).font('Helvetica').fontSize(7)
           .text(`$${item.unitPrice.toFixed(2)}`, C.unit + 2, y + 4, { width: 58 });
        doc.fillColor(GREY).font('Helvetica').fontSize(7)
           .text('—', C.disc + 2, y + 4)
           .text('—', C.sale + 2, y + 4);
      }

      doc.fillColor(DARK).font('Helvetica-Bold').fontSize(7)
         .text(`$${item.total.toFixed(2)}`, C.tot + 2, y + 4, { align: 'right', width: RE - C.tot - 4 });

      y += ROW;
    });

    // Total quantity footer row
    const totalQty = data.items.reduce((s, i) => s + i.quantity, 0);
    doc.rect(L, y, W, 14).fill('#F0F4FF');
    doc.fillColor(GREY).font('Helvetica').fontSize(7)
       .text('Total Quantity:', L + 4, y + 4, { lineBreak: false });
    doc.fillColor(DARK).font('Helvetica-Bold').fontSize(7)
       .text(String(totalQty), RE - 104, y + 4, { align: 'right', width: 100, lineBreak: false });
    y += 14;

    doc.moveTo(L, y).lineTo(RE, y).strokeColor(LGREY).lineWidth(0.7).stroke();
    y += 12;

    // ── 7. TOTALS ────────────────────────────────────────────────────────────
    const TOT_W = 215;
    const TOT_X = RE - TOT_W;
    const LAB_W = 130;
    const VAL_X = TOT_X + LAB_W;
    const VAL_W = TOT_W - LAB_W;

    const totRow = (label: string, value: string, bold = false, color = DARK) => {
      doc.fillColor(GREY).font('Helvetica').fontSize(8).text(label, TOT_X, y);
      doc.fillColor(color).font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(8)
         .text(value, VAL_X, y, { align: 'right', width: VAL_W });
      y += 13;
    };

    if (itemDiscTotal > 0) {
      totRow('Original Price',  `$${originalTotal.toFixed(2)}`);
      totRow('Item Discounts',  `-$${itemDiscTotal.toFixed(2)}`, false, GREEN);
    }
    totRow('Subtotal', `$${data.subtotal.toFixed(2)}`);
    if (data.discountAmount > 0) {
      const dLabel = data.discountType === 'PERCENTAGE'
        ? `Extra Discount (${data.discountValue}%)`
        : 'Extra Discount (Fixed)';
      totRow(dLabel, `-$${data.discountAmount.toFixed(2)}`, false, GREEN);
    }
    if (data.taxAmount > 0) {
      totRow(`Tax (${data.taxRate}%)`, `$${data.taxAmount.toFixed(2)}`);
    }

    // Grand total
    doc.moveTo(TOT_X, y).lineTo(RE, y).strokeColor(BRAND).lineWidth(1).stroke();
    y += 5;
    doc.fillColor(DARK).font('Helvetica-Bold').fontSize(10).text('TOTAL', TOT_X, y);
    doc.fillColor(BRAND).font('Helvetica-Bold').fontSize(15)
       .text(`$${data.total.toFixed(2)}`, VAL_X, y - 2, { align: 'right', width: VAL_W });
    y += 20;

    if (customerSaves > 0) {
      doc.fillColor(GREEN).font('Helvetica-Bold').fontSize(7.5)
         .text(`Customer saves $${customerSaves.toFixed(2)} on this order`, TOT_X, y, { width: TOT_W, lineBreak: false });
      y += 13;
    }

    // ── 8. LOAN / PAYMENT HISTORY ─────────────────────────────────────────────
    if (data.isLoan) {
      const paidAmt   = data.paidAmount ?? 0;
      const remaining = parseFloat((data.total - paidAmt).toFixed(2));
      const payments  = data.payments ?? [];

      y += 6;
      doc.moveTo(L, y).lineTo(RE, y).strokeColor(LGREY).lineWidth(0.7).stroke();
      y += 8;

      doc.fillColor(BRAND).font('Helvetica-Bold').fontSize(8)
         .text('INSTALLMENT / LOAN SUMMARY', L, y);
      y += 13;

      if (payments.length > 0) {
        const PH1 = L;
        const PH2 = L + 200;
        const PH3 = RE - 85;

        doc.fillColor(GREY).font('Helvetica-Bold').fontSize(7)
           .text('Payment', PH1, y)
           .text('Date',    PH2, y)
           .text('Amount',  PH3, y, { align: 'right', width: 85 });
        y += 11;

        payments.forEach((pmt, idx) => {
          doc.rect(L, y, W, 13).fill(idx % 2 === 0 ? '#F8FAFC' : WHITE);
          const pmtDate = pmt.paidAt instanceof Date ? pmt.paidAt : new Date(pmt.paidAt);
          const label   = pmt.notes ? `#${idx + 1}  ${pmt.notes}` : `Payment #${idx + 1}`;
          doc.fillColor(DARK).font('Helvetica').fontSize(7)
             .text(label, PH1 + 3, y + 3, { width: 195 });
          doc.fillColor(GREY).font('Helvetica').fontSize(7)
             .text(pmtDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }), PH2 + 3, y + 3);
          doc.fillColor(GREEN).font('Helvetica-Bold').fontSize(7)
             .text(`$${pmt.amount.toFixed(2)}`, PH3, y + 3, { align: 'right', width: 85 });
          y += 13;
        });
        y += 4;
      }

      doc.fillColor(GREY).font('Helvetica').fontSize(8.5).text('Total Paid:', L, y);
      doc.fillColor(GREEN).font('Helvetica-Bold').fontSize(8.5).text(`$${paidAmt.toFixed(2)}`, L + 80, y);
      y += 13;

      if (remaining > 0) {
        doc.rect(L, y, W, 22).fill('#FFF5F5');
        doc.fillColor(RED).font('Helvetica-Bold').fontSize(9)
           .text('REMAINING BALANCE:', L + 8, y + 7);
        doc.fillColor(RED).font('Helvetica-Bold').fontSize(13)
           .text(`$${remaining.toFixed(2)}`, RE - 100, y + 5, { align: 'right', width: 92 });
        y += 28;
      } else {
        doc.rect(L, y, W, 20).fill('#F0FFF4');
        doc.fillColor(GREEN).font('Helvetica-Bold').fontSize(9)
           .text('FULLY PAID  -  Thank you!', L + 8, y + 6);
        y += 26;
      }
    }

    // ── 9. NOTES ──────────────────────────────────────────────────────────────
    if (data.notes) {
      y += 6;
      doc.moveTo(L, y).lineTo(RE, y).strokeColor(LGREY).lineWidth(0.5).stroke();
      y += 7;
      doc.fillColor(GREY).font('Helvetica-Bold').fontSize(7).text('NOTES', L, y);
      y += 10;
      doc.fillColor(DARK).font('Helvetica').fontSize(8).text(data.notes, L, y, { width: W });
    }

    // ── 10. FOOTER ────────────────────────────────────────────────────────────
    const footY = doc.page.height - 30 - 20;
    doc.rect(L, footY, W, 0.7).fill(LGREY);
    doc.fillColor(GREY).font('Helvetica').fontSize(7)
       .text(FOOTER, L, footY + 7, { align: 'center', width: W });

    doc.end();
  });
}
