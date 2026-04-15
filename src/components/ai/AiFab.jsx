// Created At: 2026-04-10 04:10:00 +07:00 (v1.0.0)
// Previous version: —
// Last Updated: 2026-04-10 04:10:00 +07:00 (v1.0.0)

'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import AiChatPopup from './AiChatPopup'
import './AiAssistant.css'

export default function AiFab() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <motion.div
        className={`ai-fab ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>
          {isOpen ? 'close' : 'smart_toy'}
        </span>
      </motion.div>

      <AnimatePresence>
        {isOpen && (
          <AiChatPopup onClose={() => setIsOpen(false)} />
        )}
      </AnimatePresence>
    </>
  )
}
