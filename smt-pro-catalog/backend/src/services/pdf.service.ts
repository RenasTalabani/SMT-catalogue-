import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import https from 'https';
import http from 'http';

// ── Company branding — configure via Railway environment variables ─────────────
const CO = {
  name:    process.env['COMPANY_NAME']     ?? 'DaralIraq',
  tagline: process.env['COMPANY_TAGLINE']  ?? 'Enterprise Inventory & Sales Platform',
  phone:   process.env['COMPANY_PHONE']    ?? '',
  address: process.env['COMPANY_ADDRESS']  ?? '',
  email:   process.env['COMPANY_EMAIL']    ?? '',
  website: process.env['COMPANY_WEBSITE']  ?? '',
  logoUrl: process.env['COMPANY_LOGO_URL'] ?? '',
};

// ── Palette ───────────────────────────────────────────────────────────────────
const BRAND = '#6C5CE7';
const DARK  = '#1A1A2E';
const GREY  = '#64748B';
const LGREY = '#F1F5F9';
const GREEN = '#10B981';
const RED   = '#E53E3E';
const WHITE = '#FFFFFF';

// ── Logo fetch (best-effort, 4 s timeout) ────────────────────────────────────
async function fetchBuffer(url: string): Promise<Buffer | null> {
  if (!url) return null;
  return new Promise((res) => {
    try {
      const mod = url.startsWith('https') ? https : http;
      const req = mod.get(url, { timeout: 4000 }, (r) => {
        if ((r.statusCode ?? 999) >= 400) { res(null); return; }
        const parts: Buffer[] = [];
        r.on('data',  (d: Buffer) => parts.push(d));
        r.on('end',   () => res(Buffer.concat(parts)));
        r.on('error', () => res(null));
      });
      req.on('error',   () => res(null));
      req.on('timeout', () => { req.destroy(); res(null); });
    } catch { res(null); }
  });
}

// ── Data interface (unchanged — no logic modified) ────────────────────────────
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
  const [qrBuf, logoBuf] = await Promise.all([
    QRCode.toBuffer(
      `INV:${data.invoiceNumber}|TOTAL:${data.total}|DATE:${data.issuedAt.toISOString().slice(0, 10)}`,
      { width: 60, margin: 1, color: { dark: '#000000', light: '#FFFFFF' } },
    ),
    fetchBuffer(CO.logoUrl),
  ]);

  // Pre-compute discount figures (display only — no business logic)
  const itemDiscTotal = parseFloat(data.items.reduce((s, i) => s + i.discount * i.quantity, 0).toFixed(2));
  const originalTotal = parseFloat((data.subtotal + itemDiscTotal).toFixed(2));
  const customerSaves = parseFloat((itemDiscTotal + data.discountAmount).toFixed(2));

  return new Promise<Buffer>((resolvePDF, rejectPDF) => {
    const L   = 35;   // left/right margin
    const T   = 35;   // top/bottom margin
    const QRS = 60;   // QR code size (points)
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

    const W  = doc.page.width - L * 2;   // usable width ≈ 525
    const RE = L + W;                     // right edge ≈ 560

    let y = T;

    // ── 1. HEADER BAR ─────────────────────────────────────────────────────────
    const HDR_H = 58;
    doc.rect(L, y, W, HDR_H).fill(DARK);

    // Logo (left, optional)
    let logoEndX = L + 10;
    if (logoBuf) {
      try {
        doc.image(logoBuf, L + 10, y + 7, { height: 44 });
        logoEndX = L + 76;
      } catch { logoEndX = L + 10; }
    }

    // Company name & tagline (left side)
    const nameFits = W * 0.52 - (logoEndX - L);
    doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(13)
       .text(CO.name, logoEndX, y + 10, { width: nameFits });
    if (CO.tagline) {
      doc.fillColor('#94A3B8').font('Helvetica').fontSize(7)
         .text(CO.tagline, logoEndX, y + 27, { width: nameFits });
    }

    // "INVOICE" + number (right side)
    doc.fillColor(BRAND).font('Helvetica-Bold').fontSize(20)
       .text('INVOICE', L, y + 9, { align: 'right', width: W - 8 });
    doc.fillColor('#94A3B8').font('Helvetica').fontSize(8)
       .text(data.invoiceNumber, L, y + 33, { align: 'right', width: W - 8 });

    y += HDR_H + 10;

    // ── 2. META STRIP + QR CODE ───────────────────────────────────────────────
    const qrX   = RE - QRS;
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

    // ── 4. BILL TO / COMPANY FROM (two columns) ───────────────────────────────
    const COL_W  = Math.floor((W - 24) / 2);
    const COL2_X = L + COL_W + 24;
    let   leftY  = y;
    let   rightY = y;

    // Left: customer info
    doc.fillColor(BRAND).font('Helvetica-Bold').fontSize(7).text('BILL TO', L, leftY);
    leftY += 11;
    doc.fillColor(DARK).font('Helvetica-Bold').fontSize(10)
       .text(data.customerName ?? 'Walk-in Customer', L, leftY, { width: COL_W });
    leftY += 14;
    if (data.customerPhone) {
      doc.fillColor(GREY).font('Helvetica').fontSize(8)
         .text(`Tel: ${data.customerPhone}`, L, leftY, { width: COL_W });
      leftY += 11;
    }
    if (data.customerEmail) {
      doc.fillColor(GREY).font('Helvetica').fontSize(8)
         .text(`Email: ${data.customerEmail}`, L, leftY, { width: COL_W });
      leftY += 11;
    }
    if (data.customerAddress) {
      doc.fillColor(GREY).font('Helvetica').fontSize(8)
         .text(data.customerAddress, L, leftY, { width: COL_W });
      leftY += 11;
    }

    // Right: company info (only shown when at least one field is set)
    const hasCompanyInfo = !!(CO.address || CO.phone || CO.email || CO.website);
    if (hasCompanyInfo) {
      doc.fillColor(BRAND).font('Helvetica-Bold').fontSize(7).text('FROM', COL2_X, rightY);
      rightY += 11;
      doc.fillColor(DARK).font('Helvetica-Bold').fontSize(10)
         .text(CO.name, COL2_X, rightY, { width: COL_W });
      rightY += 14;
      if (CO.address) {
        doc.fillColor(GREY).font('Helvetica').fontSize(8)
           .text(CO.address, COL2_X, rightY, { width: COL_W });
        rightY += 11;
      }
      if (CO.phone) {
        doc.fillColor(GREY).font('Helvetica').fontSize(8)
           .text(`Tel: ${CO.phone}`, COL2_X, rightY, { width: COL_W });
        rightY += 11;
      }
      if (CO.email) {
        doc.fillColor(GREY).font('Helvetica').fontSize(8)
           .text(CO.email, COL2_X, rightY, { width: COL_W });
        rightY += 11;
      }
      if (CO.website) {
        doc.fillColor(GREY).font('Helvetica').fontSize(8)
           .text(CO.website, COL2_X, rightY, { width: COL_W });
        rightY += 11;
      }
    }

    y = Math.max(leftY, rightY) + 10;

    // ── 5. DIVIDER ────────────────────────────────────────────────────────────
    doc.moveTo(L, y).lineTo(RE, y).strokeColor(LGREY).lineWidth(0.7).stroke();
    y += 8;

    // ── 6. ITEMS TABLE ────────────────────────────────────────────────────────
    // Column left-edge positions  (L=35, RE=560, W=525)
    // #:20 | ITEM:148 | SKU:62 | QTY:28 | UNIT:60 | DISC%:40 | SALE:60 | TOTAL:107  = 525 ✓
    const C = {
      num:  L,          // x=35
      name: L + 20,     // x=55
      sku:  L + 168,    // x=203
      qty:  L + 230,    // x=265
      unit: L + 258,    // x=293
      disc: L + 318,    // x=353
      sale: L + 358,    // x=393
      tot:  L + 418,    // x=453  (width to RE: 560-453=107)
    };

    // Header row
    const HDRR = 20;
    doc.rect(L, y, W, HDRR).fill(DARK);
    doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(7);
    doc.text('#',     C.num  + 3, y + 7);
    doc.text('ITEM',  C.name + 3, y + 7);
    doc.text('SKU',   C.sku  + 3, y + 7);
    doc.text('QTY',   C.qty  + 3, y + 7);
    doc.text('UNIT',  C.unit + 3, y + 7);
    doc.text('DISC%', C.disc + 3, y + 7);
    doc.text('SALE',  C.sale + 3, y + 7);
    doc.text('TOTAL', C.tot  + 3, y + 7, { align: 'right', width: RE - C.tot - 5 });
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
        doc.fillColor(GREY).font('Helvetica').fontSize(7.5)
           .text('—', C.unit + 3, y + 5);
        doc.fillColor(GREY).font('Helvetica').fontSize(7.5)
           .text('—', C.disc + 3, y + 5);
        doc.fillColor(DARK).font('Helvetica').fontSize(7.5)
           .text(`$${item.unitPrice.toFixed(2)}`, C.sale + 3, y + 5, { width: 56 });
      }

      doc.fillColor(DARK).font('Helvetica-Bold').fontSize(7.5)
         .text(`$${item.total.toFixed(2)}`, C.tot + 3, y + 5, {
           align: 'right', width: RE - C.tot - 6,
         });

      y += ROW;
    });

    // Table bottom border
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

    // ── 8. NOTES ──────────────────────────────────────────────────────────────
    if (data.notes) {
      y += 6;
      doc.moveTo(L, y).lineTo(RE, y).strokeColor(LGREY).lineWidth(0.5).stroke();
      y += 8;
      doc.fillColor(GREY).font('Helvetica-Bold').fontSize(7.5).text('NOTES', L, y);
      y += 11;
      doc.fillColor(DARK).font('Helvetica').fontSize(8).text(data.notes, L, y, { width: W });
      y += Math.max(14, Math.ceil(data.notes.length / 90) * 11) + 5;
    }

    // ── 9. FOOTER (fixed to page bottom) ──────────────────────────────────────
    const footY = doc.page.height - T - 22;
    doc.rect(L, footY, W, 0.7).fill(LGREY);

    const contacts  = [CO.phone, CO.email, CO.website].filter(Boolean);
    const footerTxt = contacts.length > 0
      ? `Thank you for your business — ${CO.name}  |  ${contacts.join('  |  ')}`
      : `Thank you for your business — ${CO.name}`;

    doc.fillColor(GREY).font('Helvetica').fontSize(7.5)
       .text(footerTxt, L, footY + 7, { align: 'center', width: W });

    doc.end();
  });
}
