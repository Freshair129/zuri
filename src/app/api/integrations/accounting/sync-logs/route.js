/**
 * Accounting Sync Logs API
 * GET /api/integrations/accounting/sync-logs
 * Returns last 30 days of sync logs for the tenant.
 */
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { getPrisma } from '@/lib/db'

const prisma = getPrisma()

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !['OWNER', 'MGR', 'DEV'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const provider = searchParams.get('provider') // optional filter
    const page = parseInt(searchParams.get('page') ?? '1')
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '20'), 100)

    const tenantId = session.user.tenantId
    const since = new Date()
    since.setDate(since.getDate() - 30)

    const where = {
      tenantId,
      startedAt: { gte: since },
      ...(provider ? { provider } : {}),
    }

    const [logs, total] = await Promise.all([
      prisma.integrationSyncLog.findMany({
        where,
        orderBy: { startedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.integrationSyncLog.count({ where }),
    ])

    return NextResponse.json({ logs, total, page, limit })
  } catch (error) {
    console.error('[Integrations/accounting/sync-logs]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
