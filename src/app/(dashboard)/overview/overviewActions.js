'use server'

import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import * as orderRepo from '@/lib/repositories/orderRepo'
import * as customerRepo from '@/lib/repositories/customerRepo'
import * as conversationRepo from '@/lib/repositories/conversationRepo'
import * as marketingRepo from '@/lib/repositories/marketingRepo'

/**
 * Fetch overview metrics with strict tenant isolation
 */
export async function fetchOverviewStats() {
  const session = await getSession()
  if (!session?.user?.tenantId) {
    redirect('/login')
  }

  const tenantId = session.user.tenantId
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)

  const [
    statsToday, 
    statsYesterday, 
    customersToday, 
    customersYesterday, 
    pendingChats, 
    recentOrders,
    marketingSummary
  ] = await Promise.all([
    orderRepo.getDailySummary(tenantId, today),
    orderRepo.getDailySummary(tenantId, yesterday),
    customerRepo.getDailyCustomerStats(tenantId, today),
    customerRepo.getDailyCustomerStats(tenantId, yesterday),
    conversationRepo.countOpenConversations(tenantId),
    orderRepo.listOrders(tenantId, { limit: 5 }),
    marketingRepo.getDashboardSummary(tenantId, '30d') // Use 30d for ROAS stability or 1d?
  ])

  // Top Channels (Mock replaced with aggregation if data exists, else fallback)
  // For now, let's derive it from recent history or keep it as dynamic mock if no sales yet
  const placements = await marketingRepo.getPlacementBreakdown(tenantId, '30d')
  
  const channelData = placements.length > 0 
    ? placements.slice(0, 4).map(p => ({
        name: p.platform,
        pct: Math.round((p.spend / marketingSummary.current.spend) * 100) || 0,
        color: p.platform === 'Facebook' ? 'bg-blue-500' : 'bg-emerald-500'
      }))
    : [
        { name: 'LINE OA', pct: 0, color: 'bg-emerald-500' },
        { name: 'Facebook', pct: 0, color: 'bg-blue-500' },
        { name: 'Walk-in', pct: 0, color: 'bg-amber-500' },
      ]

  // Calculate percentage changes
  const calcChange = (curr, prev) => {
    if (!prev || prev === 0) return curr > 0 ? 100 : 0
    return Math.round(((curr - prev) / prev) * 100)
  }

  return {
    kpis: [
      {
        key: 'daily_sales',
        value: `฿${statsToday.totalRevenue.toLocaleString()}`,
        change: `${calcChange(statsToday.totalRevenue, statsYesterday.totalRevenue)}%`,
        trend: statsToday.totalRevenue >= statsYesterday.totalRevenue ? 'up' : 'down',
        color: 'emerald',
        icon: 'DollarSign'
      },
      {
        key: 'pending_chats',
        value: pendingChats.toString(),
        change: null,
        trend: pendingChats > 10 ? 'down' : 'up',
        color: 'amber',
        icon: 'MessageSquare'
      },
      {
        key: 'new_customers',
        value: customersToday.toString(),
        change: `${calcChange(customersToday, customersYesterday)}%`,
        trend: customersToday >= customersYesterday ? 'up' : 'down',
        color: 'blue',
        icon: 'Users'
      },
      {
        key: 'roas',
        value: `${marketingSummary.current.roas}x`,
        change: marketingSummary.changes.roas ? `${marketingSummary.changes.roas}%` : null,
        trend: marketingSummary.changes.roas >= 0 ? 'up' : 'down',
        color: 'rose',
        icon: 'TrendingUp'
      }
    ],
    recentOrders: recentOrders.orders.map(o => ({
      id: `#${o.orderId.slice(-4)}`,
      customer: o.customer ? (o.customer.name || o.customer.facebookName || 'ลูกค้าทั่วไป') : 'ลูกค้าทั่วไป',
      amount: `฿${o.totalAmount.toLocaleString()}`,
      timeVal: o.createdAt ? new Date(o.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : 'Just now'
    })),
    channels: channelData
  }
}
