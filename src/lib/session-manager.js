// Created At: 2026-04-12 04:00:00 +07:00 (v1.2.9)
// Previous version: 2026-04-10 03:30:00 +07:00 (v1.0.0)
// Last Updated: 2026-04-12 04:00:00 +07:00 (v1.2.9)

/**
 * Zuri Session Manager (ZDEV-TSK-20260410-025)
 * Sanitized for Edge Runtime compatibility.
 */
import { getPrisma } from '@/lib/db'

const MAX_CONCURRENT_SESSIONS = 10

/**
 * Registers a new session and enforces the concurrency limit.
 */
export async function registerSession({ employeeId, tenantId, sessionId, ip, ua, deviceId }) {
  console.log(`[SessionManager] Registering session: ${sessionId} for employee: ${employeeId}`)
  const prisma = await getPrisma()
  
  try {
    // 1. Fetch current employee
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId }
    })

    if (!employee) {
      console.warn(`[SessionManager] Employee not found: ${employeeId}`)
      return
    }

    // 2. Security Alert: Check if IP or Device looks suspicious
    const isNewIp = employee.lastLoginIp && employee.lastLoginIp !== ip
    const isNewDevice = employee.deviceId && deviceId && employee.deviceId !== deviceId

    if (isNewIp || isNewDevice) {
      console.log(`[SessionManager] Suspicious activity detected: IP changed (${employee.lastLoginIp} -> ${ip}) or Device changed`)
      await alertSuspiciousLogin(employee, ip, ua, deviceId)
    }

    // 3. Update Employee metadata
    await prisma.employee.update({
      where: { id: employeeId },
      data: {
        lastLoginAt: new Date(),
        lastLoginIp: ip,
        deviceId: deviceId || employee.deviceId,
      }
    })

    // 4. Enforce Concurrency Limit
    const activeSessions = await prisma.activeSession.findMany({
      where: { employeeId },
      orderBy: { createdAt: 'asc' }
    })

    console.log(`[SessionManager] Active sessions for ${employeeId}: ${activeSessions.length}/${MAX_CONCURRENT_SESSIONS}`)

    if (activeSessions.length >= MAX_CONCURRENT_SESSIONS) {
      const toDeleteCount = activeSessions.length - MAX_CONCURRENT_SESSIONS + 1
      const idsToDelete = activeSessions.slice(0, toDeleteCount).map(s => s.id)
      
      console.log(`[SessionManager] Evicting oldest ${toDeleteCount} sessions:`, idsToDelete)
      await prisma.activeSession.deleteMany({
        where: { id: { in: idsToDelete } }
      })
    }

    // 5. Create new session record
    const newSession = await prisma.activeSession.create({
      data: {
        sessionId,
        employeeId,
        tenantId,
        ipAddress: ip,
        userAgent: ua,
        deviceId: deviceId,
      }
    })
    console.log(`[SessionManager] Session registered successfully: ${newSession.id}`)
    return newSession
  } catch (err) {
    console.error(`[SessionManager] Registration failed for ${sessionId}:`, err)
    throw err
  }
}

/**
 * Validates if a session is still active.
 */
export async function validateSession(employeeId, sessionId) {
  if (!sessionId) {
    console.warn(`[SessionManager] Validation failed: sessionId is missing`)
    return false
  }
  
  try {
    const prisma = await getPrisma()
    const session = await prisma.activeSession.findUnique({
      where: { sessionId }
    })

    if (!session) {
      console.warn(`[SessionManager] Validation failed: Session ID ${sessionId} not found in DB`)
      return false
    }

    if (session.employeeId !== employeeId) {
      console.warn(`[SessionManager] Validation failed: Session ${sessionId} belongs to ${session.employeeId}, expected ${employeeId}`)
      return false
    }

    return true
  } catch (err) {
    console.error(`[SessionManager] Validation error for ${sessionId}:`, err)
    return false // Fail closed for security, but we bypassed the check in auth.js for now
  }
}

/**
 * Revokes a session (Logout).
 */
export async function revokeSession(sessionId) {
  if (!sessionId) return
  const prisma = await getPrisma()
  return prisma.activeSession.deleteMany({
    where: { sessionId }
  })
}

/**
 * Sends a LINE alert if a login seems suspicious.
 */
async function alertSuspiciousLogin(employee, ip, ua, deviceId) {
  if (!employee.lineUserId) return

  try {
    const { getTenantById } = await import('@/lib/repositories/tenantRepo')
    const tenant = await getTenantById(employee.tenantId)
    if (!tenant?.lineChannelToken) return

    const { sendLineText } = await import('@/lib/line/lineUtil')
    const time = new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })
    const deviceName = ua.includes('iPhone') ? 'iPhone' : ua.includes('Android') ? 'Android' : 'Web Browser'
    
    let message = `🔔 แจ้งเตือนความปลอดภัย (Security Alert)\n\n`
    message += `พบการเข้าสู่ระบบจากอุปกรณ์ใหม่หรือสถานที่ผิดปกติ\n`
    message += `──────────────────\n`
    message += `👤 ผู้ใช้: ${employee.firstName} ${employee.lastName}\n`
    message += `📍 IP: ${ip}\n`
    message += `📱 อุปกรณ์: ${deviceName}\n`
    message += `⏰ เวลา: ${time}\n`
    message += `──────────────────\n`
    message += `หากไม่ใช่คุณ โปรดเปลี่ยนรหัสผ่านทันทีเพื่อความปลอดภัย`
    
    await sendLineText(tenant.lineChannelToken, employee.lineUserId, message)
  } catch (err) {
    console.error('[SessionManager] Failed to send LINE alert:', err)
  }
}
