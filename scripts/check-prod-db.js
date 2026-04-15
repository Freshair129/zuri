
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const VSCHOOL_TENANT_ID = '10000000-0000-0000-0000-000000000001';
  try {
    const count = await prisma.product.count({
      where: { tenantId: VSCHOOL_TENANT_ID }
    });
    const posVisibleCount = await prisma.product.count({
      where: { tenantId: VSCHOOL_TENANT_ID, isPosVisible: true }
    });
    const activeCount = await prisma.product.count({
      where: { tenantId: VSCHOOL_TENANT_ID, isActive: true }
    });
    const bothCount = await prisma.product.count({
      where: { tenantId: VSCHOOL_TENANT_ID, isActive: true, isPosVisible: true }
    });
    console.log(`Total Product count: ${count}`);
    console.log(`POS Visible count: ${posVisibleCount}`);
    console.log(`Active count: ${activeCount}`);
    console.log(`Both Active & POS Visible: ${bothCount}`);
  } catch (err) {
    console.error('Database connection error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

check();
