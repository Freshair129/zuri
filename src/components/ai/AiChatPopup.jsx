// Created At: 2026-04-10 04:20:00 +07:00 (v1.0.0)
// Previous version: —
// Last Updated: 2026-04-10 04:20:00 +07:00 (v1.0.0)

'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'

export default function AiChatPopup({ onClose }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const scrollRef = useRef(null)

  // Load history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('zuri-ai-history')
    if (saved) {
      try {
        setMessages(JSON.parse(saved))
      } catch (e) {
        setMessages([{ role: 'assistant', content: 'สวัสดีครับ! ผมคือ Zuri AI ผู้ช่วยส่วนตัวของคุณ วันนี้มีอะไรให้ผมช่วยไหมครับ? เช่น สรุปยอดขายวันนี้ หรือ ดูรายการออเดอร์ล่าสุด' }])
      }
    } else {
      setMessages([{ role: 'assistant', content: 'สวัสดีครับ! ผมคือ Zuri AI ผู้ช่วยส่วนตัวของคุณ วันนี้มีอะไรให้ผมช่วยไหมครับ? เช่น สรุปยอดขายวันนี้ หรือ ดูรายการออเดอร์ล่าสุด' }])
    }
  }, [])

  // Save history (Limit to 20)
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('zuri-ai-history', JSON.stringify(messages.slice(-20)))
    }
    // Auto scroll to bottom
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = async (textOverride) => {
    const text = textOverride || input
    if (!text.trim() || isLoading) return

    const userMsg = { role: 'user', content: text }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setIsLoading(true)

    try {
      const res = await fetch('/api/ai/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: messages.slice(-5), // Send last 5 for context
          context: { path: window.location.pathname }
        })
      })

      const data = await res.json()
      if (data.error) throw new Error(data.error)

      setMessages(prev => [...prev, { role: 'assistant', content: data.content }])
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'ขออภัยครับ เกิดข้อผิดพลาดในการติดต่อระบบ AI' }])
    } finally {
      setIsLoading(false)
    }
  }

  const suggestions = [
    'สรุปยอดขายวันนี้',
    'ดูออเดอร์ล่าสุด 5 รายการ',
    'มีใครทักมาบ้างวันนี้'
  ]

  return (
    <motion.div
      className="ai-chat-popup"
      initial={{ y: 50, opacity: 0, scale: 0.9 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={{ y: 50, opacity: 0, scale: 0.9 }}
    >
      <div className="ai-chat-header">
        <span className="material-symbols-outlined" style={{ color: '#FA6400' }}>smart_toy</span>
        <h3>Zuri AI Assistant</h3>
        <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', opacity: 0.5 }}>
          <span className="material-symbols-outlined">expand_more</span>
        </button>
      </div>

      <div className="ai-message-list" ref={scrollRef}>
        {messages.map((msg, i) => (
          <div key={i} className={`ai-message ${msg.role}`}>
            {msg.content}
          </div>
        ))}
        {isLoading && (
          <div className="ai-message assistant" style={{ fontStyle: 'italic', opacity: 0.7 }}>
            กำลังพิมพ์...
          </div>
        )}
      </div>

      {messages.length < 5 && !isLoading && (
        <div className="ai-suggested">
          {suggestions.map((s, i) => (
            <div key={i} className="ai-chip" onClick={() => handleSend(s)}>
              {s}
            </div>
          ))}
        </div>
      )}

      <div className="ai-input-area">
        <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="ai-input-wrapper">
          <input
            type="text"
            placeholder="ถามอะไรผมก็ได้..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
          />
          <button type="submit" className="ai-send-btn" disabled={isLoading}>
            <span className="material-symbols-outlined">send</span>
          </button>
        </form>
      </div>
    </motion.div>
  )
}
