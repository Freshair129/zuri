import { z } from 'zod'

/**
 * Thai E.164 phone number: +66 followed by 9 digits (e.g. +66812345678)
 */
export const phoneSchema = z
  .string()
  .regex(/^\+66[0-9]{9}$/, 'หมายเลขโทรศัพท์ไม่ถูกต้อง (ต้องอยู่ในรูป E.164 เช่น +66812345678)')

/**
 * Standard email address.
 */
export const emailSchema = z
  .string()
  .email('อีเมลไม่ถูกต้อง')

/**
 * Order schema: items array, customerId, paymentMethod.
 */
export const orderSchema = z.object({
  customerId: z.string().min(1, 'กรุณาระบุลูกค้า'),
  paymentMethod: z.enum(['cash', 'transfer', 'credit_card', 'promptpay'], {
    errorMap: () => ({ message: 'วิธีการชำระเงินไม่ถูกต้อง' }),
  }),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().int().positive('จำนวนต้องมากกว่า 0'),
        unitPrice: z.number().nonnegative(),
      })
    )
    .min(1, 'ต้องมีสินค้าอย่างน้อย 1 รายการ'),
})

/**
 * Task schema: title, taskType, dueDate, startDate.
 */
export const taskSchema = z.object({
  title: z.string().min(1, 'กรุณาระบุชื่องาน'),
  taskType: z.string().min(1, 'กรุณาระบุประเภทงาน'),
  startDate: z.coerce.date(),
  dueDate: z.coerce.date(),
}).refine((data) => data.dueDate >= data.startDate, {
  message: 'วันครบกำหนดต้องไม่ก่อนวันเริ่มต้น',
  path: ['dueDate'],
})

/**
 * Customer schema: name, phone, email.
 */
export const customerSchema = z.object({
  name: z.string().min(1, 'กรุณาระบุชื่อลูกค้า'),
  phone: phoneSchema,
  email: emailSchema.optional().or(z.literal('')),
})
