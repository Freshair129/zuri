// Created At: 2026-04-14 00:00:00 +07:00 (v1.0.0)
// Email service via Resend — FEAT21 (invitation + OTP) — ZUR-30
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.RESEND_FROM ?? 'Zuri <noreply@zuri.app>'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.zuri.app'

/**
 * Send team invitation email
 * @param {{ to: string, inviteUrl: string, role: string, inviterName: string }} opts
 */
export async function sendInviteEmail({ to, inviteUrl, role, inviterName }) {
  const roleLabel = {
    OWNER: 'เจ้าของ', ADM: 'ผู้ดูแล', MGR: 'ผู้จัดการ',
    SLS: 'เซลส์', KITCHEN: 'ครัว', STF: 'พนักงาน', MKT: 'การตลาด',
  }[role] ?? role

  const { data, error } = await resend.emails.send({
    from: FROM,
    to,
    subject: `คุณได้รับคำเชิญเข้าร่วม Zuri`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px">
        <h2 style="color:#1A1710">คุณได้รับคำเชิญเข้าร่วม Zuri</h2>
        <p>${inviterName} เชิญให้คุณเข้าร่วมในฐานะ <strong>${roleLabel}</strong></p>
        <p>ลิงก์นี้มีอายุ 7 วัน</p>
        <a href="${inviteUrl}"
           style="display:inline-block;margin:16px 0;padding:12px 24px;background:#E8820C;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold">
          รับคำเชิญ
        </a>
        <p style="color:#888;font-size:12px">หากคุณไม่ได้คาดหวังอีเมลนี้ สามารถเพิกเฉยได้</p>
      </div>
    `,
  })

  if (error) {
    console.error('[Email] sendInviteEmail failed', error)
    throw new Error('EMAIL_SEND_FAILED')
  }
  return data
}

/**
 * Send OTP for ownership transfer
 * @param {{ to: string, otp: string, toEmployeeName: string }} opts
 */
export async function sendOwnershipOtpEmail({ to, otp, toEmployeeName }) {
  const { data, error } = await resend.emails.send({
    from: FROM,
    to,
    subject: `รหัส OTP สำหรับโอนสิทธิ์ Zuri`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px">
        <h2 style="color:#1A1710">ยืนยันการโอนสิทธิ์ Workspace</h2>
        <p>คุณกำลังโอนสิทธิ์ OWNER ให้กับ <strong>${toEmployeeName}</strong></p>
        <p>กรอกรหัส OTP ด้านล่างเพื่อยืนยัน (หมดอายุใน 15 นาที)</p>
        <div style="margin:24px 0;text-align:center">
          <span style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#1A1710">${otp}</span>
        </div>
        <p style="color:#888;font-size:12px">หากคุณไม่ได้เริ่มกระบวนการนี้ กรุณาติดต่อทีมงานทันที</p>
      </div>
    `,
  })

  if (error) {
    console.error('[Email] sendOwnershipOtpEmail failed', error)
    throw new Error('EMAIL_SEND_FAILED')
  }
  return data
}
