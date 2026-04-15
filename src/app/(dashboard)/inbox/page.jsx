'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain } from 'lucide-react';
import { usePusher } from '@/hooks/usePusher';
import { useSession } from '@/hooks/useSession';
import ConversationList from '@/components/inbox/ConversationList';
import ChatView from '@/components/inbox/ChatView';
import ReplyBox from '@/components/inbox/ReplyBox';
import RightPanel from '@/components/inbox/RightPanel';
import SentimentDashboard from '@/components/ai/SentimentDashboard';

// ─── Shape API conversation for ConversationList ──────────────────────────────
function shapeConversation(conv) {
  const lastMsg = conv.messages?.[0]
  const name    = conv.customer?.facebookName ?? conv.participantId ?? 'Unknown'
  return {
    id:          conv.id,
    name,
    customerId:  conv.customerId,
    channel:     conv.channel === 'facebook' ? 'FB' : 'LINE',
    status:      conv.status,
    agentMode:   !!conv.agentMode,        // M4-A2: AI agent auto-reply flag
    lastMessage: lastMsg?.content ?? '',
    time:        lastMsg ? formatTime(lastMsg.createdAt) : '',
    unread:      0,  // TODO: track per-conversation unread count
  }
}

function shapeMessage(msg) {
  return {
    id:         msg.id,
    sender:     msg.sender,        // 'staff' | 'customer'
    senderName: msg.sender === 'staff' ? 'Staff' : null,
    text:       msg.content ?? '',
    time:       formatTime(msg.createdAt),
  }
}

function formatTime(isoString) {
  if (!isoString) return ''
  const d = new Date(isoString)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false })
  }
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return 'เมื่อวาน'
  return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function InboxPage() {
  const { tenantId } = useSession()
  const searchParams = useSearchParams()
  const channelFilter = searchParams.get('channel') // 'facebook' | 'line' | 'pending' | null

  const [conversations, setConversations] = useState([])
  const [loadingList, setLoadingList]     = useState(true)
  const [selectedConv, setSelectedConv]   = useState(null)
  const [messages, setMessages]           = useState([])
  const [loadingMsgs, setLoadingMsgs]     = useState(false)
  const [customer, setCustomer]           = useState(null)
  const [sending, setSending]             = useState(false)
  const [showSentiment, setShowSentiment] = useState(false)  // M4 A5.4 toggle

  // ── 1. Fetch conversation list ──────────────────────────────────────────────
  const fetchConversations = useCallback(async () => {
    try {
      const res  = await fetch('/api/conversations?limit=30')
      const json = await res.json()
      setConversations((json.data ?? []).map(shapeConversation))
    } catch (err) {
      console.error('[InboxPage] fetchConversations', err)
    } finally {
      setLoadingList(false)
    }
  }, [])

  useEffect(() => { fetchConversations() }, [fetchConversations])

  // ── 2. Pusher: subscribe to new-message events ──────────────────────────────
  const pusherChannel = tenantId ? `tenant-${tenantId}` : null

  usePusher(pusherChannel, {
    onNewMessage: useCallback((data) => {
      const { conversationId, message } = data

      // Append to open conversation's message list
      setSelectedConv((current) => {
        if (current?.id === conversationId) {
          setMessages((prev) => {
            const exists = prev.some((m) => m.id === message.id)
            if (exists) return prev
            return [...prev, shapeMessage(message)]
          })
        }
        return current
      })

      // Refresh conversation list (latest message + ordering)
      fetchConversations()
    }, [fetchConversations]),
  })

  // ── 3. Load messages on conversation select ─────────────────────────────────
  const handleSelectConversation = useCallback(async (conv) => {
    setSelectedConv(conv)
    setMessages([])
    setCustomer(null)
    setLoadingMsgs(true)

    try {
      const res  = await fetch(`/api/conversations/${conv.id}`)
      const json = await res.json()
      const data = json.data ?? {}
      setMessages((data.messages ?? []).map(shapeMessage))
      setCustomer(data.customer ?? null)
    } catch (err) {
      console.error('[InboxPage] fetchConversation', err)
    } finally {
      setLoadingMsgs(false)
    }
  }, [])

  // ── 4. Send reply ───────────────────────────────────────────────────────────
  const handleSend = useCallback(async (text) => {
    if (!selectedConv || sending) return

    // Optimistic update
    const optimisticId  = `opt-${Date.now()}`
    const optimisticMsg = {
      id:         optimisticId,
      sender:     'staff',
      senderName: 'Staff',
      text,
      time:       formatTime(new Date().toISOString()),
    }
    setMessages((prev) => [...prev, optimisticMsg])
    setSending(true)

    try {
      const res = await fetch(`/api/conversations/${selectedConv.id}/reply`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ message: text }),
      })
      if (!res.ok) throw new Error('Reply failed')
      const json = await res.json()

      // Swap optimistic with confirmed
      setMessages((prev) =>
        prev.map((m) =>
          m.id === optimisticId ? { ...m, id: json.messageId ?? m.id } : m
        )
      )
    } catch (err) {
      console.error('[InboxPage] send', err)
      // Roll back optimistic
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId))
    } finally {
      setSending(false)
    }
  }, [selectedConv, sending])

  const handleUpdateCustomer = useCallback((updated) => setCustomer(updated), [])

  // When ChatView toggles Agent Mode, reflect it in conversation list
  const handleAgentModeChange = useCallback((conversationId, enabled) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === conversationId ? { ...c, agentMode: enabled } : c))
    )
    setSelectedConv((curr) =>
      curr?.id === conversationId ? { ...curr, agentMode: enabled } : curr
    )
  }, [])

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full bg-white overflow-hidden relative">
      {/* Left: Conversation List */}
      <ConversationList
        conversations={conversations.filter(c => {
          if (!channelFilter || channelFilter === 'all') return true;
          if (channelFilter === 'pending') return c.status === 'OPEN' && !c.agentMode;
          if (channelFilter === 'facebook') return c.channel === 'FB';
          if (channelFilter === 'line') return c.channel === 'LINE';
          return true;
        })}
        activeId={selectedConv?.id}
        onSelect={handleSelectConversation}
        loading={loadingList}
      />

      {/* Center: Chat View + Reply Box */}
      <div className="flex-1 flex flex-col min-w-0">
        <ChatView
          conversation={selectedConv}
          messages={messages}
          loading={loadingMsgs}
          onAgentModeChange={handleAgentModeChange}
        />
        {selectedConv && (
          <ReplyBox
            onSend={handleSend}
            disabled={sending}
            placeholder={sending ? 'Sending...' : 'Type a message...'}
          />
        )}
      </div>

      {/* Right: Customer Profile + Activity */}
      <RightPanel
        customer={customer}
        onUpdate={handleUpdateCustomer}
      />

      {/* Floating Sentiment Dashboard Toggle (M4 A5.4) */}
      <motion.button
        onClick={() => setShowSentiment((v) => !v)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={`
          fixed bottom-6 right-6 z-40 h-12 w-12 rounded-full shadow-lg
          flex items-center justify-center transition-colors duration-300
          ${showSentiment
            ? 'bg-[#1A1710] text-orange-400 ring-2 ring-orange-400/40'
            : 'bg-orange-500 text-white hover:bg-orange-600'
          }
        `}
        title={showSentiment ? 'ซ่อน Sentiment Dashboard' : 'แสดง Sentiment Dashboard'}
      >
        <Brain size={20} />
      </motion.button>

      {/* Sentiment Dashboard Panel (slide-in from right) */}
      <AnimatePresence>
        {showSentiment && (
          <motion.div
            initial={{ x: 440, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 440, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="fixed right-24 bottom-24 top-20 z-30 w-[420px] max-h-[calc(100vh-120px)] overflow-hidden rounded-2xl shadow-2xl"
          >
            <SentimentDashboard tenantId={tenantId} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
