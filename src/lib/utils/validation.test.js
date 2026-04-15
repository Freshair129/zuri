import { describe, it, expect } from 'vitest'
import {
  phoneSchema,
  emailSchema,
  orderSchema,
  taskSchema,
  customerSchema,
} from '@/lib/utils/validation'

// ─────────────────────────────────────────────────────────────────────────────
// phoneSchema
// ─────────────────────────────────────────────────────────────────────────────
describe('phoneSchema', () => {
  it('should accept a valid E.164 Thai mobile number', () => {
    expect(() => phoneSchema.parse('+66812345678')).not.toThrow()
  })

  it('should accept another valid mobile number', () => {
    expect(() => phoneSchema.parse('+66987654321')).not.toThrow()
  })

  it('should reject a number without +66 prefix', () => {
    const result = phoneSchema.safeParse('0812345678')
    expect(result.success).toBe(false)
  })

  it('should reject a number shorter than 9 digits after +66', () => {
    const result = phoneSchema.safeParse('+6681234567') // only 8 digits after +66
    expect(result.success).toBe(false)
  })

  it('should reject a number longer than 9 digits after +66', () => {
    const result = phoneSchema.safeParse('+668123456789') // 10 digits after +66
    expect(result.success).toBe(false)
  })

  it('should reject non-numeric characters after +66', () => {
    const result = phoneSchema.safeParse('+66ABC345678')
    expect(result.success).toBe(false)
  })

  it('should reject empty string', () => {
    const result = phoneSchema.safeParse('')
    expect(result.success).toBe(false)
  })

  it('should include Thai error message on failure', () => {
    const result = phoneSchema.safeParse('bad-number')
    expect(result.error?.issues[0]?.message).toContain('E.164')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// emailSchema
// ─────────────────────────────────────────────────────────────────────────────
describe('emailSchema', () => {
  it('should accept a valid email', () => {
    expect(() => emailSchema.parse('boss@zuri.app')).not.toThrow()
  })

  it('should accept email with plus addressing', () => {
    expect(() => emailSchema.parse('boss+test@zuri.app')).not.toThrow()
  })

  it('should reject an email without @', () => {
    const result = emailSchema.safeParse('notanemail')
    expect(result.success).toBe(false)
  })

  it('should reject an email without domain', () => {
    const result = emailSchema.safeParse('user@')
    expect(result.success).toBe(false)
  })

  it('should reject empty string', () => {
    const result = emailSchema.safeParse('')
    expect(result.success).toBe(false)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// orderSchema
// ─────────────────────────────────────────────────────────────────────────────
describe('orderSchema', () => {
  const validOrder = {
    customerId: 'CUST-001',
    paymentMethod: 'cash',
    items: [{ productId: 'PRD-001', quantity: 2, unitPrice: 150 }],
  }

  it('should accept a valid order', () => {
    expect(() => orderSchema.parse(validOrder)).not.toThrow()
  })

  it('should accept all valid payment methods', () => {
    const methods = ['cash', 'transfer', 'credit_card', 'promptpay']
    for (const paymentMethod of methods) {
      expect(() => orderSchema.parse({ ...validOrder, paymentMethod })).not.toThrow()
    }
  })

  it('should reject an invalid payment method', () => {
    const result = orderSchema.safeParse({ ...validOrder, paymentMethod: 'bitcoin' })
    expect(result.success).toBe(false)
  })

  it('should reject empty items array', () => {
    const result = orderSchema.safeParse({ ...validOrder, items: [] })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toContain('สินค้า')
  })

  it('should reject item with quantity = 0', () => {
    const result = orderSchema.safeParse({
      ...validOrder,
      items: [{ productId: 'PRD-001', quantity: 0, unitPrice: 100 }],
    })
    expect(result.success).toBe(false)
  })

  it('should reject item with negative quantity', () => {
    const result = orderSchema.safeParse({
      ...validOrder,
      items: [{ productId: 'PRD-001', quantity: -1, unitPrice: 100 }],
    })
    expect(result.success).toBe(false)
  })

  it('should reject item with negative unitPrice', () => {
    const result = orderSchema.safeParse({
      ...validOrder,
      items: [{ productId: 'PRD-001', quantity: 1, unitPrice: -10 }],
    })
    expect(result.success).toBe(false)
  })

  it('should accept item with unitPrice = 0 (free item)', () => {
    expect(() => orderSchema.parse({
      ...validOrder,
      items: [{ productId: 'PRD-001', quantity: 1, unitPrice: 0 }],
    })).not.toThrow()
  })

  it('should reject missing customerId', () => {
    const { customerId, ...rest } = validOrder
    const result = orderSchema.safeParse(rest)
    expect(result.success).toBe(false)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// taskSchema
// ─────────────────────────────────────────────────────────────────────────────
describe('taskSchema', () => {
  const validTask = {
    title: 'เตรียมวัตถุดิบ',
    taskType: 'kitchen',
    startDate: '2026-04-08',
    dueDate: '2026-04-10',
  }

  it('should accept a valid task', () => {
    expect(() => taskSchema.parse(validTask)).not.toThrow()
  })

  it('should accept dueDate equal to startDate (same day)', () => {
    expect(() => taskSchema.parse({ ...validTask, dueDate: validTask.startDate })).not.toThrow()
  })

  it('should reject dueDate before startDate', () => {
    const result = taskSchema.safeParse({
      ...validTask,
      startDate: '2026-04-10',
      dueDate: '2026-04-08',
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toContain('วันครบกำหนด')
  })

  it('should reject empty title', () => {
    const result = taskSchema.safeParse({ ...validTask, title: '' })
    expect(result.success).toBe(false)
  })

  it('should reject empty taskType', () => {
    const result = taskSchema.safeParse({ ...validTask, taskType: '' })
    expect(result.success).toBe(false)
  })

  it('should coerce string dates to Date objects', () => {
    const parsed = taskSchema.parse(validTask)
    expect(parsed.startDate).toBeInstanceOf(Date)
    expect(parsed.dueDate).toBeInstanceOf(Date)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// customerSchema
// ─────────────────────────────────────────────────────────────────────────────
describe('customerSchema', () => {
  const validCustomer = {
    name: 'สมชาย ใจดี',
    phone: '+66812345678',
    email: 'somchai@example.com',
  }

  it('should accept a valid customer with email', () => {
    expect(() => customerSchema.parse(validCustomer)).not.toThrow()
  })

  it('should accept a customer without email (optional field)', () => {
    const { email, ...withoutEmail } = validCustomer
    expect(() => customerSchema.parse(withoutEmail)).not.toThrow()
  })

  it('should accept empty string for email (optional)', () => {
    expect(() => customerSchema.parse({ ...validCustomer, email: '' })).not.toThrow()
  })

  it('should reject invalid phone number', () => {
    const result = customerSchema.safeParse({ ...validCustomer, phone: '0812345678' })
    expect(result.success).toBe(false)
  })

  it('should reject invalid email', () => {
    const result = customerSchema.safeParse({ ...validCustomer, email: 'not-an-email' })
    expect(result.success).toBe(false)
  })

  it('should reject empty name', () => {
    const result = customerSchema.safeParse({ ...validCustomer, name: '' })
    expect(result.success).toBe(false)
  })
})
