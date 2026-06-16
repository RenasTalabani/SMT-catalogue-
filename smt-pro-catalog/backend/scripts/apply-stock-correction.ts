import prisma from '../src/config/prisma';

// One-time correction: invoice INV-2026-000015 was edited to higher quantities
// than the original order. Stock was only decremented at order-creation time,
// so the extra invoice quantities were never deducted. This script applies
// the exact delta confirmed by full-stock-audit.ts (read-only audit ran first).
const corrections = [
  { id: 10, name: 'Filler Under Eye',      correctedQty: 650  },
  { id: 11, name: 'Filler Natural Lip',    correctedQty: 3684 },
  { id: 12, name: 'Filler Full Face 5cc',  correctedQty: 3474 },
  { id: 13, name: 'Full Body Filler',      correctedQty: 478  },
  { id: 21, name: 'Filler Volume Lip',     correctedQty: 3330 },
  { id: 22, name: 'Filler Full Face 10cc', correctedQty: 3384 },
  { id: 24, name: 'PLLA 1200mg',           correctedQty: 0    },
];

async function main() {
  console.log('Applying stock corrections...\n');

  for (const c of corrections) {
    const before = await prisma.product.findUnique({
      where: { id: c.id },
      select: { quantity: true, name: true },
    });
    if (!before) { console.log(`SKIP: product #${c.id} not found`); continue; }

    await prisma.product.update({
      where: { id: c.id },
      data: { quantity: c.correctedQty },
    });

    console.log(`✓ #${c.id} ${c.name}: ${before.quantity} → ${c.correctedQty}  (${c.correctedQty - before.quantity})`);
  }

  const total = await prisma.product.aggregate({
    where: { deletedAt: null },
    _sum: { quantity: true },
  });

  console.log(`\nNew total units in stock: ${total._sum.quantity}`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
