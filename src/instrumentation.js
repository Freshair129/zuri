// Created At: 2026-04-11 00:00:00 +07:00 (v1.0.0)
// Previous version: —
// Last Updated: 2026-04-11 00:00:00 +07:00 (v1.0.0)

/**
 * Next.js Instrumentation Hook — Sentry server/edge initialisation
 * Replaces sentry.server.config.js + sentry.edge.config.js (ADR: production build)
 * Docs: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { init } = await import('@sentry/nextjs')
    init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1,
      debug: false,
    })
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    // Disabled Edge-runtime Sentry to resolve persistent MIDDLEWARE_INVOCATION_FAILED.
    // Build-time auto-instrumentation is also disabled in next.config.js.
    /*
    try {
      const { init } = await import('@sentry/nextjs')
      init({
        dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
        tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1,
        debug: false,
      })
    } catch (e) {
      console.error('[Instrumentation] Sentry Edge initialization failed:', e.message)
    }
    */
  }
}
