/**
 * objectionPlaybook — Configurable objection handling for AI Sales Closer
 * M4 Feature A3 (ZDEV-TSK-20260410-013)
 *
 * Returns per-tenant objection strategies or default culinary school playbook.
 * Playbook is fetched from TenantCRMPattern.conversionTips and merged with defaults.
 */

import { getPrisma } from '@/lib/db'
import { getOrSet } from '@/lib/redis'

// ─── Default Culinary School Playbook ─────────────────────────────────────────
const DEFAULT_PLAYBOOK = [
  {
    id: 'price_objection',
    triggerKeywords: ['แพง', 'ราคาสูง', 'แพงไป', 'แพงเกิน', 'ไม่มีเงิน', 'งบไม่พอ', 'ราคา', 'ลด'],
    thaiResponse:
      'เราเข้าใจเลยค่ะ ราคาคอร์สของเรารวมทุกอย่างทั้ง วัตถุดิบ อุปกรณ์ และใบรับรอง ซึ่งถ้าเทียบกับที่อื่นจะคุ้มกว่ามากเลย ' +
      'นอกจากนี้ยังมีแผนผ่อนชำระ 3 เดือน 0% ให้ด้วยนะคะ และตอนนี้มีโปรโมชันพิเศษสำหรับลูกค้าที่สมัครภายในอาทิตย์นี้ด้วยค่ะ',
    followUpAction: 'SEND_PROMOTION',
    ctaText: 'ดูแผนผ่อนชำระ',
  },
  {
    id: 'schedule_objection',
    triggerKeywords: ['ไม่ว่าง', 'ยุ่ง', 'ไม่มีเวลา', 'งานยุ่ง', 'เวลาไม่ตรง', 'วันหยุด', 'เสาร์', 'อาทิตย์'],
    thaiResponse:
      'เข้าใจเลยค่ะ เรามีคลาสให้เลือกหลายช่วงเวลาทั้งวันธรรมดาและวันหยุดนะคะ ' +
      'และถ้าตารางปกติไม่สะดวก สามารถจองคลาส Private ได้เลยค่ะ ซึ่งจะยืดหยุ่นวันและเวลาได้ตามต้องการ ' +
      'อยากให้ช่วยดูตารางคลาสที่ว่างให้ไหมคะ?',
    followUpAction: 'SHOW_SCHEDULE',
    ctaText: 'ดูตารางคลาส',
  },
  {
    id: 'consultation_objection',
    triggerKeywords: ['ปรึกษา', 'ถามก่อน', 'คุย', 'ขอคิดก่อน', 'ยังไม่แน่ใจ', 'รอก่อน', 'ดูก่อน'],
    thaiResponse:
      'แน่นอนค่ะ ไม่ต้องรีบตัดสินใจเลย ขอส่งโบรชัวร์รายละเอียดคอร์สและตารางราคาให้ก่อนนะคะ ' +
      'และถ้าสะดวก เราสามารถนัดเข้ามาดูสถานที่จริงได้ฟรีเลยค่ะ จะได้เห็นห้องเรียนและถามได้ทุกอย่าง ' +
      'อยากให้ส่งข้อมูลไปทาง LINE ได้เลยค่ะ',
    followUpAction: 'SEND_BROCHURE',
    ctaText: 'รับโบรชัวร์',
  },
  {
    id: 'comparison_objection',
    triggerKeywords: ['ที่อื่น', 'คู่แข่ง', 'โรงเรียนอื่น', 'เปรียบเทียบ', 'ดีกว่า', 'ถูกกว่า'],
    thaiResponse:
      'เราเข้าใจที่อยากเปรียบเทียบก่อนเลยค่ะ จุดเด่นของเราคือ ครูผู้สอนมีประสบการณ์สอนมากกว่า 10 ปี ' +
      'มีใบรับรองของ Ministry of Education และอัตราการจ้างงานหลังจบคอร์สสูงถึง 85% เลยค่ะ ' +
      'อยากให้ลองเปรียบเทียบกับโรงเรียนอื่นแล้วจะเห็นความแตกต่างได้เลยค่ะ',
    followUpAction: 'SEND_COMPARISON',
    ctaText: 'ดูจุดเด่น',
  },
]

// ─── Fetch Playbook ────────────────────────────────────────────────────────────
/**
 * Get objection playbook for a tenant (merges tenant customizations with defaults)
 * @param {string} tenantId
 * @returns {Array} objection entries
 */
export async function getPlaybook(tenantId) {
  const cacheKey = `playbook:${tenantId}`

  return getOrSet(cacheKey, async () => {
    try {
      const prisma = await getPrisma()
      const pattern = await prisma.tenantCRMPattern.findUnique({
        where: { tenantId },
        select: { conversionTips: true },
      })

      // If tenant has custom tips, try to parse and merge
      if (pattern?.conversionTips && Array.isArray(pattern.conversionTips)) {
        const customEntries = pattern.conversionTips
          .filter((tip) => tip.id && tip.triggerKeywords && tip.thaiResponse)

        // Merge: custom entries override defaults with same ID, rest are appended
        const defaultMap = new Map(DEFAULT_PLAYBOOK.map((e) => [e.id, e]))
        customEntries.forEach((entry) => defaultMap.set(entry.id, entry))
        return Array.from(defaultMap.values())
      }
    } catch (err) {
      console.error('[objectionPlaybook] getPlaybook', err)
    }

    return DEFAULT_PLAYBOOK
  }, 3600) // Cache 1 hour
}

/**
 * Detect objections in a customer message and return matching playbook entries
 * @param {string} message - customer's message (Thai)
 * @param {Array} playbook - from getPlaybook()
 * @returns {Array} matched entries (sorted by relevance)
 */
export function detectObjections(message, playbook) {
  const lowerMsg = message.toLowerCase()

  return playbook
    .filter((entry) =>
      entry.triggerKeywords.some((kw) => lowerMsg.includes(kw.toLowerCase()))
    )
    .slice(0, 2) // Return top 2 matches max
}
