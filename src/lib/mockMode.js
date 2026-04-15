/**
 * Development Mock Mode Utility
 * Activated if DATABASE_URL or other critical env vars are missing.
 */

export const isMockMode = false;

if (isMockMode && process.env.NODE_ENV !== 'production') {
  console.warn('[Zuri] ⚠️  RUNNING IN MOCK MODE: Local database missing or MOCK_MODE enabled.');
}

export const MOCK_TENANT = {
  id: '10000000-0000-0000-0000-000000000001',
  tenantSlug: 'vschool',
  tenantName: 'V School (Mock)',
  plan: 'PRO',
  isActive: true,
  brandColor: '#795900',
  currency: 'THB',
  vatRate: 7,
  timezone: 'Asia/Bangkok'
};

export const MOCK_ADMIN = {
  id: 'EMP-MOCK-001',
  employeeId: 'EMP-DEV-001',
  tenantId: MOCK_TENANT.id,
  firstName: 'Zuri',
  lastName: 'Admin',
  email: 'admin@vschool.io',
  passwordHash: '$2a$10$dummyhash', // will be bypassed in mock mode
  role: 'OWNER',
  roles: ['OWNER', 'MANAGER', 'DEV'],
  status: 'ACTIVE'
};
