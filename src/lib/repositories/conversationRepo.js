// Created At: 2026-04-12 05:40:00 +07:00 (v1.3.19)
// Previous version: 2026-04-11 20:35:13 +07:00 (v1.2.0)
// Last Updated: 2026-04-12 05:40:00 +07:00 (v1.3.19)

import { getPrisma } from '@/lib/db'

/**
 * List conversations for inbox (with last message preview)
 */
export async function findMany(tenantId, { channel, status, limit = 50, offset = 0 } = {}) {
  const prisma = await getPrisma()
  const where = { tenantId }
  if (channel) where.channel = channel
  if (status)  where.status  = status

  return prisma.conversation.findMany({
    where,
    take: limit,
    skip: offset,
    orderBy: { updatedAt: 'desc' },
    include: {
      customer: {
        select: {
          id: true,
          customerId: true,
          facebookName: true,
          phonePrimary: true,
          lifecycleStage: true,
          intentScore: true,
          churnScore: true,
          intelligence: true,
        },
      },
      messages: { take: 1, orderBy: { createdAt: 'desc' } },
    },
  })
}

/**
 * Legacy — used by DSB worker
 */
export async function getConversations({ tenantId, date, limit = 50, offset = 0 } = {}) {
  const prisma = await getPrisma()
  const where = { tenantId }

  if (date) {
    const start = new Date(date)
    start.setHours(0, 0, 0, 0)
    const end = new Date(date)
    end.setHours(23, 59, 59, 999)
    where.updatedAt = { gte: start, lte: end }
  }

  return prisma.conversation.findMany({
    where,
    take: limit,
    skip: offset,
    orderBy: { updatedAt: 'desc' },
    include: {
      customer: true,
      messages: { take: 5, orderBy: { createdAt: 'desc' } },
    },
  })
}

/**
 * Find by external platform conversationId (PSID thread / LINE userId)
 */
export async function findByConversationId(conversationId) {
  const prisma = await getPrisma()
  return prisma.conversation.findUnique({
    where: { conversationId },
    include: {
      customer: { include: { insight: true } },
    },
  })
}

/**
 * Find by internal UUID (tenantId-scoped for security)
 */
export async function getConversationById({ tenantId, id }) {
  const prisma = await getPrisma()
  return prisma.conversation.findFirst({
    where: { id, tenantId },
    include: {
      customer: { include: { insight: true } },
    },
  })
}

/**
 * Upsert conversation — called by webhook inbound handlers
 */
export async function upsertConversation(tenantId, conversationId, data) {
  const prisma = await getPrisma()
  return prisma.conversation.upsert({
    where: { conversationId },
    create: { ...data, tenantId, conversationId },
    update: { ...data, updatedAt: new Date() },
  })
}

/**
 * Get messages for a conversation (ordered oldest → newest)
 * @param {string} conversationId  — internal UUID (Conversation.id)
 */
export async function getMessages(conversationId, limit = 50) {
  const prisma = await getPrisma()
  return prisma.message.findMany({
    where: { conversationId },
    take: limit,
    orderBy: { createdAt: 'asc' },
  })
}

/**
 * Append a single message to a conversation
 * @param {string} conversationId  — internal UUID (Conversation.id)
 */
export async function appendMessage({ conversationId, message, direction = 'outbound', responderId = null, externalMessageId = null }) {
  const prisma = await getPrisma()
  const messageId = externalMessageId ?? `MSG-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
  return prisma.message.create({
    data: {
      messageId,
      conversationId,
      sender: direction === 'outbound' ? 'staff' : 'customer',
      content: message ?? null,
      responderId,
    },
  })
}

/**
 * Get the latest N messages for a customer across all their conversations
 */
export async function getCustomerMessages(tenantId, customerId, limit = 30) {
  const prisma = await getPrisma()
  return prisma.message.findMany({
    where: {
      conversation: { tenantId, customerId },
    },
    take: limit,
    orderBy: { createdAt: 'desc' },
  })
}

/**
 * Upsert customer by facebookId — called by Facebook webhook
 */
export async function upsertFacebookCustomer(tenantId, { psid, name }) {
  const prisma = await getPrisma()
  const { generateCustomerId } = await import('@/lib/idGenerator')
  return prisma.customer.upsert({
    where: { facebookId: psid },
    create: {
      customerId:   await generateCustomerId('FB'),
      tenantId,
      facebookId:   psid,
      facebookName: name ?? null,
      lifecycleStage: 'LEAD',
    },
    update: {
      facebookName: name ?? undefined,
    },
  })
}

/**
 * Upsert customer by lineId — called by LINE webhook
 */
export async function upsertLineCustomer(tenantId, { lineUserId, displayName }) {
  const prisma = await getPrisma()
  const { generateCustomerId } = await import('@/lib/idGenerator')
  const existing = await prisma.customer.findFirst({
    where: { tenantId, lineId: lineUserId },
  })
  if (existing) {
    return prisma.customer.update({
      where: { id: existing.id },
      data: { facebookName: displayName ?? undefined },
    })
  }
  return prisma.customer.create({
    data: {
      customerId:     await generateCustomerId('LINE'),
      tenantId,
      lineId:         lineUserId,
      facebookName:   displayName ?? null,
      lifecycleStage: 'LEAD',
    },
  })
}

/**
 * Unified inbound message processor — called by FB/LINE webhooks
 * Standardizes: upsert conv -> append msg -> Pusher broadcast -> Redis bump
 */
export async function recordInboundMessage({ tenantId, customerId, conversationId, channel, participantId, text, externalId }) {
  const { triggerEvent } = await import('@/lib/pusher')
  const { getRedis }     = await import('@/lib/redis')

  // 1. Upsert Conversation
  const conv = await upsertConversation(tenantId, conversationId, {
    channel,
    participantId,
    customerId,
    status: 'open',
  })

  // 2. Append Message
  const saved = await appendMessage({
    conversationId: conv.id,
    message:        text,
    direction:      'inbound',
    externalMessageId: externalId,
  })

  // 3. Broadcast real-time update
  await triggerEvent(`tenant-${tenantId}`, 'new-message', {
    conversationId: conv.id,
    message: {
      id:        saved.id,
      sender:    'customer',
      content:   saved.content,
      createdAt: saved.createdAt,
    },
  })

  // 4. Invalidate List Cache Version
  await getRedis().incr(`inbox:${tenantId}:version`).catch(() => null)

  return { conversation: conv, message: saved }
}

/**
 * Count open (pending) conversations for the dashboard
 */
export async function countOpenConversations(tenantId) {
  const prisma = await getPrisma()
  return prisma.conversation.count({
    where: {
      tenantId,
      status: 'OPEN'
    }
  })
}
