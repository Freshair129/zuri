import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createMockPrisma } from '@/tests/mocks/prismaMock'

const TENANT = '10000000-0000-0000-0000-000000000001'

describe('employeeRepo', () => {
  let mockPrisma

  beforeEach(async () => {
    mockPrisma = createMockPrisma()
    globalThis.__mockPrisma = mockPrisma
    
    // Mock the id generator
    vi.mock('@/lib/idGenerator', () => ({
      generateEmployeeId: vi.fn().mockResolvedValue('EMP-GEN-001')
    }))
    
    // Mock bcrypt
    vi.mock('bcryptjs', () => ({
      hash: vi.fn().mockResolvedValue('hashed-password')
    }))
  })

  describe('createEmployee', () => {
    it('should create an employee and generate password hash', async () => {
      const { createEmployee } = await import('./employeeRepo.js')
      const data = { name: 'John Doe', email: 'john@example.com', role: 'MANAGER' }

      mockPrisma.employee.create.mockResolvedValue({ id: 'uuid-1', ...data, tenantId: TENANT })

      const result = await createEmployee({ tenantId: TENANT, ...data })

      expect(mockPrisma.employee.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: TENANT,
            email: 'john@example.com',
            passwordHash: 'hashed-password',
            roles: ['MANAGER']
          })
        })
      )
    })
  })

  describe('updateEmployee', () => {
    it('should update roles if roll is updated', async () => {
      const { updateEmployee } = await import('./employeeRepo.js')
      const empId = 'uuid-1'
      
      mockPrisma.employee.findFirst.mockResolvedValue({ id: empId, tenantId: TENANT })
      mockPrisma.employee.update.mockResolvedValue({ id: empId, role: 'OWNER' })

      await updateEmployee(TENANT, empId, { role: 'OWNER' })

      expect(mockPrisma.employee.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            role: 'OWNER',
            roles: ['OWNER']
          })
        })
      )
    })
  })

  describe('deleteEmployee', () => {
    it('should set status to INACTIVE (soft delete)', async () => {
      const { deleteEmployee } = await import('./employeeRepo.js')
      const empId = 'uuid-1'
      mockPrisma.employee.findFirst.mockResolvedValue({ id: empId, tenantId: TENANT })

      await deleteEmployee(TENANT, empId)

      expect(mockPrisma.employee.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: empId },
          data: { status: 'INACTIVE' }
        })
      )
    })
  })
})
