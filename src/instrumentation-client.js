// Created At: 2026-04-11 00:00:00 +07:00 (v1.0.0)
// Previous version: —
// Last Updated: 2026-04-11 00:00:00 +07:00 (v1.0.0)

/**
 * Next.js Client Instrumentation — Sentry browser initialisation
 * Replaces sentry.client.config.js (required for Turbopack compatibility)
 * Docs: https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation-client
 */
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1,
  debug: false,
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
})

// Required for Sentry navigation instrumentation in App Router
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
