import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createMockPrisma } from '@/tests/mocks/prismaMock'

const TENANT = '10000000-0000-0000-0000-000000000001'

describe('taskRepo', () => {
  let mockPrisma

  beforeEach(async () => {
    mockPrisma = createMockPrisma()
    globalThis.__mockPrisma = mockPrisma
    
    // Mock the id generator
    vi.mock('@/lib/idGenerator', () => ({
      generateTaskId: vi.fn().mockResolvedValue('TSK-2026-001')
    }))
  })

  describe('createTask', () => {
    it('should create a task with generated ID and correct tenantId', async () => {
      const { createTask } = await import('./taskRepo.js')
      const data = { title: 'Follow up sales', type: 'FOLLOW_UP' }

      mockPrisma.task.create.mockResolvedValue({ id: 'uuid-1', ...data, taskId: 'TSK-2026-001', tenantId: TENANT })

      const result = await createTask(TENANT, data)

      expect(result.taskId).toBe('TSK-2026-001')
      expect(mockPrisma.task.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: TENANT,
            taskId: 'TSK-2026-001'
          })
        })
      )
    })
  })

  describe('listTasks', () => {
    it('should list tasks with tenantId filtering', async () => {
      const { listTasks } = await import('./taskRepo.js')
      mockPrisma.task.findMany.mockResolvedValue([])
      mockPrisma.task.count.mockResolvedValue(0)

      await listTasks(TENANT, { status: 'PENDING' })

      expect(mockPrisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: TENANT, status: 'PENDING' })
        })
      )
    })
  })

  describe('updateTask', () => {
    it('should set completedAt if status changes to COMPLETED', async () => {
      const { updateTask } = await import('./taskRepo.js')
      const taskId = 'uuid-1'
      
      mockPrisma.task.findFirst.mockResolvedValue({ id: taskId, status: 'PENDING', tenantId: TENANT })
      mockPrisma.task.update.mockResolvedValue({ id: taskId, status: 'COMPLETED' })

      await updateTask(TENANT, taskId, { status: 'COMPLETED' })

      expect(mockPrisma.task.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'COMPLETED',
            completedAt: expect.any(Date)
          })
        })
      )
    })
    
    it('should throw error if task not found', async () => {
      const { updateTask } = await import('./taskRepo.js')
      mockPrisma.task.findFirst.mockResolvedValue(null)

      await expect(updateTask(TENANT, 'wrong-id', { title: 'new' })).rejects.toThrow('Task not found')
    })
  })

  describe('deleteTask', () => {
    it('should delete task only if it belongs to tenant', async () => {
      const { deleteTask } = await import('./taskRepo.js')
      const taskId = 'uuid-1'
      mockPrisma.task.findFirst.mockResolvedValue({ id: taskId, tenantId: TENANT })

      await deleteTask(TENANT, taskId)

      expect(mockPrisma.task.delete).toHaveBeenCalledWith({ where: { id: taskId } })
    })
  })
})
