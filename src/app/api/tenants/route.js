// Created At: 2026-04-10 03:00:00 +07:00 (v1.0.0)
// Previous version: 2026-04-10 03:00:00 +07:00 (v1.0.0)
// Last Updated: 2026-04-10 04:00:00 +07:00 (v1.1.0)

import { NextResponse } from 'next/server'
import { getPrisma } from '@/lib/db'
import { withAuth } from '@/lib/auth'

const prisma = getPrisma()

/**
 * GET /api/tenants — List all tenants (DEV only — system domain)
 */
export const GET = withAuth(async () => {
  const tenants = await prisma.tenant.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      tenantSlug: true,
      tenantName: true,
      plan: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  })
  return NextResponse.json({ data: tenants })
}, { domain: 'system', action: 'F' })

/**
 * POST /api/tenants — Create tenant (DEV only)
 */
export const POST = withAuth(async (req) => {
  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  try {
    const tenant = await prisma.tenant.create({
      data: {
        tenantName: body.tenantName,
        tenantSlug: body.tenantSlug,
        plan:       body.plan ?? 'STARTER',
        isActive:   true,
      },
    })
    return NextResponse.json({ data: tenant }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/tenants]', err)
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}, { domain: 'system', action: 'F' })
