require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const employee = await prisma.employee.findFirst({
      select: { email: true, firstName: true }
    });
    if (employee) {
      console.log('FOUND_EMPLOYEE:' + employee.email + '|' + employee.firstName);
    } else {
      console.log('NO_EMPLOYEE_FOUND');
    }
  } catch (err) {
    console.error('ERROR:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
