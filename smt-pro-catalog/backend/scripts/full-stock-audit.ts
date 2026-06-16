import prisma from '../src/config/prisma';

async function main() {
  // All products
  const products = await prisma.product.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true, sku: true, quantity: true },
    orderBy: { id: 'asc' },
  });

  // All non-cancelled order items (what was sold, stock decremented at order time)
  const orderItems = await prisma.orderItem.findMany({
    where: { order: { status: { not: 'CANCELLED' } } },
    select: { productId: true, quantity: true },
  });
  const soldByProductId = new Map<number, number>();
  for (const oi of orderItems) {
    soldByProductId.set(oi.productId, (soldByProductId.get(oi.productId) ?? 0) + oi.quantity);
  }

  // All non-cancelled invoice items (what was invoiced, may differ from orders if edited)
  const invoiceItems = await prisma.invoiceItem.findMany({
    where: { invoice: { status: { not: 'CANCELLED' } } },
    select: { productSku: true, productName: true, quantity: true },
  });
  const invoicedByKey = new Map<string, number>();
  for (const ii of invoiceItems) {
    const k = ii.productSku?.trim() ? `sku:${ii.productSku.trim()}` : `name:${ii.productName.trim()}`;
    invoicedByKey.set(k, (invoicedByKey.get(k) ?? 0) + ii.quantity);
  }

  console.log('=== FULL STOCK AUDIT ===\n');

  let totalCurrentStock = 0;
  let totalSoldViaOrders = 0;
  let totalInvoiced = 0;
  let totalCorrection = 0;

  console.log('ID  | Product Name              | Stock NOW | Sold(Orders) | Invoiced | Gap(inv-ord) | Stock AFTER fix');
  console.log('----+--------------------------+-----------+--------------+----------+--------------+----------------');

  for (const p of products) {
    const soldViaOrders = soldByProductId.get(p.id) ?? 0;
    const pKey = p.sku?.trim() ? `sku:${p.sku.trim()}` : `name:${p.name.trim()}`;
    const invoiced = invoicedByKey.get(pKey) ?? 0;
    const gap = invoiced - soldViaOrders; // positive = invoice has MORE than what was deducted from stock
    const correctedStock = Math.max(0, p.quantity - gap);

    totalCurrentStock   += p.quantity;
    totalSoldViaOrders  += soldViaOrders;
    totalInvoiced       += invoiced;
    totalCorrection     += gap;

    const flag = gap !== 0 ? ' <-- NEEDS FIX' : '';
    const id   = String(p.id).padEnd(3);
    const name = p.name.substring(0, 24).padEnd(24);
    const s    = String(p.quantity).padStart(9);
    const o    = String(soldViaOrders).padStart(12);
    const i    = String(invoiced).padStart(8);
    const g    = String(gap).padStart(12);
    const c    = String(correctedStock).padStart(15);
    console.log(`${id} | ${name} | ${s} | ${o} | ${i} | ${g} | ${c}${flag}`);
  }

  console.log('\n=== SUMMARY ===');
  console.log(`Total units in DB right now:       ${totalCurrentStock}`);
  console.log(`Total units decremented (orders):  ${totalSoldViaOrders}`);
  console.log(`Total units in invoices:           ${totalInvoiced}`);
  console.log(`Gap (stock overcounted by):        ${totalCorrection}`);
  console.log(`Correct total after fix:           ${totalCurrentStock - totalCorrection}`);

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
