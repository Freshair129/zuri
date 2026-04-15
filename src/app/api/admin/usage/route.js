// Created At: 2026-04-10 04:00:00 +07:00 (v1.0.0)
// Previous version: —
// Last Updated: 2026-04-10 04:00:00 +07:00 (v1.0.0)

import { NextResponse } from 'next/server'
import { getPrisma } from '@/lib/db'
import { withAuth } from '@/lib/auth'

const prisma = getPrisma()

/**
 * GET /api/admin/usage
 * Platform-wide usage stats per tenant (messages, conversations, customers last 30d).
 * DEV only.
 */
export const GET = withAuth(async () => {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  const [tenants, msgRows, convRows, custRows] = await Promise.all([
    // All tenants
    prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' },
      select: { id: true, tenantSlug: true, tenantName: true, plan: true, isActive: true, createdAt: true },
    }),
    // Messages per tenant in last 30d (via conversation join)
    prisma.$queryRaw`
      SELECT c.tenant_id AS "tenantId", COUNT(m.id)::int AS count
      FROM messages m
      JOIN conversations c ON m.conversation_id = c.id
      WHERE m.created_at >= ${since}
      GROUP BY c.tenant_id
    `,
    // Conversations per tenant in last 30d
    prisma.$queryRaw`
      SELECT tenant_id AS "tenantId", COUNT(id)::int AS count
      FROM conversations
      WHERE created_at >= ${since}
      GROUP BY tenant_id
    `,
    // Total customers per tenant (non-deleted)
    prisma.$queryRaw`
      SELECT tenant_id AS "tenantId", COUNT(id)::int AS count
      FROM customers
      WHERE deleted_at IS NULL
      GROUP BY tenant_id
    `,
  ])

  const msgMap  = Object.fromEntries(msgRows.map((r)  => [r.tenantId, r.count]))
  const convMap = Object.fromEntries(convRows.map((r) => [r.tenantId, r.count]))
  const custMap = Object.fromEntries(custRows.map((r) => [r.tenantId, r.count]))

  const rows = tenants.map((t) => ({
    ...t,
    messages30d:      msgMap[t.id]  ?? 0,
    conversations30d: convMap[t.id] ?? 0,
    totalCustomers:   custMap[t.id] ?? 0,
  }))

  const totals = {
    tenants:          tenants.length,
    activeTenants:    tenants.filter((t) => t.isActive).length,
    messages30d:      rows.reduce((s, r) => s + r.messages30d, 0),
    conversations30d: rows.reduce((s, r) => s + r.conversations30d, 0),
    totalCustomers:   rows.reduce((s, r) => s + r.totalCustomers, 0),
  }

  return NextResponse.json({ data: rows, totals })
}, { domain: 'system', action: 'F' })
