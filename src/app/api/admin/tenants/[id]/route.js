// Created At: 2026-04-10 04:00:00 +07:00 (v1.0.0)
// Previous version: —
// Last Updated: 2026-04-10 04:00:00 +07:00 (v1.0.0)

import { NextResponse } from 'next/server'
import { getPrisma } from '@/lib/db'
import { withAuth } from '@/lib/auth'
import { getRedis } from '@/lib/redis'

const prisma = getPrisma()

/**
 * PATCH /api/admin/tenants/[id]
 * Activate or deactivate a tenant. DEV only.
 * Body: { isActive: boolean }
 */
export const PATCH = withAuth(async (req, { params, session }) => {
  const { id } = params

  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { isActive } = body
  if (typeof isActive !== 'boolean') {
    return NextResponse.json({ error: 'isActive must be boolean' }, { status: 400 })
  }

  const tenant = await prisma.tenant.findUnique({ where: { id } })
  if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

  const updated = await prisma.tenant.update({
    where: { id },
    data:  { isActive, updatedAt: new Date() },
    select: { id: true, tenantSlug: true, tenantName: true, plan: true, isActive: true },
  })

  // Bust tenant cache
  await Promise.all([
    getRedis().del(`tenant:id:${id}`),
    getRedis().del(`tenant:slug:${tenant.tenantSlug}`),
    getRedis().del(`tenant:${tenant.tenantSlug}`),
  ]).catch((err) => console.error('[admin/tenants PATCH] cache bust failed', err))

  console.log('[AUDIT][TenantToggle]', {
    adminId:    session.user.id,
    adminEmail: session.user.email,
    tenantId:   id,
    tenantSlug: tenant.tenantSlug,
    isActive,
    timestamp:  new Date().toISOString(),
  })

  return NextResponse.json({ data: updated })
}, { domain: 'system', action: 'F' })
