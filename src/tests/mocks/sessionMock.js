export const MOCK_TENANT_ID = '10000000-0000-0000-0000-000000000001'
export const MOCK_EMPLOYEE_ID = 'emp-test-001'

export function mockSession(overrides = {}) {
  return {
    user: {
      id: MOCK_EMPLOYEE_ID,
      roles: ['ADM'],
      tenantId: MOCK_TENANT_ID,
      ...overrides,
    },
  }
}

export function mockRequest(tenantId = MOCK_TENANT_ID) {
  return {
    headers: {
      get: (key) => {
        if (key === 'x-tenant-id') return tenantId
        return null
      },
    },
  }
}
