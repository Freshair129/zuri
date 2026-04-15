'use client'

// Created At: 2026-04-11 00:00:00 +07:00 (v1.0.0)
// Previous version: —
// Last Updated: 2026-04-11 00:00:00 +07:00 (v1.0.0)

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

/**
 * Global React Error Boundary — captures rendering errors to Sentry.
 * Required by @sentry/nextjs for App Router (replaces pages/_error.js pattern).
 */
export default function GlobalError({ error, reset }) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="th">
      <body style={{ margin: 0, fontFamily: 'sans-serif', background: '#1A1710', color: '#F5F0E8' }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          gap: '1rem',
          padding: '2rem',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '3rem' }}>⚠️</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, margin: 0 }}>
            เกิดข้อผิดพลาด
          </h1>
          <p style={{ color: '#9CA3AF', margin: 0 }}>
            Something went wrong — our team has been notified.
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: '0.5rem',
              padding: '0.625rem 1.5rem',
              background: '#E8820C',
              color: '#fff',
              border: 'none',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            ลองใหม่อีกครั้ง
          </button>
        </div>
      </body>
    </html>
  )
}
