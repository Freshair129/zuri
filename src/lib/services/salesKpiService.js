/**
 * ZDEV-IMP-2639: AI Chat Analytics Service
 * Provides aggregated KPIs for the Sales Dashboard.
 * Sanitized for Edge Runtime compatibility.
 */
import { getPrisma } from '@/lib/db'

/**
 * Get core sales KPIs for a tenant
 * @param {string} tenantId 
 * @param {Object} options { startDate, endDate }
 */
export async function getSalesKpis(tenantId, { startDate, endDate } = {}) {
  const prisma = await getPrisma()
  const dateFilter = {}
  if (startDate) dateFilter.gte = new Date(startDate)
  if (endDate)   dateFilter.lte = new Date(endDate)

  const [revenueData, leadData, conversationCount, messageStats] = await Promise.all([
    // 1. Total Revenue & Paid Orders count
    prisma.order.aggregate({
      where: {
        tenantId,
        status: 'PAID',
        date: dateFilter
      },
      _sum: { totalAmount: true },
      _count: { id: true }
    }),

    // 2. Hot Leads (Intent > 80 or Stage = HOT_LEAD)
    prisma.customer.count({
      where: {
        tenantId,
        OR: [
          { intentScore: { gt: 80 } },
          { lifecycleStage: 'HOT_LEAD' }
        ],
        createdAt: dateFilter
      }
    }),

    // 3. Unique Conversations with activity
    prisma.conversation.count({
      where: {
        tenantId,
        updatedAt: dateFilter
      }
    }),

    // 4. Response Time & AI Efficiency (Sampled or last 100 for performance)
    prisma.message.findMany({
      where: {
        conversation: { tenantId },
        createdAt: dateFilter
      },
      orderBy: { createdAt: 'asc' },
      take: 500 // Limit for dashboard performance
    })
  ])

  // Process Response Times (Average)
  const responseTimes = []
  const conversationMap = {}
  let aiMessageCount = 0
  let totalMessages = messageStats.length

  for (const msg of messageStats) {
    if (msg.sender === 'AI') aiMessageCount++
    
    if (!conversationMap[msg.conversationId]) {
      conversationMap[msg.conversationId] = { firstCustomer: null, firstResponse: null }
    }

    const state = conversationMap[msg.conversationId]
    if (msg.sender === 'customer' && !state.firstCustomer) {
      state.firstCustomer = msg.createdAt
    } else if ((msg.sender === 'staff' || msg.sender === 'AI') && state.firstCustomer && !state.firstResponse) {
      state.firstResponse = msg.createdAt
      const diffMinutes = (state.firstResponse - state.firstCustomer) / (1000 * 60)
      responseTimes.push(diffMinutes)
    }
  }

  const avgResponseTime = responseTimes.length > 0
    ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
    : 0

  // 5. Daily Trends (Aggregate in JS to handle date truncation)
  const allOrders = await prisma.order.findMany({
    where: { tenantId, status: 'PAID', date: dateFilter },
    select: { date: true, totalAmount: true },
    orderBy: { date: 'asc' }
  })

  const trendMap = {}
  for (const order of allOrders) {
    const day = order.date.toISOString().split('T')[0]
    trendMap[day] = (trendMap[day] || 0) + (order.totalAmount || 0)
  }

  const dailyTrends = Object.entries(trendMap).map(([date, revenue]) => ({
    date,
    revenue
  }))

  return {
    totalRevenue: revenueData._sum.totalAmount || 0,
    paidOrders: revenueData._count.id,
    hotLeads: leadData,
    avgResponseTime: Math.round(avgResponseTime * 10) / 10,
    conversionRate: conversationCount > 0 
      ? Math.round((revenueData._count.id / conversationCount) * 100)
      : 0,
    aiEfficiency: totalMessages > 0 
      ? Math.round((aiMessageCount / totalMessages) * 100)
      : 0,
    dailyTrends
  }
}
