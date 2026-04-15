'use client'
import { useState, useEffect, useCallback } from 'react'
import Pusher from 'pusher-js'

// ─── Sentiment config ────────────────────────────────────────────────────────
const SENTIMENT_CONFIG = {
  positive: { label: 'Positive', color: '#22c55e', bg: 'rgba(34,197,94,0.12)', icon: '😊' },
  neutral: { label: 'Neutral', color: '#94a3b8', bg: 'rgba(148,163,184,0.10)', icon: '😐' },
  negative: { label: 'Negative', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', icon: '😟' },
  very_negative: { label: 'Critical', color: '#ef4444', bg: 'rgba(239,68,68,0.14)', icon: '🚨' }
}

const PDAD_LABELS = { PROBLEM: 'Problem', DESIRE: 'Desire', ACTION: 'Action', DECISION: 'Decision' }
const PDAD_COLORS = { PROBLEM: '#94a3b8', DESIRE: '#60a5fa', ACTION: '#f59e0b', DECISION: '#22c55e' }

const CTA_LABELS = {
  PUSH_TO_CLOSE: '🔥 Push to Close',
  FOLLOW_UP: '📬 Follow Up',
  EDUCATE: '📚 Educate',
  NURTURE: '🌱 Nurture',
  RE_ENGAGE: '🔄 Re-engage'
}

// ─── Intent bar ──────────────────────────────────────────────────────────────
function IntentBar({ value }) {
  const pct = Math.min(100, Math.round((value ?? 0) * 100))
  const color = pct >= 80 ? '#ef4444' : pct >= 50 ? '#f59e0b' : '#60a5fa'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' }}>
        <div
          style={{
            width: `${pct}%`, height: '100%', background: color,
            borderRadius: 3, transition: 'width 0.6s ease'
          }}
        />
      </div>
      <span style={{ fontSize: 11, color, fontWeight: 700, minWidth: 32, textAlign: 'right' }}>{pct}%</span>
    </div>
  )
}

// ─── Single conversation card ─────────────────────────────────────────────────
function ConvCard({ item, flash }) {
  const cfg = SENTIMENT_CONFIG[item.sentiment] ?? SENTIMENT_CONFIG.neutral
  const pdadColor = PDAD_COLORS[item.pdadStage] ?? '#94a3b8'

  return (
    <div
      style={{
        background: flash ? 'rgba(239,68,68,0.18)' : cfg.bg,
        border: `1px solid ${flash ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.09)'}`,
        borderRadius: 12, padding: '12px 14px', marginBottom: 8,
        transition: 'background 0.4s ease, border 0.4s ease',
        position: 'relative'
      }}
    >
      {/* Live badge */}
      {item.source === 'realtime' && (
        <span style={{
          position: 'absolute', top: 10, right: 12,
          background: 'rgba(99,102,241,0.2)', color: '#818cf8',
          fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
          letterSpacing: '0.05em'
        }}>LIVE</span>
      )}

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 18 }}>{cfg.icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 13, color: '#f1f5f9' }}>{item.customerName}</div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>{item.summary ?? '—'}</div>
        </div>
        {/* PDAD chip */}
        <span style={{
          background: `${pdadColor}22`, color: pdadColor,
          border: `1px solid ${pdadColor}44`,
          fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99
        }}>
          {PDAD_LABELS[item.pdadStage] ?? item.pdadStage}
        </span>
      </div>

      {/* Intent bar */}
      <div style={{ marginBottom: 6 }}>
        <div style={{ fontSize: 10, color: '#64748b', marginBottom: 4 }}>Purchase Intent</div>
        <IntentBar value={item.purchaseIntent} />
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 10, color: cfg.color, fontWeight: 600 }}>
          {cfg.label}
        </span>
        <span style={{ fontSize: 10, color: '#475569' }}>
          {CTA_LABELS[item.suggestedCta] ?? item.suggestedCta}
        </span>
      </div>
    </div>
  )
}

// ─── Main SentimentDashboard ──────────────────────────────────────────────────
/**
 * SentimentDashboard (M3b A5.4)
 * Real-time emotional tracking widget powered by Pusher + Redis cache.
 *
 * @param {string} tenantId - Required for Pusher channel subscription
 * @param {string} [className] - Optional CSS class
 */
export default function SentimentDashboard({ tenantId, className }) {
  const [analyses, setAnalyses] = useState([])
  const [loading, setLoading] = useState(true)
  const [flashIds, setFlashIds] = useState(new Set())
  const [lastUpdate, setLastUpdate] = useState(null)

  // ── Fetch from API ──────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/ai/sentiment-dashboard')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setAnalyses(data.analyses ?? [])
      setLastUpdate(new Date())
    } catch (err) {
      console.error('[SentimentDashboard] Fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // ── Pusher subscription ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!tenantId) return

    const pusherKey = process.env.NEXT_PUBLIC_PUSHER_KEY
    const pusherCluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER
    if (!pusherKey || !pusherCluster) return

    const pusher = new Pusher(pusherKey, { cluster: pusherCluster })
    const channel = pusher.subscribe(`tenant-${tenantId}`)

    // On any sentiment update — refresh list and flash the conversation
    const handleUpdate = (data) => {
      setLastUpdate(new Date())
      // Optimistic update — splice updated entry in-place
      setAnalyses((prev) => {
        const idx = prev.findIndex((a) => a.conversationId === data.conversationId)
        const updated = {
          conversationId: data.conversationId,
          customerName: data.customerName,
          purchaseIntent: data.purchaseIntent,
          sentiment: data.sentiment,
          pdadStage: data.pdadStage,
          suggestedCta: data.suggestedCta,
          summary: data.summary,
          source: 'realtime',
          updatedAt: data.updatedAt
        }
        if (idx >= 0) {
          const next = [...prev]
          next[idx] = updated
          return next.sort((a, b) => (b.purchaseIntent ?? 0) - (a.purchaseIntent ?? 0))
        }
        return [updated, ...prev]
      })
      // Flash animation for critical events
      if (data.purchaseIntent > 0.8 || data.sentiment === 'very_negative') {
        setFlashIds((prev) => new Set([...prev, data.conversationId]))
        setTimeout(() => {
          setFlashIds((prev) => {
            const next = new Set(prev)
            next.delete(data.conversationId)
            return next
          })
        }, 2500)
      }
    }

    channel.bind('sentiment-update', handleUpdate)
    channel.bind('high-intent-alert', handleUpdate)
    channel.bind('negative-sentiment-alert', handleUpdate)

    return () => {
      channel.unbind_all()
      pusher.unsubscribe(`tenant-${tenantId}`)
      pusher.disconnect()
    }
  }, [tenantId])

  // ── Summary stats ───────────────────────────────────────────────────────────
  const hotLeads = analyses.filter((a) => (a.purchaseIntent ?? 0) > 0.8).length
  const critical = analyses.filter((a) => a.sentiment === 'very_negative').length
  const total = analyses.length

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div
      className={className}
      style={{
        background: 'rgba(15,23,42,0.7)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 16,
        padding: '18px 16px',
        minWidth: 300,
        maxWidth: 420,
        fontFamily: "'Inter', 'Noto Sans Thai', sans-serif"
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>
            🧠 Sentiment Dashboard
          </h3>
          {lastUpdate && (
            <div style={{ fontSize: 10, color: '#475569', marginTop: 2 }}>
              Updated {lastUpdate.toLocaleTimeString('th-TH')}
            </div>
          )}
        </div>
        <button
          onClick={fetchData}
          style={{
            background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)',
            color: '#818cf8', borderRadius: 8, fontSize: 11, padding: '4px 10px',
            cursor: 'pointer', fontWeight: 600
          }}
        >
          ↻ Refresh
        </button>
      </div>

      {/* Summary chips */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <div style={{ flex: 1, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 8, padding: '6px 10px', textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#22c55e' }}>{total}</div>
          <div style={{ fontSize: 9, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tracked</div>
        </div>
        <div style={{ flex: 1, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '6px 10px', textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#ef4444' }}>{hotLeads}</div>
          <div style={{ fontSize: 9, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Hot Leads</div>
        </div>
        <div style={{ flex: 1, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8, padding: '6px 10px', textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#f59e0b' }}>{critical}</div>
          <div style={{ fontSize: 9, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Critical</div>
        </div>
      </div>

      {/* Conversation list */}
      <div style={{ maxHeight: 420, overflowY: 'auto', paddingRight: 2 }}>
        {loading ? (
          <div style={{ textAlign: 'center', color: '#475569', padding: '24px 0', fontSize: 13 }}>
            Loading...
          </div>
        ) : analyses.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#475569', padding: '24px 0', fontSize: 13 }}>
            No conversations tracked today
          </div>
        ) : (
          analyses.map((item) => (
            <ConvCard
              key={item.conversationId}
              item={item}
              flash={flashIds.has(item.conversationId)}
            />
          ))
        )}
      </div>
    </div>
  )
}
