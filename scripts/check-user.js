const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const employees = await prisma.employee.findMany({
    select: {
      email: true,
      firstName: true,
      lastName: true,
      roles: true,
      tenantId: true
    },
    take: 5
  });
  console.log(JSON.stringify(employees, null, 2));
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
