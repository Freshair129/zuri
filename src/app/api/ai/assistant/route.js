// Created At: 2026-04-10 03:50:00 +07:00 (v1.0.0)
// Previous version: —
// Last Updated: 2026-04-10 03:50:00 +07:00 (v1.0.0)

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { redis } from '@/lib/redis'
import { processAssistantMessage } from '@/lib/ai/assistant'

export async function POST(req) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { user } = session
  const userId = user.id
  const tenantId = user.tenantId
  const role = user.role || 'STAFF'

  // 1. Rate Limiting (30 requests per 60 seconds)
  const rateLimitKey = `ratelimit:assistant:${userId}`
  try {
    const current = await redis.incr(rateLimitKey)
    if (current === 1) {
      await redis.expire(rateLimitKey, 60)
    }
    if (current > 30) {
      return NextResponse.json(
        { content: 'ใจเย็นๆ ก่อนนะครับ! คุณใช้งานเกินโควต้า 30 ครั้งต่อนาทีแล้ว ลองใหม่อีกครั้งในนาทีหน้านะครับ' },
        { status: 429 }
      )
    }
  } catch (err) {
    console.error('Redis Rate Limit Error:', err)
    // Continue if redis fails
  }

  // 2. Extract payload
  const { message, history, context } = await req.json()

  if (!message) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 })
  }

  // 3. Process with AI Assistant Pipeline
  const response = await processAssistantMessage({
    message,
    history: history || [],
    role,
    tenantId,
    userId,
    context: context || {}
  })

  return NextResponse.json(response)
}
