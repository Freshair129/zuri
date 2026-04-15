import { NextResponse } from 'next/server'
import { verifyQStashSignature } from '@/lib/qstash'
import * as certificateRepo from '@/lib/repositories/certificateRepo'
import { getPrisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * POST /api/workers/check-completion
 * QStash cron: hourly  (e.g. 0 * * * *)
 * body: { tenantId }
 *
 * Flow:
 *   1. Find IN_PROGRESS enrollments with hoursCompleted >= threshold
 *   2. For each: mark COMPLETED + create Certificate (idempotent)
 *   3. Enqueue LINE/Email notification (TODO: M3 — after LINE integration)
 *
 * NFR3: QStash retries >= 5 — throw on unexpected errors (not 4xx)
 * G7:   certificateRepo.createForEnrollment() guards against duplicates
 */
export async function POST(request) {
  const { isValid, body: rawBody } = await verifyQStashSignature(request)
  if (!isValid) {
    return NextResponse.json({ error: 'Invalid QStash signature' }, { status: 401 })
  }

  const prisma = getPrisma()
  const body = typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody
  const { tenantId } = body

  if (!tenantId) {
    return NextResponse.json({ error: 'tenantId required' }, { status: 400 })
  }

  try {
    // 1. Find all enrollments ready to complete
    const completable = await certificateRepo.findCompletableEnrollments(tenantId)

    const results = { processed: 0, completed: 0, certificatesIssued: 0, errors: [] }
    results.processed = completable.length

    for (const enrollment of completable) {
      try {
        // 2a. Mark enrollment COMPLETED
        await certificateRepo.completeEnrollment(enrollment.id)
        results.completed++

        // 2b. Issue Certificate (idempotent — G7)
        const { cert, created } = await certificateRepo.createForEnrollment(tenantId, {
          enrollmentId: enrollment.id,
          customerId:   enrollment.customerId,
          hoursCompleted: enrollment.hoursCompleted,
        })

        if (created) {
          results.certificatesIssued++
        }

        // TODO M3: enqueue LINE notification
        // await getQStash().publishJSON({
        //   url: `${process.env.NEXTAUTH_URL}/api/workers/notify-certificate`,
        //   body: { tenantId, certificateId: cert.id },
        // })

      } catch (enrollmentError) {
        // Log but don't fail entire job — one bad enrollment shouldn't block others
        console.error(`[check-completion] enrollment ${enrollment.enrollmentId} failed:`, enrollmentError)
        results.errors.push({ enrollmentId: enrollment.enrollmentId, error: enrollmentError.message })
      }
    }

    return NextResponse.json({ ok: true, ...results })

  } catch (error) {
    console.error('[check-completion]', error)
    // Throw to trigger QStash retry (NFR3)
    throw error
  }
}
