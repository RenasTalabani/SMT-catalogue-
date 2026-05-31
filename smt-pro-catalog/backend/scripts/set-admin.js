require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.update({
    where: { email: 'admin@smt.com' },
    data:  { role: 'admin' },
  });
  console.log('Role updated:', user.role, '—', user.name);
}

main().finally(() => prisma.$disconnect());
