// Created At: 2026-04-12 06:10:00 +07:00 (v1.3.24)
// Previous version: 2026-04-10 05:15:00 +07:00 (v1.2.0)
// Last Updated: 2026-04-12 06:10:00 +07:00 (v1.3.24)

import { getPrisma } from '@/lib/db'
// import bcrypt from 'bcryptjs' (removed to avoid poisoning Edge Runtime)
import { INDUSTRIES } from '@/lib/constants/industries'

// ─── Validation rules ─────────────────────────────────────────────────────────
export const RESERVED_SLUGS = new Set([
  'app', 'api', 'admin', 'auth', 'www', 'zuri',
  'mail', 'email', 'support', 'help', 'docs', 'status',
  'static', 'assets', 'cdn', 'blog', 'about', 'contact',
  'login', 'register', 'onboarding', 'signup', 'signin',
  'dashboard', 'home', 'public', 'private', 'internal',
])

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const SLUG_RE  = /^[a-z0-9][a-z0-9-]{0,30}[a-z0-9]$/

const SUPPORTED_INDUSTRIES = new Set(['culinary', 'beauty', 'fitness'])

// ─── Helpers ──────────────────────────────────────────────────────────────────
export function slugifyTenantName(tenantName) {
  return String(tenantName || '')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32)
}

export function validateOnboardingInput(data) {
  const errors = []

  if (!data.email || !EMAIL_RE.test(data.email)) {
    errors.push('Invalid email format')
  }
  if (!data.password || data.password.length < 8) {
    errors.push('Password must be at least 8 characters')
  }
  if (!data.firstName || data.firstName.trim().length < 1) {
    errors.push('First name is required')
  }
  if (!data.lastName || data.lastName.trim().length < 1) {
    errors.push('Last name is required')
  }
  if (!data.tenantName || data.tenantName.trim().length < 2) {
    errors.push('Business name must be at least 2 characters')
  }
  if (data.tenantName && data.tenantName.length > 64) {
    errors.push('Business name must be 64 characters or less')
  }
  if (!data.tenantSlug || !SLUG_RE.test(data.tenantSlug)) {
    errors.push('Invalid subdomain — use 2–32 lowercase letters, digits, or hyphens')
  }
  if (data.tenantSlug && RESERVED_SLUGS.has(data.tenantSlug)) {
    errors.push(`Subdomain "${data.tenantSlug}" is reserved`)
  }
  if (data.industry && !SUPPORTED_INDUSTRIES.has(data.industry)) {
    errors.push(`Unsupported industry "${data.industry}"`)
  }

  if (errors.length > 0) {
    const err = new Error(errors[0])
    err.code = 'VALIDATION_ERROR'
    err.errors = errors
    throw err
  }
}

async function generateOwnerEmployeeId(tx, tenantSlug) {
  const suffix = tenantSlug.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) || 'OWNER'
  const base = `TVS-ADM-OWN-${suffix}`
  const existing = await tx.employee.findUnique({ where: { employeeId: base } })
  if (!existing) return base
  const tail = Math.floor(Math.random() * 9000 + 1000)
  return `${base}-${tail}`
}

// ─── Provisioner ──────────────────────────────────────────────────────────────
export class Provisioner {
  static async provisionTenant(data) {
    const prisma = await getPrisma()
    const normalized = {
      email:      String(data.email || '').trim().toLowerCase(),
      password:   String(data.password || ''),
      firstName:  String(data.firstName || '').trim(),
      lastName:   String(data.lastName || '').trim(),
      tenantName: String(data.tenantName || '').trim(),
      tenantSlug: String(data.tenantSlug || slugifyTenantName(data.tenantName)).trim().toLowerCase(),
      industry:   String(data.industry || 'culinary').trim().toLowerCase(),
    }

    validateOnboardingInput(normalized)

    const bcrypt = (await import('bcryptjs')).default
    const passwordHash = await bcrypt.hash(normalized.password, 12)

    try {
      return await prisma.$transaction(async (tx) => {
        const [slugTaken, emailTaken] = await Promise.all([
          tx.tenant.findUnique({ where: { tenantSlug: normalized.tenantSlug } }),
          tx.employee.findUnique({ where: { email: normalized.email } }),
        ])
        if (slugTaken) {
          const err = new Error('Subdomain already taken')
          err.code = 'SLUG_TAKEN'
          throw err
        }
        if (emailTaken) {
          const err = new Error('Email already registered')
          err.code = 'EMAIL_TAKEN'
          throw err
        }

        const tenant = await tx.tenant.create({
          data: {
            tenantName: normalized.tenantName,
            tenantSlug: normalized.tenantSlug,
            plan: 'STARTER',
            isActive: true,
            config: {
              industry:       normalized.industry,
              timezone:       'Asia/Bangkok',
              currency:       'THB',
              vatRate:        7,
              brandColor:     INDUSTRIES[normalized.industry]?.brandColor || '#E8820C',
              onboardingStep: 'COMPLETED',
            },
          },
        })

        const employeeId = await generateOwnerEmployeeId(tx, normalized.tenantSlug)
        const owner = await tx.employee.create({
          data: {
            employeeId,
            tenantId: tenant.id,
            firstName: normalized.firstName,
            lastName:  normalized.lastName,
            email:     normalized.email,
            passwordHash,
            role:      'OWNER',
            roles:     ['OWNER', 'MANAGER', 'SALES', 'FINANCE'],
            status:    'ACTIVE',
          },
        })

        await tx.posReceiptConfig.create({
          data: {
            tenantId:    tenant.id,
            businessName: normalized.tenantName,
            vatIncluded:  true,
            vatRate:      7,
          },
        })

        await tx.posZone.create({
          data: {
            tenantId: tenant.id,
            name:     'Main Area',
            color:    '#E8820C',
          },
        })

        await Provisioner.seedIndustryDefaults(tx, tenant.id, normalized.industry)

        return { tenant, owner }
      })
    } catch (error) {
      if (error.code === 'P2002') {
        const target = error.meta?.target
        if (Array.isArray(target) && target.includes('tenant_slug')) {
          const e = new Error('Subdomain already taken')
          e.code = 'SLUG_TAKEN'
          throw e
        }
        if (Array.isArray(target) && target.includes('email')) {
          const e = new Error('Email already registered')
          e.code = 'EMAIL_TAKEN'
          throw e
        }
      }
      throw error
    }
  }

  static async seedIndustryDefaults(tx, tenantId, industry) {
    const config = INDUSTRIES[industry] || INDUSTRIES.culinary
    
    if (config.zones) {
      for (const zone of config.zones) {
        await tx.posZone.create({
          data: {
            tenantId,
            name:  zone.name,
            color: zone.color,
          }
        })
      }
    }

    if (config.products) {
      for (const p of config.products) {
        await tx.product.create({
          data: {
            sku:          `TVS-SEED-${industry.toUpperCase().slice(0,3)}-${Date.now().toString().slice(-6)}-${Math.floor(Math.random()*100)}`,
            tenantId,
            name:         p.name,
            category:     p.category,
            basePrice:    p.price,
            isActive:     true,
            isPosVisible: true,
            description:  p.description,
          },
        })
      }
    }
  }

  static async setupTenantCrons(tenantId) {
    try {
      const { getQStash } = await import('@/lib/qstash')
      const qstash = getQStash()

      const baseUrl = process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : process.env.NEXT_PUBLIC_APP_URL

      if (!baseUrl) {
        console.warn('[Provisioner] No base URL configured — skipping QStash setup')
        return { scheduled: false, reason: 'missing_base_url' }
      }

      await qstash.schedules.create({
        destination: `${baseUrl}/api/workers/daily-brief/process`,
        cron: '0 1 * * *',
        body: JSON.stringify({ tenantId }),
        headers: { 'Content-Type': 'application/json' },
      })

      console.log(`[Provisioner] Scheduled Daily Brief for tenant ${tenantId}`)
      return { scheduled: true }
    } catch (error) {
      console.error('[Provisioner] QStash setup failed:', error.message)
      return { scheduled: false, reason: 'qstash_error', error: error.message }
    }
  }
}
