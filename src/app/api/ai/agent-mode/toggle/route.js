// Created At: 2026-04-10 03:52:00 +07:00 (v1.0.0)
// Previous version: —
// Last Updated: 2026-04-10 03:52:00 +07:00 (v1.0.0)
// Task: ZDEV-TSK-20260410-012 | Plan: ZDEV-IMP-2638

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { can } from '@/lib/permissionMatrix'
import { getPrisma } from '@/lib/db'

const prisma = getPrisma()

/**
 * POST /api/ai/agent-mode/toggle
 * Toggle Agent Mode on/off for a conversation.
 * RBAC: MANAGER, DEV only (requires inbox Full access)
 *
 * Body: { conversationId: string, enabled: boolean }
 */
export async function POST(request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { roles, tenantId } = session.user

  // MANAGER+ only — editing agent mode requires inbox Full access
  if (!can(roles, 'inbox', 'F')) {
    return NextResponse.json(
      { error: 'Forbidden: MANAGER or DEV role required to toggle Agent Mode' },
      { status: 403 }
    )
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { conversationId, enabled } = body

  if (!conversationId || typeof enabled !== 'boolean') {
    return NextResponse.json(
      { error: 'conversationId (string) and enabled (boolean) are required' },
      { status: 400 }
    )
  }

  // Verify conversation belongs to this tenant (security check)
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, tenantId },
    select: { id: true, agentMode: true, agentTurnCount: true, assigneeId: true },
  })

  if (!conversation) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
  }

  // If enabling, warn if no agent style profile exists for assignee
  let styleWarning = null
  if (enabled && conversation.assigneeId) {
    const style = await prisma.agentStyle.findUnique({
      where: {
        tenantId_employeeId: {
          tenantId,
          employeeId: conversation.assigneeId,
        },
      },
      select: { id: true, tone: true, analyzedAt: true },
    })

    if (!style) {
      styleWarning = 'ยังไม่มี Style Profile สำหรับพนักงานที่รับผิดชอบ — AI จะใช้โทนค่าเริ่มต้น (เป็นมิตร/สุภาพ)'
    }
  }

  // Update agentMode; reset turn count when disabling
  const updated = await prisma.conversation.update({
    where: { id: conversationId },
    data: {
      agentMode: enabled,
      agentTurnCount: enabled ? conversation.agentTurnCount : 0, // reset on disable
    },
    select: { id: true, agentMode: true, agentTurnCount: true },
  })

  console.log(`[agent-mode/toggle] Conv ${conversationId} agentMode=${enabled} by ${session.user.email}`)

  return NextResponse.json({
    success: true,
    conversationId: updated.id,
    agentMode: updated.agentMode,
    agentTurnCount: updated.agentTurnCount,
    warning: styleWarning,
  })
}
