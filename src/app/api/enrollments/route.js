// Created At: 2026-04-12 08:10:00 +07:00 (v1.0.0)
// Previous version: —
// Last Updated: 2026-04-12 08:10:00 +07:00 (v1.0.0)

import { NextResponse } from 'next/server'
import { getTenantId } from '@/lib/tenant'
import { withAuth } from '@/lib/auth'
import { findMany, create } from '@/lib/repositories/enrollmentRepo'

export const dynamic = 'force-dynamic'

/**
 * GET /api/enrollments
 * Query params: productId, limit, skip
 */
export const GET = withAuth(async (request) => {
  try {
    const tenantId = await getTenantId(request)
    if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('productId') || undefined
    const limit = parseInt(searchParams.get('limit') ?? '50')
    const skip = parseInt(searchParams.get('skip') ?? '0')

    const enrollments = await findMany(tenantId, { limit, skip, productId })
    return NextResponse.json({ data: enrollments })
  } catch (error) {
    console.error('[Enrollments_GET]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}, { domain: 'enrollments', action: 'R' })

/**
 * POST /api/enrollments
 * Body: { customerId, productId, totalPrice?, notes? }
 * Creates PENDING enrollment (orderId optional — full POS link is Phase 2)
 */
export const POST = withAuth(async (request) => {
  try {
    const tenantId = await getTenantId(request)
    if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { customerId, productId, totalPrice, notes } = body

    if (!customerId || !productId) {
      return NextResponse.json({ error: 'customerId และ productId จำเป็น' }, { status: 400 })
    }

    // Generate enrollmentId: ENR-YYYYMMDD-XXX
    const today = new Date()
    const datePart = today.toISOString().slice(0, 10).replace(/-/g, '')
    const serial = String(Math.floor(Math.random() * 900) + 100) // 3-digit random (good enough for v1)
    const enrollmentId = `ENR-${datePart}-${serial}`

    const enrollment = await create({
      enrollmentId,
      tenantId,
      customerId,
      productId,
      totalPrice: totalPrice ?? 0,
      status: 'PENDING',
      ...(notes ? { notes } : {}),
    })

    return NextResponse.json({ data: enrollment }, { status: 201 })
  } catch (error) {
    console.error('[Enrollments_POST]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}, { domain: 'enrollments', action: 'F' })
