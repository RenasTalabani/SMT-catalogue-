import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';

interface InvoiceData {
  invoiceNumber: string;
  issuedAt:      Date;
  status:        string;
  paymentMethod: string;
  notes?:        string | null;
  customerName?:    string | null;
  customerPhone?:   string | null;
  customerEmail?:   string | null;
  customerAddress?: string | null;
  subtotal:      number;
  discountAmount: number;
  taxAmount:     number;
  total:         number;
  taxRate:       number;
  discountValue: number;
  discountType:  string;
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

const BRAND   = '#6C5CE7';
const DARK    = '#1A1A2E';
const GREY    = '#64748B';
const LIGHT   = '#F1F5F9';

export async function generateInvoicePDF(data: InvoiceData): Promise<Buffer> {
  // Generate QR code as PNG buffer
  const qrBuffer = await QRCode.toBuffer(
    `INV:${data.invoiceNumber}|TOTAL:${data.total}|DATE:${data.issuedAt.toISOString().slice(0, 10)}`,
    { width: 80, margin: 1, color: { dark: '#000000', light: '#FFFFFF' } },
  );

  return new Promise<Buffer>((resolve, reject) => {
    const doc    = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true });
    const chunks: Buffer[] = [];

    doc.on('data',  (c) => chunks.push(c));
    doc.on('end',   ()  => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const W = doc.page.width - 100; // usable width

    // ── Header bar ──────────────────────────────────────────────────────────
    doc.rect(50, 50, W, 70).fill(DARK);

    doc.fillColor('white')
       .font('Helvetica-Bold').fontSize(22)
       .text('DaralIraq', 65, 65);

    doc.fillColor('#A0AEC0')
       .font('Helvetica').fontSize(9)
       .text('Enterprise Inventory & Sales Platform', 65, 90);

    doc.fillColor('white')
       .font('Helvetica-Bold').fontSize(20)
       .text('INVOICE', 0, 72, { align: 'right', width: W + 50 });

    // ── Invoice meta ────────────────────────────────────────────────────────
    let y = 140;

    doc.fillColor(BRAND).font('Helvetica-Bold').fontSize(13)
       .text(data.invoiceNumber, 50, y);

    doc.fillColor(GREY).font('Helvetica').fontSize(9)
       .text(`Issued: ${data.issuedAt.toLocaleDateString('en-GB')}`, 50, y + 18)
       .text(`Status: ${data.status}`, 50, y + 30)
       .text(`Payment: ${data.paymentMethod}`, 50, y + 42);

    // QR code
    doc.image(qrBuffer, W - 20, y - 5, { width: 80 });

    // ── Divider ─────────────────────────────────────────────────────────────
    y = 200;
    doc.moveTo(50, y).lineTo(W + 50, y).strokeColor(LIGHT).lineWidth(1).stroke();

    // ── Bill to ─────────────────────────────────────────────────────────────
    y = 215;
    doc.fillColor(GREY).font('Helvetica-Bold').fontSize(8)
       .text('BILL TO', 50, y);

    doc.fillColor(DARK).font('Helvetica-Bold').fontSize(11)
       .text(data.customerName ?? 'Walk-in Customer', 50, y + 12);

    if (data.customerPhone)
      doc.fillColor(GREY).font('Helvetica').fontSize(9).text(data.customerPhone, 50, y + 26);
    if (data.customerEmail)
      doc.fillColor(GREY).font('Helvetica').fontSize(9).text(data.customerEmail, 50, y + 38);
    if (data.customerAddress)
      doc.fillColor(GREY).font('Helvetica').fontSize(9).text(data.customerAddress, 50, y + 50);

    doc.fillColor(GREY).font('Helvetica-Bold').fontSize(8)
       .text('ISSUED BY', W - 100, y);
    doc.fillColor(DARK).font('Helvetica').fontSize(9)
       .text(data.createdBy.name, W - 100, y + 12);

    // ── Items table header ───────────────────────────────────────────────────
    y = 295;
    doc.rect(50, y, W, 22).fill(DARK);

    // Columns: ITEM | SKU | QTY | ORIG | DISC% | SALE | TOTAL
    const cols = { item: 50, sku: 185, qty: 272, orig: 308, disc: 358, sale: 403, total: 450 };

    doc.fillColor('white').font('Helvetica-Bold').fontSize(7.5);
    doc.text('ITEM',       cols.item + 5, y + 7);
    doc.text('SKU',        cols.sku  + 5, y + 7);
    doc.text('QTY',        cols.qty  + 5, y + 7);
    doc.text('ORIG',       cols.orig + 5, y + 7);
    doc.text('DISC%',      cols.disc + 5, y + 7);
    doc.text('SALE',       cols.sale + 5, y + 7);
    doc.text('TOTAL',      cols.total + 5, y + 7);

    // ── Items rows ───────────────────────────────────────────────────────────
    y += 22;
    data.items.forEach((item, i) => {
      const hasDiscount  = item.discount > 0;
      const origPrice    = parseFloat((item.unitPrice + item.discount).toFixed(2));
      const discountPct  = hasDiscount
        ? parseFloat(((item.discount / origPrice) * 100).toFixed(1))
        : 0;

      const rowBg = i % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
      doc.rect(50, y, W, 22).fill(rowBg);

      doc.fillColor(DARK).font('Helvetica').fontSize(7.5);
      doc.text(item.productName.slice(0, 24), cols.item + 5, y + 7, { width: 130 });
      doc.text(item.productSku ?? '-',        cols.sku  + 5, y + 7, { width: 80 });
      doc.text(String(item.quantity),         cols.qty  + 5, y + 7);

      if (hasDiscount) {
        // ORIG: show original price in grey with strikethrough line
        doc.fillColor(GREY).font('Helvetica').fontSize(7.5)
           .text(`$${origPrice.toFixed(2)}`, cols.orig + 5, y + 7);
        const origTextWidth = doc.widthOfString(`$${origPrice.toFixed(2)}`);
        doc.moveTo(cols.orig + 5, y + 11)
           .lineTo(cols.orig + 5 + origTextWidth, y + 11)
           .strokeColor(GREY).lineWidth(0.7).stroke();

        // DISC%: show percentage in red/warning
        doc.fillColor('#E53E3E').font('Helvetica-Bold').fontSize(7.5)
           .text(`-${discountPct}%`, cols.disc + 5, y + 7);

        // SALE: sale price in brand color
        doc.fillColor(BRAND).font('Helvetica-Bold').fontSize(7.5)
           .text(`$${item.unitPrice.toFixed(2)}`, cols.sale + 5, y + 7);
      } else {
        // No discount — show price only in SALE column, dash in ORIG and DISC
        doc.fillColor(GREY).fontSize(7.5).text('-', cols.orig + 5, y + 7);
        doc.fillColor(GREY).text('-', cols.disc + 5, y + 7);
        doc.fillColor(DARK).font('Helvetica').fontSize(7.5)
           .text(`$${item.unitPrice.toFixed(2)}`, cols.sale + 5, y + 7);
      }

      doc.fillColor(DARK).font('Helvetica-Bold').fontSize(7.5)
         .text(`$${item.total.toFixed(2)}`, cols.total + 5, y + 7);

      y += 22;
    });

    // ── Totals ───────────────────────────────────────────────────────────────
    y += 10;
    const totalsX = W - 110;

    const addRow = (label: string, value: string, bold = false, color = DARK) => {
      doc.fillColor(GREY).font('Helvetica').fontSize(9).text(label, totalsX, y);
      doc.fillColor(color).font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(9)
         .text(value, totalsX + 70, y, { align: 'right', width: 90 });
      y += 16;
    };

    addRow('Subtotal',  `$${data.subtotal.toFixed(2)}`);
    if (data.discountAmount > 0)
      addRow(`Discount (${data.discountType === 'PERCENTAGE' ? data.discountValue + '%' : 'Fixed'})`,
             `-$${data.discountAmount.toFixed(2)}`);
    if (data.taxAmount > 0)
      addRow(`Tax (${data.taxRate}%)`, `$${data.taxAmount.toFixed(2)}`);

    // Total line
    doc.moveTo(totalsX, y).lineTo(W + 50, y).strokeColor(BRAND).lineWidth(1).stroke();
    y += 6;
    addRow('TOTAL', `$${data.total.toFixed(2)}`, true, BRAND);

    // ── Notes ────────────────────────────────────────────────────────────────
    if (data.notes) {
      y += 10;
      doc.fillColor(GREY).font('Helvetica-Bold').fontSize(8).text('NOTES', 50, y);
      doc.fillColor(DARK).font('Helvetica').fontSize(9).text(data.notes, 50, y + 12, { width: W });
    }

    // ── Footer ───────────────────────────────────────────────────────────────
    const footerY = doc.page.height - 60;
    doc.rect(50, footerY, W, 1).fill(LIGHT);
    doc.fillColor(GREY).font('Helvetica').fontSize(8)
       .text('Thank you for your business — DaralIraq Enterprise v3.0',
             50, footerY + 8, { align: 'center', width: W });

    doc.end();
  });
}
