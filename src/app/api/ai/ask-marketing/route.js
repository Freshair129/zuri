import { getTenantId } from '@/lib/tenant'
import { generateMarketingInsightStream } from '@/lib/ai/marketingOptimizer'

export const dynamic = 'force-dynamic'

/**
 * POST /api/ai/ask-marketing
 * Conversational AI for Marketing Dashboard (M6-C2)
 * Streams Senior Media Buyer insights via SSE.
 */
export async function POST(request) {
  try {
    const tenantId = await getTenantId(request)
    if (!tenantId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const { question, range = '30d' } = await request.json()

    if (!question) {
      return new Response(JSON.stringify({ error: 'Question is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()

        try {
          const result = await generateMarketingInsightStream(tenantId, question, range)

          for await (const chunk of result.stream) {
            const text = chunk.text()
            if (text) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`))
            }
          }

          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        } catch (streamError) {
          console.error('[AI/AskMarketing] Stream error:', streamError)
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'AI processing failed' })}\n\n`))
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (error) {
    console.error('[AI/AskMarketing] Route Error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
