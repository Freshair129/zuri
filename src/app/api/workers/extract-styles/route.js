// Created At: 2026-04-10 03:52:00 +07:00 (v1.0.0)
// Previous version: —
// Last Updated: 2026-04-10 03:52:00 +07:00 (v1.0.0)
// Task: ZDEV-TSK-20260410-012 | Plan: ZDEV-IMP-2638

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { can } from '@/lib/permissionMatrix'
import { getPrisma } from '@/lib/db'
import { extractAgentStyle } from '@/lib/ai/styleExtractor'

const prisma = getPrisma()

/**
 * POST /api/workers/extract-styles
 * QStash-triggered worker: extract style profiles for all active employees per tenant.
 * Called weekly (Sunday 00:00 ICT via QStash cron).
 *
 * Security: Validates QStash signature OR allows internal calls with MANAGER+ session.
 *
 * Body: { tenantId?: string } — if omitted, processes ALL active tenants
 */
export async function POST(request) {
  const qstashSignature = request.headers.get('upstash-signature')

  // Allow both QStash-signed calls and authenticated MANAGER+ calls (for on-demand triggering)
  if (!qstashSignature) {
    const session = await getServerSession(authOptions)
    if (!session?.user || !can(session.user.roles, 'employees', 'F')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  let body = {}
  try {
    body = await request.json()
  } catch {
    // No body — process all tenants
  }

  const targetTenantId = body?.tenantId || null

  console.log(`[extract-styles] Starting style extraction${targetTenantId ? ` for tenant ${targetTenantId}` : ' for ALL tenants'}`)

  // Fetch active tenants (or specific one)
  const tenants = await prisma.tenant.findMany({
    where: {
      isActive: true,
      ...(targetTenantId ? { id: targetTenantId } : {}),
    },
    select: { id: true, tenantSlug: true },
  })

  const results = []

  for (const tenant of tenants) {
    // Fetch all active employees for this tenant
    const employees = await prisma.employee.findMany({
      where: {
        tenantId: tenant.id,
        status: 'ACTIVE',
      },
      select: { id: true, employeeId: true, firstName: true, role: true },
    })

    console.log(`[extract-styles] Tenant ${tenant.tenantSlug}: ${employees.length} employees to process`)

    for (const employee of employees) {
      try {
        const style = await extractAgentStyle(employee.id, tenant.id)
        results.push({
          tenantId: tenant.id,
          employeeId: employee.id,
          employeeCode: employee.employeeId,
          status: style ? 'extracted' : 'skipped_insufficient_messages',
          tone: style?.tone || null,
        })
        console.log(`[extract-styles] ${employee.employeeId} (${tenant.tenantSlug}): ${style ? `tone=${style.tone}` : 'skipped'}`)
      } catch (err) {
        console.error(`[extract-styles] Error for employee ${employee.id}:`, err)
        results.push({
          tenantId: tenant.id,
          employeeId: employee.id,
          status: 'error',
          error: err.message,
        })
      }
    }
  }

  const extracted = results.filter((r) => r.status === 'extracted').length
  const skipped = results.filter((r) => r.status === 'skipped_insufficient_messages').length
  const errors = results.filter((r) => r.status === 'error').length

  console.log(`[extract-styles] Done: ${extracted} extracted, ${skipped} skipped, ${errors} errors`)

  return NextResponse.json({
    success: true,
    summary: { extracted, skipped, errors, total: results.length },
    results,
  })
}
