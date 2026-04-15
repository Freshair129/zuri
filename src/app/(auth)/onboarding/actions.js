// Created At: 2026-04-10 04:45:00 +07:00 (v1.0.0)
// Previous version: 2026-04-10 05:10:00 +07:00 (v1.1.0)
// Last Updated: 2026-04-10 05:15:00 +07:00 (v1.2.0)

'use server'

import { Provisioner, slugifyTenantName } from '@/lib/services/provisioner'

/**
 * Server Action: handle the onboarding form submission.
 *
 * Runs validation + atomic provisioning via Provisioner.provisionTenant().
 * QStash cron setup is kicked off in the background — we don't await it
 * so a QStash hiccup can't block the user reaching the dashboard.
 *
 * Returns a serializable result; the form uses `success` / `error` to
 * drive the UI transition to the success view.
 */
export async function completeOnboarding(formData) {
  try {
    const input = {
      email:      formData.get('email'),
      password:   formData.get('password'),
      firstName:  formData.get('firstName'),
      lastName:   formData.get('lastName'),
      tenantName: formData.get('tenantName'),
      industry:   formData.get('industry') ?? 'culinary',
    }

    // Server-side slug derivation — the form doesn't collect this directly.
    input.tenantSlug = slugifyTenantName(input.tenantName)

    const { tenant } = await Provisioner.provisionTenant(input)

    // Fire-and-forget QStash setup — logs failures, never throws upward.
    Provisioner.setupTenantCrons(tenant.id).catch((err) => {
      console.error('[Onboarding] setupTenantCrons background error:', err)
    })

    return {
      success: true,
      tenantSlug: tenant.tenantSlug,
      tenantName: tenant.tenantName,
    }
  } catch (error) {
    console.error('[Onboarding] Provision failed:', error)
    return {
      success: false,
      code: error.code || 'UNKNOWN',
      error: error.message || 'Provisioning failed. Please try again.',
    }
  }
}
