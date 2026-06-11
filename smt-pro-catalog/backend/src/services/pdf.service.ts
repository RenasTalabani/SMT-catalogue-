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

// ── Dar AL Iraq brand palette ─────────────────────────────────────────────────
const LOGO_GOLD = '#C8851B';  // palm fronds & trunks
const LOGO_DGRN = '#1A6E38'; // green dome cap
const LOGO_SAGE = '#B0D4B8'; // "Dar AL Iraq" text on dark header

// ── Vector logo: Dar AL Iraq palm tree ───────────────────────────────────────
// Draws the full horizontal logo (icon + text) at (lx, ly) with given height.
// Design coordinate system: 100 units tall; scale = h / 100.
function drawLogo(doc: InstanceType<typeof PDFDocument>, lx: number, ly: number, h: number): void {
  const s   = h / 100;
  const ICX = lx + 32 * s;  // palm icon center-x

  // ── Green dome (arch at top center) ──────────────────────────────────────
  doc.fillColor(LOGO_DGRN)
     .moveTo(ICX - 12 * s, ly + 20 * s)
     .bezierCurveTo(ICX - 12 * s, ly + 4 * s, ICX - 2 * s, ly, ICX, ly)
     .bezierCurveTo(ICX + 2 * s, ly, ICX + 12 * s, ly + 4 * s, ICX + 12 * s, ly + 20 * s)
     .closePath()
     .fill();

  // ── Palm fronds (5 ellipses rotated around common base) ──────────────────
  doc.fillColor(LOGO_GOLD);
  const baseY = ly + 52 * s;

  const frond = (angleDeg: number, length: number, width: number) => {
    const halfLen = (length / 2) * s;
    const halfWid = (width / 2) * s;
    doc.save()
       .rotate(angleDeg, { origin: [ICX, baseY] })
       .ellipse(ICX, baseY - halfLen, halfWid, halfLen)
       .fill()
       .restore();
    doc.fillColor(LOGO_GOLD); // re-apply after restore
  };

  frond(   0, 54, 7.5); // center frond
  frond( -26, 50, 6.5); // left inner
  frond( -52, 42, 5.5); // left outer
  frond(  26, 50, 6.5); // right inner
  frond(  52, 42, 5.5); // right outer

  // ── Trunks (3 vertical bars) ──────────────────────────────────────────────
  doc.fillColor(LOGO_GOLD);
  const tTop = ly + 50 * s;
  const tH   = 48 * s;
  const tW   = 4.5 * s;

  doc.rect(ICX - tW / 2,          tTop,          tW, tH).fill();   // center
  doc.rect(ICX - 20 * s - tW / 2, tTop + 3 * s,  tW, tH - 3 * s).fill();  // left
  doc.rect(ICX + 20 * s - tW / 2, tTop + 3 * s,  tW, tH - 3 * s).fill();  // right

  // ── "Dar AL Iraq" italic text ─────────────────────────────────────────────
  const fontSize = h * 0.33;
  doc.fillColor(LOGO_SAGE)
     .font('Times-Italic')
     .fontSize(fontSize)
     .text('Dar AL Iraq', lx + 68 * s, ly + h * 0.35, { lineBreak: false });
}

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

// ── Payment receipt PDF generator ─────────────────────────────────────────────
export async function generateReceiptPDF(data: PaymentReceiptData): Promise<Buffer> {
  return new Promise<Buffer>((resolvePDF, rejectPDF) => {
    const L = 35;
    const T = 35;

    const doc = new PDFDocument({
      size:    'A5',
      margins: { top: T, bottom: T, left: L, right: L },
    });
    const chunks: Buffer[] = [];
    doc.on('data',  (c) => chunks.push(c));
    doc.on('end',   () => resolvePDF(Buffer.concat(chunks)));
    doc.on('error', rejectPDF);

    const W  = doc.page.width - L * 2;  // ≈ 420
    const RE = L + W;
    let y = T;

    // ── Header ────────────────────────────────────────────────────────────────
    const HDR_H = 60;
    doc.rect(L, y, W, HDR_H).fill(DARK);
    drawLogo(doc, L + 6, y + 6, HDR_H - 12);
    doc.fillColor(GREEN).font('Helvetica-Bold').fontSize(16)
       .text('PAYMENT RECEIPT', L, y + 14, { align: 'right', width: W - 8 });
    doc.fillColor('#94A3B8').font('Helvetica').fontSize(7)
       .text(data.receiptNumber, L, y + 36, { align: 'right', width: W - 8 });
    y += HDR_H + 12;

    // ── Reference row ─────────────────────────────────────────────────────────
    doc.fillColor(GREY).font('Helvetica-Bold').fontSize(7).text('INVOICE', L, y);
    doc.fillColor(DARK).font('Helvetica').fontSize(9)
       .text(data.invoiceNumber, L, y + 10, { width: W / 2 });

    doc.fillColor(GREY).font('Helvetica-Bold').fontSize(7)
       .text('DATE', L + W / 2, y);
    doc.fillColor(DARK).font('Helvetica').fontSize(9)
       .text(data.paidAt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }), L + W / 2, y + 10);
    y += 26;

    // ── Customer ──────────────────────────────────────────────────────────────
    doc.moveTo(L, y).lineTo(RE, y).strokeColor(LGREY).lineWidth(0.7).stroke();
    y += 8;
    doc.fillColor(BRAND).font('Helvetica-Bold').fontSize(7).text('CUSTOMER', L, y);
    y += 10;
    doc.fillColor(DARK).font('Helvetica-Bold').fontSize(10)
       .text(data.customerName ?? 'Walk-in Customer', L, y, { width: W });
    y += 14;
    if (data.customerPhone) {
      doc.fillColor(GREY).font('Helvetica').fontSize(8).text(`Tel: ${data.customerPhone}`, L, y);
      y += 12;
    }
    y += 6;

    // ── Amount box ────────────────────────────────────────────────────────────
    doc.moveTo(L, y).lineTo(RE, y).strokeColor(LGREY).lineWidth(0.7).stroke();
    y += 10;

    doc.rect(L, y, W, 40).fill('#F0FFF4');
    doc.fillColor(GREY).font('Helvetica-Bold').fontSize(8).text('AMOUNT PAID', L + 8, y + 6);
    doc.fillColor(GREEN).font('Helvetica-Bold').fontSize(22)
       .text(`$${data.paymentAmount.toFixed(2)}`, L, y + 10, { align: 'right', width: W - 10 });
    y += 48;

    // ── Balance summary ───────────────────────────────────────────────────────
    const row = (label: string, value: string, valColor = DARK) => {
      doc.fillColor(GREY).font('Helvetica').fontSize(8.5).text(label, L, y);
      doc.fillColor(valColor).font('Helvetica-Bold').fontSize(8.5)
         .text(value, L, y, { align: 'right', width: W });
      y += 14;
    };

    row('Invoice Total', `$${data.invoiceTotal.toFixed(2)}`);
    row('Total Paid (including this payment)', `$${data.totalPaid.toFixed(2)}`, GREEN);
    if (data.remaining > 0) {
      row('Remaining Balance', `$${data.remaining.toFixed(2)}`, RED);
    } else {
      y += 2;
      doc.rect(L, y, W, 20).fill('#F0FFF4');
      doc.fillColor(GREEN).font('Helvetica-Bold').fontSize(9)
         .text('FULLY PAID — Thank you!', L, y + 6, { align: 'center', width: W });
      y += 28;
    }

    // ── Notes ─────────────────────────────────────────────────────────────────
    if (data.notes) {
      y += 4;
      doc.moveTo(L, y).lineTo(RE, y).strokeColor(LGREY).lineWidth(0.5).stroke();
      y += 8;
      doc.fillColor(GREY).font('Helvetica-Bold').fontSize(7).text('NOTES', L, y);
      y += 10;
      doc.fillColor(DARK).font('Helvetica').fontSize(8).text(data.notes, L, y, { width: W });
    }

    // ── Footer ────────────────────────────────────────────────────────────────
    const footY = doc.page.height - T - 22;
    doc.rect(L, footY, W, 0.7).fill(LGREY);
    doc.fillColor(GREY).font('Helvetica').fontSize(7)
       .text('DAR AL IRAQ  |  Address: Talary Shusha  |  Phone: +9647709199000', L, footY + 7, { align: 'center', width: W });

    doc.end();
  });
}

// ── Data interface ────────────────────────────────────────────────────────────
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
    unitPrice:   number;
    discount:    number;
    total:       number;
  }>;
  createdBy: { name: string };
}

// ── PDF generator ─────────────────────────────────────────────────────────────
export async function generateInvoicePDF(data: InvoiceData): Promise<Buffer> {
  const qrBuf = await QRCode.toBuffer(
    `INV:${data.invoiceNumber}|TOTAL:${data.total}|DATE:${data.issuedAt.toISOString().slice(0, 10)}`,
    { width: 60, margin: 1, color: { dark: '#000000', light: '#FFFFFF' } },
  );

  // Pre-compute discount figures (display only)
  const itemDiscTotal = parseFloat(data.items.reduce((s, i) => s + i.discount * i.quantity, 0).toFixed(2));
  const originalTotal = parseFloat((data.subtotal + itemDiscTotal).toFixed(2));
  const customerSaves = parseFloat((itemDiscTotal + data.discountAmount).toFixed(2));

  return new Promise<Buffer>((resolvePDF, rejectPDF) => {
    const L   = 35;   // left/right margin
    const T   = 35;   // top/bottom margin
    const QRS = 60;   // QR code size
    const ROW = 18;   // item row height

    const doc = new PDFDocument({
      size:        'A4',
      margins:     { top: T, bottom: T, left: L, right: L },
      bufferPages: true,
    });
    const chunks: Buffer[] = [];
    doc.on('data',  (c) => chunks.push(c));
    doc.on('end',   () => resolvePDF(Buffer.concat(chunks)));
    doc.on('error', rejectPDF);

    const W  = doc.page.width - L * 2;  // ≈ 525
    const RE = L + W;                    // right edge ≈ 560

    let y = T;

    // ── 1. HEADER (logo left, INVOICE right) ──────────────────────────────────
    const HDR_H  = 70;
    const LOGO_H = HDR_H - 16; // 54px logo
    doc.rect(L, y, W, HDR_H).fill(DARK);

    drawLogo(doc, L + 8, y + 8, LOGO_H);

    doc.fillColor(BRAND).font('Helvetica-Bold').fontSize(22)
       .text('INVOICE', L, y + 14, { align: 'right', width: W - 10 });
    doc.fillColor('#94A3B8').font('Helvetica').fontSize(8)
       .text(data.invoiceNumber, L, y + 40, { align: 'right', width: W - 10 });

    y += HDR_H + 10;

    // ── 2. META STRIP + QR ────────────────────────────────────────────────────
    const qrX  = RE - QRS;
    const metaW = qrX - L - 8;
    const colW  = Math.floor(metaW / 4);

    const metas = [
      { label: 'DATE',      value: data.issuedAt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) },
      { label: 'STATUS',    value: data.status },
      { label: 'PAYMENT',   value: data.paymentMethod },
      { label: 'ISSUED BY', value: data.createdBy.name },
    ];
    metas.forEach((m, i) => {
      const mx = L + i * colW;
      doc.fillColor(GREY).font('Helvetica-Bold').fontSize(6.5).text(m.label, mx, y);
      doc.fillColor(DARK).font('Helvetica').fontSize(8.5)
         .text(m.value, mx, y + 10, { width: colW - 6 });
    });
    doc.image(qrBuf, qrX, y - 2, { width: QRS });

    y += Math.max(30, QRS + 4) + 4;

    // ── 3. DIVIDER ────────────────────────────────────────────────────────────
    doc.moveTo(L, y).lineTo(RE, y).strokeColor(LGREY).lineWidth(0.7).stroke();
    y += 8;

    // ── 4. BILL TO ────────────────────────────────────────────────────────────
    doc.fillColor(BRAND).font('Helvetica-Bold').fontSize(7).text('BILL TO', L, y);
    y += 11;
    doc.fillColor(DARK).font('Helvetica-Bold').fontSize(10)
       .text(data.customerName ?? 'Walk-in Customer', L, y, { width: W / 2 });
    y += 14;
    if (data.customerPhone) {
      doc.fillColor(GREY).font('Helvetica').fontSize(8)
         .text(`Tel: ${data.customerPhone}`, L, y, { width: W / 2 });
      y += 11;
    }
    if (data.customerEmail) {
      doc.fillColor(GREY).font('Helvetica').fontSize(8)
         .text(`Email: ${data.customerEmail}`, L, y, { width: W / 2 });
      y += 11;
    }
    if (data.customerAddress) {
      doc.fillColor(GREY).font('Helvetica').fontSize(8)
         .text(data.customerAddress, L, y, { width: W / 2 });
      y += 11;
    }
    y += 10;

    // ── 5. DIVIDER ────────────────────────────────────────────────────────────
    doc.moveTo(L, y).lineTo(RE, y).strokeColor(LGREY).lineWidth(0.7).stroke();
    y += 8;

    // ── 6. ITEMS TABLE ────────────────────────────────────────────────────────
    // Column left-edge positions (L=35, RE=560, W=525)
    // #:20 | ITEM:148 | SKU:62 | QTY:28 | UNIT:60 | DISC%:40 | SALE:60 | TOTAL:107  = 525 ✓
    const C = {
      num:  L,        // x=35
      name: L + 20,   // x=55
      sku:  L + 168,  // x=203
      qty:  L + 230,  // x=265
      unit: L + 258,  // x=293
      disc: L + 318,  // x=353
      sale: L + 358,  // x=393
      tot:  L + 418,  // x=453
    };

    const HDRR = 20;
    doc.rect(L, y, W, HDRR).fill(DARK);
    doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(7);
    doc.text('#',          C.num  + 3, y + 7);
    doc.text('ITEM',       C.name + 3, y + 7);
    doc.text('SKU',        C.sku  + 3, y + 7);
    doc.text('QTY',        C.qty  + 3, y + 7);
    doc.text('UNIT PRICE', C.unit + 3, y + 7);
    doc.text('DISC%',      C.disc + 3, y + 7);
    doc.text('SALE PRICE', C.sale + 3, y + 7);
    doc.text('LINE TOTAL', C.tot  + 3, y + 7, { align: 'right', width: RE - C.tot - 5 });
    y += HDRR;

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

      doc.fillColor(DARK).font('Helvetica').fontSize(7.5)
         .text(String(item.quantity), C.qty + 3, y + 5);

      if (hasDsc) {
        // UNIT: original price with strikethrough
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
        // No discount: unit price IS the selling price — show it clearly in UNIT PRICE column
        doc.fillColor(DARK).font('Helvetica').fontSize(7.5)
           .text(`$${item.unitPrice.toFixed(2)}`, C.unit + 3, y + 5, { width: 56 });
        doc.fillColor(GREY).font('Helvetica').fontSize(7.5)
           .text('—', C.disc + 3, y + 5);
        // SALE PRICE same as unit price — no need to repeat it
        doc.fillColor(GREY).font('Helvetica').fontSize(7.5)
           .text('—', C.sale + 3, y + 5);
      }

      doc.fillColor(DARK).font('Helvetica-Bold').fontSize(7.5)
         .text(`$${item.total.toFixed(2)}`, C.tot + 3, y + 5, {
           align: 'right', width: RE - C.tot - 6,
         });

      y += ROW;
    });

    doc.moveTo(L, y).lineTo(RE, y).strokeColor(LGREY).lineWidth(0.7).stroke();
    y += 14;

    // ── 7. TOTALS ─────────────────────────────────────────────────────────────
    const TOT_W = 218;
    const TOT_X = RE - TOT_W;
    const LAB_W = 132;
    const VAL_X = TOT_X + LAB_W;
    const VAL_W = TOT_W - LAB_W;

    const totRow = (label: string, value: string, bold = false, color = DARK) => {
      doc.fillColor(GREY).font('Helvetica').fontSize(8.5).text(label, TOT_X, y);
      doc.fillColor(color).font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(8.5)
         .text(value, VAL_X, y, { align: 'right', width: VAL_W });
      y += 14;
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

    // Grand total
    doc.moveTo(TOT_X, y).lineTo(RE, y).strokeColor(BRAND).lineWidth(1).stroke();
    y += 6;
    doc.fillColor(DARK).font('Helvetica-Bold').fontSize(10).text('TOTAL', TOT_X, y);
    doc.fillColor(BRAND).font('Helvetica-Bold').fontSize(15)
       .text(`$${data.total.toFixed(2)}`, VAL_X, y - 2, { align: 'right', width: VAL_W });
    y += 22;

    if (customerSaves > 0) {
      doc.fillColor(GREEN).font('Helvetica-Bold').fontSize(8)
         .text(`Customer saves $${customerSaves.toFixed(2)} on this order`, TOT_X, y);
      y += 14;
    }

    // ── 8. LOAN / PAYMENT HISTORY ─────────────────────────────────────────────
    if (data.isLoan) {
      const paidAmt     = data.paidAmount ?? 0;
      const remaining   = parseFloat((data.total - paidAmt).toFixed(2));
      const payments    = data.payments ?? [];

      y += 6;
      doc.moveTo(L, y).lineTo(RE, y).strokeColor(LGREY).lineWidth(0.7).stroke();
      y += 10;

      doc.fillColor(BRAND).font('Helvetica-Bold').fontSize(8.5)
         .text('INSTALLMENT / LOAN SUMMARY', L, y);
      y += 14;

      // Payment history rows
      if (payments.length > 0) {
        const PH_COL1 = L;
        const PH_COL2 = L + 200;
        const PH_COL3 = RE - 90;

        doc.fillColor(GREY).font('Helvetica-Bold').fontSize(7.5)
           .text('#', PH_COL1, y)
           .text('Date', PH_COL2, y)
           .text('Amount', PH_COL3, y, { align: 'right', width: 90 });
        y += 12;

        payments.forEach((pmt, idx) => {
          const rowBg = idx % 2 === 0 ? '#F8FAFC' : WHITE;
          doc.rect(L, y, W, 14).fill(rowBg);
          const pmtDate = pmt.paidAt instanceof Date ? pmt.paidAt : new Date(pmt.paidAt);
          const label   = pmt.notes ? `Payment ${idx + 1} — ${pmt.notes}` : `Payment ${idx + 1}`;
          doc.fillColor(DARK).font('Helvetica').fontSize(7.5)
             .text(label, PH_COL1 + 3, y + 3, { width: 196 });
          doc.fillColor(GREY).font('Helvetica').fontSize(7.5)
             .text(pmtDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }), PH_COL2 + 3, y + 3);
          doc.fillColor(GREEN).font('Helvetica-Bold').fontSize(7.5)
             .text(`$${pmt.amount.toFixed(2)}`, PH_COL3, y + 3, { align: 'right', width: 90 });
          y += 14;
        });
        y += 4;
      }

      // Paid so far
      doc.fillColor(GREY).font('Helvetica').fontSize(9)
         .text('Total Paid:', L, y);
      doc.fillColor(GREEN).font('Helvetica-Bold').fontSize(9)
         .text(`$${paidAmt.toFixed(2)}`, L + 100, y);
      y += 14;

      // Remaining balance — prominent
      if (remaining > 0) {
        doc.rect(L, y, W, 24).fill('#FFF5F5');
        doc.fillColor('#E53E3E').font('Helvetica-Bold').fontSize(10)
           .text('REMAINING BALANCE:', L + 8, y + 7);
        doc.fillColor('#E53E3E').font('Helvetica-Bold').fontSize(14)
           .text(`$${remaining.toFixed(2)}`, RE - 100, y + 4, { align: 'right', width: 92 });
        y += 32;
      } else {
        doc.rect(L, y, W, 20).fill('#F0FFF4');
        doc.fillColor(GREEN).font('Helvetica-Bold').fontSize(10)
           .text('FULLY PAID — Thank you!', L + 8, y + 5);
        y += 28;
      }
    }

    // ── 10. NOTES ─────────────────────────────────────────────────────────────
    if (data.notes) {
      y += 6;
      doc.moveTo(L, y).lineTo(RE, y).strokeColor(LGREY).lineWidth(0.5).stroke();
      y += 8;
      doc.fillColor(GREY).font('Helvetica-Bold').fontSize(7.5).text('NOTES', L, y);
      y += 11;
      doc.fillColor(DARK).font('Helvetica').fontSize(8).text(data.notes, L, y, { width: W });
      y += Math.max(14, Math.ceil(data.notes.length / 90) * 11) + 5;
    }

    // ── 11. FOOTER ────────────────────────────────────────────────────────────
    const footY = doc.page.height - T - 22;
    doc.rect(L, footY, W, 0.7).fill(LGREY);
    doc.fillColor(GREY).font('Helvetica').fontSize(7.5)
       .text(
         'DAR AL IRAQ  |  Address: Talary Shusha  |  Phone: +9647709199000',
         L, footY + 7, { align: 'center', width: W },
       );

    doc.end();
  });
}
