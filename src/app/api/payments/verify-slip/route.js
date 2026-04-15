import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { verifyThaiSlip } from '@/lib/ai/slipVerifier'

export const dynamic = 'force-dynamic'

/**
 * POST /api/payments/verify-slip
 * Body: { base64Image, mimeType, orderId? }
 */
export const POST = withAuth(
  async (request, context) => {
    try {
      const { session } = context
      const tenantId = session.user.tenantId
      const { base64Image, mimeType, orderId } = await request.json()

      if (!base64Image) {
        return NextResponse.json({ error: 'base64Image is required' }, { status: 400 })
      }

      const { withTenantContext } = await import('@/lib/tenantContext')
      const { verifyAndApplySlip } = await import('@/lib/repositories/paymentRepo')

      return await withTenantContext(tenantId, async () => {
        // 1. Perform AI OCR
        const result = await verifyThaiSlip(base64Image, mimeType || 'image/jpeg')

        if (!result || result.error) {
          return NextResponse.json({ error: result?.error || 'AI processing failed' }, { status: 500 })
        }

        // 2. Automate Application (if orderId provided)
        let transaction = null
        if (orderId && result.isVerified) {
          try {
            transaction = await verifyAndApplySlip(tenantId, orderId, result)
          } catch (appErr) {
            console.warn('[Payments/VerifySlip] Auto-apply failed:', appErr.message)
            // We don't fail the whole request, just return the OCR result with a warning
            result.autoApplyError = appErr.message
          }
        }

        return NextResponse.json({ 
          success: true, 
          data: result,
          applied: !!transaction,
          transactionId: transaction?.transactionId
        })
      })
    } catch (error) {
      console.error('[Payments/VerifySlip.POST]', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  },
  { domain: 'orders', action: 'W' }
)
