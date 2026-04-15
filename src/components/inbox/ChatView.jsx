'use client';

/**
 * ChatView — Center panel of the Inbox (FEAT04).
 * M4 UI Integration (ZDEV-TSK-20260410-015):
 *   + Agent Mode toggle in chat header (MANAGER+ only)
 *   + 🤖 "AI ACTIVE" badge when conversation.agentMode === true
 */

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Loader2 } from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import { can } from '@/lib/permissionMatrix';

function MessageBubble({ message }) {
  const isStaff = message.sender === 'staff';
  const isAi = message.sender === 'AI';

  return (
    <div className={`flex items-end gap-2 ${isStaff || isAi ? 'flex-row-reverse' : 'flex-row'}`}>
      {!isStaff && !isAi && (
        <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-semibold text-xs shrink-0">
          {message.senderName?.[0]?.toUpperCase() ?? 'C'}
        </div>
      )}
      {isAi && (
        <div className="h-8 w-8 rounded-full bg-[#D6ECFA] flex items-center justify-center text-sky-600 shrink-0">
          <Bot size={14} />
        </div>
      )}
      <div className={`max-w-xs lg:max-w-md ${isStaff || isAi ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        <div
          className={`
            px-4 py-2.5 rounded-2xl text-sm leading-relaxed
            ${isAi
              ? 'bg-[#D6ECFA] text-slate-800 rounded-br-sm border border-sky-100'
              : isStaff
                ? 'bg-orange-500 text-white rounded-br-sm shadow-sm'
                : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm'
            }
          `}
        >
          {message.text}
        </div>
        <span className="text-[11px] text-gray-400 px-1">
          {isAi && <span className="text-sky-500 font-medium mr-1">AI</span>}
          {message.time}
        </span>
      </div>
    </div>
  );
}

/**
 * ChatView — Center panel displaying messages + Agent Mode controls.
 *
 * @param {Object} props
 * @param {Object|null} props.conversation - Active conversation object
 * @param {Array} props.messages - Messages in the active conversation
 * @param {boolean} props.loading - Message loading state
 * @param {Function} [props.onAgentModeChange] - Callback(conversationId, enabled) after toggle
 */
export default function ChatView({
  conversation = null,
  messages = [],
  loading = false,
  onAgentModeChange = () => {},
}) {
  const bottomRef = useRef(null);
  const { roles } = useSession();

  const [agentMode, setAgentMode] = useState(!!conversation?.agentMode);
  const [toggling, setToggling] = useState(false);
  const [warning, setWarning] = useState(null);

  // Sync local state with conversation changes
  useEffect(() => {
    setAgentMode(!!conversation?.agentMode);
    setWarning(null);
  }, [conversation?.id, conversation?.agentMode]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // RBAC: MANAGER+ only for Agent Mode toggle
  const canToggle = can(roles, 'inbox', 'F');

  const handleToggleAgentMode = async () => {
    if (!conversation || toggling || !canToggle) return;
    const nextEnabled = !agentMode;

    // Optimistic
    setAgentMode(nextEnabled);
    setToggling(true);
    setWarning(null);

    try {
      const res = await fetch('/api/ai/agent-mode/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: conversation.id, enabled: nextEnabled }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Toggle failed');

      setAgentMode(json.agentMode);
      if (json.warning) setWarning(json.warning);
      onAgentModeChange(conversation.id, json.agentMode);
    } catch (err) {
      console.error('[ChatView] agent-mode toggle', err);
      // Roll back
      setAgentMode(!nextEnabled);
      setWarning(err.message);
    } finally {
      setToggling(false);
    }
  };

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#F7F8FA] text-gray-400">
        <p>Select a conversation to start chatting.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#F7F8FA]">
      {/* Chat header */}
      <div className="flex items-center gap-3 px-6 py-4 bg-white border-b border-gray-200 shrink-0">
        <div className="h-9 w-9 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-semibold">
          {conversation.name?.[0]?.toUpperCase() ?? '?'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-gray-900 text-sm truncate">{conversation.name}</p>
            {/* 🤖 AI ACTIVE badge */}
            <AnimatePresence>
              {agentMode && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.25, ease: [0.68, -0.6, 0.32, 1.6] }}
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#D6ECFA] border border-sky-200 text-sky-700 rounded-full text-[10px] font-bold uppercase tracking-wide"
                >
                  <Bot size={10} /> AI Active
                </motion.span>
              )}
            </AnimatePresence>
          </div>
          <p className="text-xs text-gray-500">
            {conversation.channel} · {conversation.status ?? 'Active'}
          </p>
        </div>

        {/* Agent Mode Toggle */}
        {canToggle && (
          <motion.button
            onClick={handleToggleAgentMode}
            disabled={toggling}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`
              relative flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold
              transition-colors duration-300 border
              ${agentMode
                ? 'bg-[#D6ECFA] border-sky-300 text-sky-700 hover:bg-sky-100'
                : 'bg-white border-gray-200 text-gray-600 hover:border-orange-300 hover:text-orange-600'
              }
              disabled:opacity-60 disabled:cursor-wait
            `}
            title={agentMode ? 'ปิดโหมด AI auto-reply' : 'เปิดโหมด AI auto-reply'}
          >
            {toggling ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Bot size={12} />
            )}
            <span>{agentMode ? 'AI Mode ON' : 'AI Mode OFF'}</span>
          </motion.button>
        )}
      </div>

      {/* Warning banner */}
      <AnimatePresence>
        {warning && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-6 py-2 bg-amber-50 border-b border-amber-200 text-xs text-amber-800"
          >
            {warning}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-4">
        {loading ? (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm gap-2">
            <Loader2 size={14} className="animate-spin" />
            Loading messages...
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">
            No messages yet.
          </div>
        ) : (
          messages.map((msg, idx) => (
            <MessageBubble key={msg.id ?? idx} message={msg} />
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
