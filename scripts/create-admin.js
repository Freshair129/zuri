const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

// Manually load .env.local because raw node won't
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, 'utf8');
  envFile.split(/\r?\n/).forEach(line => {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith('#')) return;
    
    const [key, ...rest] = trimmedLine.split('=');
    const value = rest.join('=').trim();
    if (key) {
      process.env[key.trim()] = value.replace(/^["']|["']$/g, '');
    }
  });
}

const prisma = new PrismaClient();

const VSCHOOL_TENANT_ID = '10000000-0000-0000-0000-000000000001';

async function main() {
  const email = 'admin@vschool.io';
  // Following the pattern observed in employeeRepo.js: ${email}_changeme
  const password = `${email}_changeme`;
  const passwordHash = await bcrypt.hash(password, 10);

  console.log('--- Creating Admin User ---');
  console.log('Email:', email);
  console.log('Password:', password);

  try {
    // Ensure tenant exists
    await prisma.tenant.upsert({
      where: { id: VSCHOOL_TENANT_ID },
      update: {},
      create: {
        id: VSCHOOL_TENANT_ID,
        tenantSlug: 'vschool',
        tenantName: 'V School',
        plan: 'PRO',
        isActive: true
      }
    });

    // Create Admin Employee
    const employee = await prisma.employee.upsert({
      where: { email },
      update: {
        passwordHash,
        roles: ['OWNER'],
        role: 'OWNER'
      },
      create: {
        employeeId: 'EMP-ADM-001',
        tenantId: VSCHOOL_TENANT_ID,
        firstName: 'System',
        lastName: 'Administrator',
        email,
        passwordHash,
        role: 'OWNER',
        roles: ['OWNER'],
        status: 'ACTIVE'
      }
    });

    console.log('Success! Admin user created/updated.');
  } catch (error) {
    console.error('Error creating admin:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
