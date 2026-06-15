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
// Draws a faceted diamond icon + "DAR AL IRAQ" wordmark at (lx, ly), height h.
function drawLogo(doc: InstanceType<typeof PDFDocument>, lx: number, ly: number, h: number): void {
  const cx = lx + h * 0.44;   // gem center-x
  const cy = ly + h * 0.50;   // gem center-y
  const sw = h * 0.38;        // half-width
  const sh = h * 0.46;        // half-height

  // ── Outer diamond ─────────────────────────────────────────────────────────
  doc.save()
     .moveTo(cx,      cy - sh)    // top point
     .lineTo(cx + sw, cy)         // right point
     .lineTo(cx,      cy + sh)    // bottom point
     .lineTo(cx - sw, cy)         // left point
     .closePath()
     .fillColor(BRAND)
     .fill();

  // ── Top-left upper facet (light) ──────────────────────────────────────────
  doc.moveTo(cx,           cy - sh)
     .lineTo(cx - sw,      cy)
     .lineTo(cx - sw * 0.3, cy - sh * 0.08)
     .closePath()
     .fillColor('#8B7CF6')
     .fill();

  // ── Top-right upper facet (mid) ───────────────────────────────────────────
  doc.moveTo(cx,           cy - sh)
     .lineTo(cx + sw,      cy)
     .lineTo(cx + sw * 0.3, cy - sh * 0.08)
     .closePath()
     .fillColor('#5B4DBF')
     .fill();

  // ── Bottom facet (dark) ───────────────────────────────────────────────────
  doc.moveTo(cx,           cy + sh)
     .lineTo(cx - sw,      cy)
     .lineTo(cx + sw,      cy)
     .closePath()
     .fillColor('#4A3FA8')
     .fill();

  // ── Inner girdle line ─────────────────────────────────────────────────────
  doc.moveTo(cx - sw, cy).lineTo(cx + sw, cy)
     .strokeColor('#FFFFFF').lineWidth(0.4).opacity(0.3).stroke()
     .opacity(1);

  // ── Gleam highlight ───────────────────────────────────────────────────────
  doc.circle(cx - sw * 0.18, cy - sh * 0.28, h * 0.04)
     .fillColor('#E0D9FF')
     .fill();

  doc.restore();

  // ── Wordmark ──────────────────────────────────────────────────────────────
  const tx = lx + h * 0.92;
  doc.fillColor(WHITE)
     .font('Helvetica-Bold')
     .fontSize(h * 0.30)
     .text('DAR AL IRAQ', tx, ly + h * 0.22, { lineBreak: false });

  doc.fillColor(SILVER)
     .font('Helvetica')
     .fontSize(h * 0.17)
     .text('TRADING  &  DISTRIBUTION', tx, ly + h * 0.57, { lineBreak: false });
}

// ── Company footer text ───────────────────────────────────────────────────────
const FOOTER_TEXT = 'DAR AL IRAQ   |   Baghdad, Tunis District, Street 600, Hamid Building   |   +964 770 919 9000';

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
    const HDR_H = 62;
    doc.rect(L, y, W, HDR_H).fill(DARK);
    drawLogo(doc, L + 8, y + 8, HDR_H - 16);
    doc.fillColor(GREEN).font('Helvetica-Bold').fontSize(15)
       .text('PAYMENT RECEIPT', L, y + 12, { align: 'right', width: W - 10 });
    doc.fillColor(SILVER).font('Helvetica').fontSize(7)
       .text(data.receiptNumber, L, y + 34, { align: 'right', width: W - 10 });
    y += HDR_H + 14;

    // Invoice ref + date
    const half = W / 2 - 6;
    doc.fillColor(GREY).font('Helvetica-Bold').fontSize(7).text('INVOICE REF', L, y);
    doc.fillColor(GREY).font('Helvetica-Bold').fontSize(7).text('DATE', L + half + 12, y);
    y += 10;
    doc.fillColor(DARK).font('Helvetica-Bold').fontSize(9).text(data.invoiceNumber, L, y, { width: half });
    doc.fillColor(DARK).font('Helvetica').fontSize(9)
       .text(data.paidAt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }), L + half + 12, y);
    y += 18;

    // Customer
    doc.moveTo(L, y).lineTo(RE, y).strokeColor(LGREY).lineWidth(0.7).stroke();
    y += 10;
    doc.fillColor(BRAND).font('Helvetica-Bold').fontSize(7).text('CUSTOMER', L, y);
    y += 10;
    doc.fillColor(DARK).font('Helvetica-Bold').fontSize(10)
       .text(data.customerName ?? 'Walk-in Customer', L, y, { width: W });
    y += 14;
    if (data.customerPhone) {
      doc.fillColor(GREY).font('Helvetica').fontSize(8).text(`Tel: ${data.customerPhone}`, L, y);
      y += 12;
    }
    y += 8;

    // Amount paid box
    doc.moveTo(L, y).lineTo(RE, y).strokeColor(LGREY).lineWidth(0.7).stroke();
    y += 10;
    doc.rect(L, y, W, 44).fill('#F0FFF4');
    doc.fillColor(GREY).font('Helvetica-Bold').fontSize(7.5).text('AMOUNT PAID', L + 10, y + 8);
    doc.fillColor(GREEN).font('Helvetica-Bold').fontSize(24)
       .text(`$${data.paymentAmount.toFixed(2)}`, L, y + 10, { align: 'right', width: W - 10 });
    y += 52;

    // Summary rows
    const sumRow = (label: string, value: string, col = DARK) => {
      doc.fillColor(GREY).font('Helvetica').fontSize(8.5).text(label, L, y);
      doc.fillColor(col).font('Helvetica-Bold').fontSize(8.5).text(value, L, y, { align: 'right', width: W });
      y += 15;
    };
    sumRow('Invoice Total', `$${data.invoiceTotal.toFixed(2)}`);
    sumRow('Total Paid (incl. this payment)', `$${data.totalPaid.toFixed(2)}`, GREEN);
    if (data.remaining > 0) {
      sumRow('Remaining Balance', `$${data.remaining.toFixed(2)}`, RED);
    } else {
      y += 2;
      doc.rect(L, y, W, 22).fill('#F0FFF4');
      doc.fillColor(GREEN).font('Helvetica-Bold').fontSize(9)
         .text('FULLY PAID — Thank you!', L, y + 7, { align: 'center', width: W });
      y += 30;
    }

    // Notes
    if (data.notes) {
      y += 4;
      doc.moveTo(L, y).lineTo(RE, y).strokeColor(LGREY).lineWidth(0.5).stroke();
      y += 8;
      doc.fillColor(GREY).font('Helvetica-Bold').fontSize(7).text('NOTES', L, y);
      y += 10;
      doc.fillColor(DARK).font('Helvetica').fontSize(8).text(data.notes, L, y, { width: W });
    }

    // Footer
    const footY = doc.page.height - T - 20;
    doc.rect(L, footY, W, 0.7).fill(LGREY);
    doc.fillColor(GREY).font('Helvetica').fontSize(6.5)
       .text(FOOTER_TEXT, L, footY + 7, { align: 'center', width: W });

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
    { width: 60, margin: 1, color: { dark: '#000000', light: '#FFFFFF' } },
  );

  const itemDiscTotal = parseFloat(data.items.reduce((s, i) => s + i.discount * i.quantity, 0).toFixed(2));
  const originalTotal = parseFloat((data.subtotal + itemDiscTotal).toFixed(2));
  const customerSaves = parseFloat((itemDiscTotal + data.discountAmount).toFixed(2));

  return new Promise<Buffer>((resolvePDF, rejectPDF) => {
    const L   = 35;
    const T   = 35;
    const QRS = 60;
    const ROW = 18;

    const doc = new PDFDocument({ size: 'A4', margins: { top: T, bottom: T, left: L, right: L }, bufferPages: true });
    const chunks: Buffer[] = [];
    doc.on('data',  (c) => chunks.push(c));
    doc.on('end',   () => resolvePDF(Buffer.concat(chunks)));
    doc.on('error', rejectPDF);

    const W  = doc.page.width - L * 2;   // ≈ 525
    const RE = L + W;

    let y = T;

    // ── 1. HEADER ─────────────────────────────────────────────────────────────
    const HDR_H = 72;
    doc.rect(L, y, W, HDR_H).fill(DARK);
    drawLogo(doc, L + 10, y + 10, HDR_H - 20);

    doc.fillColor(BRAND).font('Helvetica-Bold').fontSize(24)
       .text('INVOICE', L, y + 16, { align: 'right', width: W - 12 });
    doc.fillColor(SILVER).font('Helvetica').fontSize(8.5)
       .text(data.invoiceNumber, L, y + 44, { align: 'right', width: W - 12 });

    y += HDR_H + 12;

    // ── 2. META + QR ──────────────────────────────────────────────────────────
    const qrX  = RE - QRS;
    const metaW = qrX - L - 8;
    const colW  = Math.floor(metaW / 4);

    const metas = [
      { label: 'DATE',       value: data.issuedAt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) },
      { label: 'STATUS',     value: data.status },
      { label: 'PAYMENT',    value: data.paymentMethod },
      { label: 'ISSUED BY',  value: data.createdBy.name },
    ];
    metas.forEach((m, i) => {
      const mx = L + i * colW;
      doc.fillColor(GREY).font('Helvetica-Bold').fontSize(6.5).text(m.label, mx, y);
      doc.fillColor(DARK).font('Helvetica').fontSize(8.5).text(m.value, mx, y + 10, { width: colW - 6 });
    });
    doc.image(qrBuf, qrX, y - 2, { width: QRS });

    y += Math.max(30, QRS + 6) + 4;

    // ── 3. DIVIDER ────────────────────────────────────────────────────────────
    doc.moveTo(L, y).lineTo(RE, y).strokeColor(LGREY).lineWidth(0.7).stroke();
    y += 10;

    // ── 4. BILL TO ────────────────────────────────────────────────────────────
    doc.fillColor(BRAND).font('Helvetica-Bold').fontSize(7).text('BILL TO', L, y);
    y += 11;
    doc.fillColor(DARK).font('Helvetica-Bold').fontSize(10.5)
       .text(data.customerName ?? 'Walk-in Customer', L, y, { width: W / 2 });
    y += 15;
    if (data.customerPhone) {
      doc.fillColor(GREY).font('Helvetica').fontSize(8.5)
         .text(`Tel: ${data.customerPhone}`, L, y, { width: W / 2 });
      y += 12;
    }
    if (data.customerEmail) {
      doc.fillColor(GREY).font('Helvetica').fontSize(8.5)
         .text(`Email: ${data.customerEmail}`, L, y, { width: W / 2 });
      y += 12;
    }
    if (data.customerAddress) {
      doc.fillColor(GREY).font('Helvetica').fontSize(8.5)
         .text(data.customerAddress, L, y, { width: W / 2 });
      y += 12;
    }
    y += 10;

    // ── 5. DIVIDER ────────────────────────────────────────────────────────────
    doc.moveTo(L, y).lineTo(RE, y).strokeColor(LGREY).lineWidth(0.7).stroke();
    y += 10;

    // ── 6. ITEMS TABLE ────────────────────────────────────────────────────────
    // Columns: # | ITEM | SKU | QTY | UNIT PRICE | DISC% | SALE | LINE TOTAL
    // Widths:  20  148    62    40    60           40      60     95  = 525 ✓
    const C = {
      num:  L,           // x=35   w=20
      name: L + 20,      // x=55   w=148
      sku:  L + 168,     // x=203  w=62
      qty:  L + 230,     // x=265  w=40
      unit: L + 270,     // x=305  w=60
      disc: L + 330,     // x=365  w=40
      sale: L + 370,     // x=405  w=60
      tot:  L + 430,     // x=465  w=95
    };

    // Table header
    const HDRR = 22;
    doc.rect(L, y, W, HDRR).fill(DARK);
    doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(7);
    doc.text('#',           C.num  + 3, y + 8);
    doc.text('ITEM',        C.name + 3, y + 8);
    doc.text('SKU',         C.sku  + 3, y + 8);
    doc.text('QTY',         C.qty  + 3, y + 8);
    doc.text('UNIT PRICE',  C.unit + 3, y + 8);
    doc.text('DISC%',       C.disc + 3, y + 8);
    doc.text('SALE PRICE',  C.sale + 3, y + 8);
    doc.text('LINE TOTAL',  C.tot  + 3, y + 8, { align: 'right', width: RE - C.tot - 5 });
    y += HDRR;

    // Item rows
    data.items.forEach((item, idx) => {
      const hasDsc    = item.discount > 0;
      const origPrice = parseFloat((item.unitPrice + item.discount).toFixed(2));
      const discPct   = hasDsc ? parseFloat(((item.discount / origPrice) * 100).toFixed(1)) : 0;
      const rowBg     = idx % 2 === 0 ? WHITE : '#F8FAFC';

      doc.rect(L, y, W, ROW).fill(rowBg);

      doc.fillColor(GREY).font('Helvetica').fontSize(7.5)
         .text(String(idx + 1), C.num + 3, y + 5);

      doc.fillColor(DARK).font('Helvetica').fontSize(7.5)
         .text(item.productName, C.name + 3, y + 5, { width: 142, ellipsis: true });

      doc.fillColor(GREY).font('Helvetica').fontSize(7.5)
         .text(item.productSku ?? '—', C.sku + 3, y + 5, { width: 58 });

      // QTY — plain number; unit shown as small label below
      doc.fillColor(DARK).font('Helvetica-Bold').fontSize(7.5)
         .text(String(item.quantity), C.qty + 3, y + 5, { width: 36 });
      if (item.unit) {
        doc.fillColor(GREY).font('Helvetica').fontSize(6)
           .text(item.unit, C.qty + 3, y + 12, { width: 36 });
      }

      if (hasDsc) {
        const origStr = `$${origPrice.toFixed(2)}`;
        doc.fillColor(GREY).font('Helvetica').fontSize(7.5)
           .text(origStr, C.unit + 3, y + 5, { width: 56 });
        const tw = doc.widthOfString(origStr);
        doc.moveTo(C.unit + 3, y + 9).lineTo(C.unit + 3 + tw, y + 9)
           .strokeColor(GREY).lineWidth(0.6).stroke();

        doc.fillColor(RED).font('Helvetica-Bold').fontSize(7.5)
           .text(`-${discPct}%`, C.disc + 3, y + 5, { width: 36 });

        doc.fillColor(BRAND).font('Helvetica-Bold').fontSize(7.5)
           .text(`$${item.unitPrice.toFixed(2)}`, C.sale + 3, y + 5, { width: 56 });
      } else {
        doc.fillColor(DARK).font('Helvetica').fontSize(7.5)
           .text(`$${item.unitPrice.toFixed(2)}`, C.unit + 3, y + 5, { width: 56 });
        doc.fillColor(GREY).font('Helvetica').fontSize(7.5).text('—', C.disc + 3, y + 5);
        doc.fillColor(GREY).font('Helvetica').fontSize(7.5).text('—', C.sale + 3, y + 5);
      }

      doc.fillColor(DARK).font('Helvetica-Bold').fontSize(7.5)
         .text(`$${item.total.toFixed(2)}`, C.tot + 3, y + 5, { align: 'right', width: RE - C.tot - 6 });

      y += ROW;
    });

    // ── Table footer: total qty ───────────────────────────────────────────────
    const totalQty = data.items.reduce((s, i) => s + i.quantity, 0);
    doc.rect(L, y, W, 18).fill('#F8FAFC');
    doc.fillColor(GREY).font('Helvetica').fontSize(7.5)
       .text('Total Qty:', C.qty + 3, y + 5, { width: 36 });
    doc.fillColor(DARK).font('Helvetica-Bold').fontSize(8)
       .text(String(totalQty), C.qty + 3, y + 5, { align: 'right', width: 36 });
    y += 18;

    doc.moveTo(L, y).lineTo(RE, y).strokeColor(LGREY).lineWidth(0.7).stroke();
    y += 14;

    // ── 7. TOTALS ─────────────────────────────────────────────────────────────
    const TOT_W = 220;
    const TOT_X = RE - TOT_W;
    const LAB_W = 134;
    const VAL_X = TOT_X + LAB_W;
    const VAL_W = TOT_W - LAB_W;

    const totRow = (label: string, value: string, bold = false, color = DARK) => {
      doc.fillColor(GREY).font('Helvetica').fontSize(8.5).text(label, TOT_X, y);
      doc.fillColor(color).font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(8.5)
         .text(value, VAL_X, y, { align: 'right', width: VAL_W });
      y += 15;
    };

    if (itemDiscTotal > 0) {
      totRow('Original Price', `$${originalTotal.toFixed(2)}`);
      totRow('Item Discounts', `-$${itemDiscTotal.toFixed(2)}`, false, GREEN);
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

    // Grand total bar
    doc.rect(TOT_X, y, TOT_W, 28).fill(DARK);
    doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(10).text('TOTAL', TOT_X + 8, y + 9);
    doc.fillColor(BRAND).font('Helvetica-Bold').fontSize(16)
       .text(`$${data.total.toFixed(2)}`, VAL_X, y + 6, { align: 'right', width: VAL_W - 8 });
    y += 36;

    if (customerSaves > 0) {
      doc.fillColor(GREEN).font('Helvetica-Bold').fontSize(8)
         .text(`★  Customer saves $${customerSaves.toFixed(2)} on this order`, TOT_X, y);
      y += 16;
    }

    // ── 8. LOAN / PAYMENT HISTORY ─────────────────────────────────────────────
    if (data.isLoan) {
      const paidAmt   = data.paidAmount ?? 0;
      const remaining = parseFloat((data.total - paidAmt).toFixed(2));
      const payments  = data.payments ?? [];

      y += 8;
      doc.moveTo(L, y).lineTo(RE, y).strokeColor(LGREY).lineWidth(0.7).stroke();
      y += 12;

      doc.fillColor(BRAND).font('Helvetica-Bold').fontSize(9)
         .text('INSTALLMENT / LOAN SUMMARY', L, y);
      y += 16;

      if (payments.length > 0) {
        const PH_COL1 = L;
        const PH_COL2 = L + 210;
        const PH_COL3 = RE - 90;

        doc.fillColor(GREY).font('Helvetica-Bold').fontSize(7.5)
           .text('Payment', PH_COL1, y)
           .text('Date',    PH_COL2, y)
           .text('Amount',  PH_COL3, y, { align: 'right', width: 90 });
        y += 13;

        payments.forEach((pmt, idx) => {
          doc.rect(L, y, W, 15).fill(idx % 2 === 0 ? '#F8FAFC' : WHITE);
          const pmtDate = pmt.paidAt instanceof Date ? pmt.paidAt : new Date(pmt.paidAt);
          const label   = pmt.notes ? `#${idx + 1}  ${pmt.notes}` : `Payment #${idx + 1}`;
          doc.fillColor(DARK).font('Helvetica').fontSize(7.5)
             .text(label, PH_COL1 + 4, y + 4, { width: 206 });
          doc.fillColor(GREY).font('Helvetica').fontSize(7.5)
             .text(pmtDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }), PH_COL2 + 4, y + 4);
          doc.fillColor(GREEN).font('Helvetica-Bold').fontSize(7.5)
             .text(`$${pmt.amount.toFixed(2)}`, PH_COL3, y + 4, { align: 'right', width: 90 });
          y += 15;
        });
        y += 6;
      }

      doc.fillColor(GREY).font('Helvetica').fontSize(9).text('Total Paid:', L, y);
      doc.fillColor(GREEN).font('Helvetica-Bold').fontSize(9).text(`$${paidAmt.toFixed(2)}`, L + 90, y);
      y += 16;

      if (remaining > 0) {
        doc.rect(L, y, W, 26).fill('#FFF5F5');
        doc.fillColor(RED).font('Helvetica-Bold').fontSize(10)
           .text('REMAINING BALANCE:', L + 10, y + 8);
        doc.fillColor(RED).font('Helvetica-Bold').fontSize(14)
           .text(`$${remaining.toFixed(2)}`, RE - 110, y + 6, { align: 'right', width: 102 });
        y += 34;
      } else {
        doc.rect(L, y, W, 22).fill('#F0FFF4');
        doc.fillColor(GREEN).font('Helvetica-Bold').fontSize(10)
           .text('FULLY PAID — Thank you!', L + 10, y + 7);
        y += 30;
      }
    }

    // ── 9. NOTES ──────────────────────────────────────────────────────────────
    if (data.notes) {
      y += 8;
      doc.moveTo(L, y).lineTo(RE, y).strokeColor(LGREY).lineWidth(0.5).stroke();
      y += 10;
      doc.fillColor(GREY).font('Helvetica-Bold').fontSize(7.5).text('NOTES', L, y);
      y += 12;
      doc.fillColor(DARK).font('Helvetica').fontSize(8.5).text(data.notes, L, y, { width: W });
    }

    // ── 10. FOOTER ────────────────────────────────────────────────────────────
    const footY = doc.page.height - T - 22;
    doc.rect(L, footY, W, 0.7).fill(LGREY);
    doc.fillColor(GREY).font('Helvetica').fontSize(7)
       .text(FOOTER_TEXT, L, footY + 8, { align: 'center', width: W });

    doc.end();
  });
}
