/**
 * Manual Express X-import Export
 * POST /api/integrations/accounting/export
 *
 * Generates XLSX for a given date and returns base64 for download,
 * or triggers email delivery to accountant.
 */
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { runExpressExport } from '@/lib/accounting/AccountingService'
import { auditAction, AUDIT_ACTIONS } from '@/lib/audit'

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !['OWNER', 'DEV'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { date } = body // ISO date string, e.g. "2026-04-09"

    const result = await runExpressExport(session.user.tenantId, date ?? null)

    if (result.skipped) {
      return NextResponse.json({ error: result.reason }, { status: 400 })
    }

    // Audit: revenue/expense data left the system. Track who, when, how much.
    await auditAction({
      request,
      session,
      tenantId: session.user.tenantId,
      action: AUDIT_ACTIONS.REVENUE_EXPORT,
      targetType: 'integration',
      details: {
        dateLabel: result.dateLabel,
        ordersCount: result.ordersCount,
        expensesCount: result.expensesCount,
        emailSent: !!result.emailSent,
        format: 'express-xlsx',
      },
    })

    return NextResponse.json({
      ok: true,
      dateLabel: result.dateLabel,
      ordersCount: result.ordersCount,
      expensesCount: result.expensesCount,
      emailSent: result.emailSent,
      // buffer is base64 — frontend can create a download link
      file: {
        filename: `zuri-export-${result.dateLabel}.xlsx`,
        base64: result.buffer,
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
    })
  } catch (error) {
    console.error('[Integrations/accounting/export]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
