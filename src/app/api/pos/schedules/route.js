import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getPrisma } from '@/lib/db'

const prisma = getPrisma()
// GET /api/pos/schedules?productId=xxx
// Returns upcoming course schedules for a given product (for POS schedule dropdown)
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('productId')

    if (!productId) {
      return NextResponse.json({ error: 'productId is required' }, { status: 400 })
    }

    const schedules = await prisma.courseSchedule.findMany({
      where: {
        tenantId: session.user.tenantId,
        productId,
        status: 'SCHEDULED',
        scheduledDate: { gte: new Date() },
      },
      orderBy: { scheduledDate: 'asc' },
      take: 20,
      select: {
        id: true,
        scheduleId: true,
        scheduledDate: true,
        startTime: true,
        endTime: true,
        maxStudents: true,
        confirmedStudents: true,
        status: true,
      },
    })

    return NextResponse.json({ data: schedules })
  } catch (error) {
    console.error('[POS/Schedules]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
