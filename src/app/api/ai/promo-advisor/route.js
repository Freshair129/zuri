import { NextResponse } from 'next/server'
import { getTenantId } from '@/lib/tenant'
import { getCustomerById } from '@/lib/repositories/customerRepo'
import { getOrdersByCustomer } from '@/lib/repositories/orderRepo'
import { GoogleGenerativeAI } from '@google/generative-ai'

export const dynamic = 'force-dynamic'

// POST /api/ai/promo-advisor - Gemini-powered promotion intelligence for a customer
export async function POST(request) {
  try {
    const tenantId = await getTenantId(request)
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { customerId, currentCart, availablePromotions } = body

    if (!customerId) {
      return NextResponse.json({ error: 'customerId is required' }, { status: 400 })
    }

    // Fetch customer profile and order history for context
    const customer = await getCustomerById({ tenantId, id: customerId })
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    const orders = await getOrdersByCustomer({ tenantId, customerId })

    // Build Gemini prompt with customer context
    const orderSummary = {
      totalOrders: orders.length,
      totalRevenue: orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0),
      lastOrderDate: orders.length > 0 ? orders[orders.length - 1].createdAt : null,
      averageOrderValue: orders.length > 0 ? orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0) / orders.length : 0
    }

    const prompt = `You are a promotion advisor for a Thai service/retail business.

Customer Profile:
- Name: ${customer.name || 'Unknown'}
- Lifecycle Stage: ${customer.lifecycleStage || 'Unknown'}
- Tags: ${(customer.tags || []).join(', ') || 'None'}

Purchase History:
- Total Orders: ${orderSummary.totalOrders}
- Total Revenue: ${orderSummary.totalRevenue.toFixed(2)} THB
- Average Order Value: ${orderSummary.averageOrderValue.toFixed(2)} THB
- Last Order: ${orderSummary.lastOrderDate ? new Date(orderSummary.lastOrderDate).toLocaleDateString('th-TH') : 'No previous orders'}

Current Cart:
${currentCart && currentCart.length > 0 ? currentCart.map((item) => `- ${item.name || 'Item'}: ${item.quantity || 1}x @ ${item.price || 0} THB`).join('\n') : '(empty)'}

Available Promotions:
${availablePromotions && availablePromotions.length > 0 ? availablePromotions.map((promo, idx) => `${idx + 1}. ${promo.name}: ${promo.description || 'N/A'} (ID: ${promo.id || 'N/A'})`).join('\n') : '(none)'}

Task: Based on this customer profile and order history, recommend which promotions are most relevant and explain why. Focus on:
1. Purchase behavior patterns
2. Lifecycle stage alignment
3. Current cart contents
4. Revenue impact potential

Return ONLY a JSON array like this (no markdown, no extra text):
[
  {
    "promotionId": "promo-123",
    "name": "Promotion Name",
    "reason": "Brief explanation of why this promotion suits this customer",
    "confidence": 85
  }
]`

    try {
      // Initialize Gemini API
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

      const result = await model.generateContent(prompt)
      const responseText = result.response.text()

      // Parse JSON response from Gemini
      const cleanJson = responseText.replace(/```json|```/g, '').trim()
      let recommendations = []

      try {
        recommendations = JSON.parse(cleanJson)
        // Ensure it's an array
        if (!Array.isArray(recommendations)) {
          recommendations = []
        }
      } catch (parseError) {
        console.error('[AI/PromoAdvisor] JSON parse error:', parseError)
        // Return empty array on parse failure (graceful fallback)
        recommendations = []
      }

      return NextResponse.json({ data: { recommendations } })
    } catch (geminError) {
      console.error('[AI/PromoAdvisor] Gemini error:', geminError)
      // Return graceful fallback: empty recommendations
      return NextResponse.json({ data: { recommendations: [] } })
    }
  } catch (error) {
    console.error('[AI/PromoAdvisor]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
