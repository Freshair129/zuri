/**
 * GET /api/inventory/lots?expiry=all|today|3d|week|expired
 * Returns ingredient lots sorted by expires_at ASC (FEFO).
 *
 * NOTE: ingredient_lots and ingredients are currently global (no tenant_id
 * column). When multi-tenant inventory is added later, this endpoint will
 * need a tenant scope filter — but for now any role with kitchen:R can read.
 *
 * RBAC: kitchen:R
 */
import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { getPrisma } from '@/lib/db'

const prisma = getPrisma()

export const dynamic = 'force-dynamic'

export const GET = withAuth(
  async (request) => {
    try {
      const { searchParams } = new URL(request.url)
      const expiry = searchParams.get('expiry') || 'all'

      const rows = await prisma.$queryRaw`
        SELECT
          l.id,
          l.lot_id        AS "lotId",
          l.initial_qty   AS "initialQty",
          l.remaining_qty AS "remainingQty",
          l.expires_at    AS "expiresAt",
          l.status,
          l.created_at    AS "createdAt",
          i.id            AS "ingredientId",
          i.ingredient_id AS "ingredientCode",
          i.name          AS "ingredientName",
          i.unit,
          i.current_stock AS "currentStock",
          i.min_stock     AS "minStock",
          (l.expires_at::date - CURRENT_DATE)::int AS "daysUntilExpiry"
        FROM ingredient_lots l
        JOIN ingredients i ON l.ingredient_id = i.id
        ORDER BY l.expires_at ASC, l.lot_id ASC
        LIMIT 500
      `

      // Apply expiry filter in JS (cleaner than dynamic SQL)
      const filtered = rows.filter((r) => {
        const days = r.daysUntilExpiry
        switch (expiry) {
          case 'today':   return days === 0
          case '3d':      return days >= 0 && days <= 3
          case 'week':    return days >= 0 && days <= 7
          case 'expired': return days < 0
          default:        return true
        }
      })

      // Roll up summary KPIs
      const summary = rows.reduce(
        (acc, r) => ({
          totalSkus:     acc.totalSkus + 1,
          lowStock:      acc.lowStock + (r.currentStock <= r.minStock ? 1 : 0),
          expiringIn3d:  acc.expiringIn3d + (r.daysUntilExpiry >= 0 && r.daysUntilExpiry <= 3 ? 1 : 0),
          expired:       acc.expired + (r.daysUntilExpiry < 0 ? 1 : 0),
        }),
        { totalSkus: 0, lowStock: 0, expiringIn3d: 0, expired: 0 }
      )

      return NextResponse.json({ lots: filtered, summary })
    } catch (error) {
      console.error('[Inventory_Lots_GET]', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  },
  { domain: 'kitchen', action: 'R' }
)
