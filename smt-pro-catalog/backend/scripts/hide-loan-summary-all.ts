import prisma from '../src/config/prisma';
import { generateInvoicePDF } from '../src/services/pdf.service';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

const BUCKET = 'invoices';

function getSupabase() {
  const url = process.env['SUPABASE_URL'];
  const key = process.env['SUPABASE_SERVICE_KEY'];
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  return createClient(url, key);
}

async function uploadPDF(buffer: Buffer, invoiceNumber: string): Promise<string | null> {
  const supabase = getSupabase();
  const fileName = `${invoiceNumber}-${randomUUID()}.pdf`;
  const { error } = await supabase.storage.from(BUCKET).upload(fileName, buffer, {
    contentType: 'application/pdf',
    upsert: false,
  });
  if (error) { console.error(`  Upload failed: ${error.message}`); return null; }
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(fileName);
  return data.publicUrl;
}

async function main() {
  // Find all loan invoices that still show the loan summary
  const loans = await prisma.invoice.findMany({
    where: { isLoan: true, showLoanSummary: true },
    include: {
      items:    true,
      createdBy: { select: { name: true } },
      payments: { orderBy: { paidAt: 'asc' } },
    },
    orderBy: { id: 'asc' },
  });

  if (loans.length === 0) {
    console.log('No loan invoices with showLoanSummary=true found.');
    return;
  }

  console.log(`Found ${loans.length} loan invoice(s) to update:\n`);

  for (const inv of loans) {
    console.log(`  Processing ${inv.invoiceNumber} (id=${inv.id})...`);

    // 1. Flip the flag in the DB
    await prisma.invoice.update({
      where: { id: inv.id },
      data:  { showLoanSummary: false },
    });

    // 2. Regenerate PDF without the loan summary section
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
      showLoanSummary: false,       // hide the section
      paidAmount:      inv.paidAmount,
      payments:        inv.payments,
      items:           inv.items,
      createdBy:       inv.createdBy,
    });

    // 3. Upload and update the stored PDF URL
    const url = await uploadPDF(buf, inv.invoiceNumber);
    if (url) {
      await prisma.invoice.update({
        where: { id: inv.id },
        data:  { pdfUrl: url },
      });
      console.log(`  ✓ Done — new PDF uploaded`);
    } else {
      console.log(`  ✗ PDF upload failed — DB flag was still updated`);
    }
  }

  console.log(`\nFinished. ${loans.length} invoice(s) updated.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
