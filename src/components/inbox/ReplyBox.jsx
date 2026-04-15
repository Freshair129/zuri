'use client';

import { useState } from 'react';
import { Send, Paperclip, Smile } from 'lucide-react';

export default function ReplyBox({ onSend, disabled = false, placeholder = 'Type a message...' }) {
  const [text, setText] = useState('');

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend?.(trimmed);
    setText('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="bg-white border-t border-gray-200 px-4 py-3 shrink-0">
      <div className="flex items-end gap-2 bg-gray-100 rounded-xl px-3 py-2">
        {/* Attach */}
        <button className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors shrink-0 mb-0.5">
          <Paperclip className="h-4 w-4" />
        </button>

        {/* Textarea */}
        <textarea
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-sm text-gray-800 placeholder:text-gray-400 resize-none focus:outline-none min-h-[24px] max-h-32 leading-6 py-0.5"
          style={{ height: 'auto' }}
          onInput={(e) => {
            e.target.style.height = 'auto';
            e.target.style.height = e.target.scrollHeight + 'px';
          }}
        />

        {/* Emoji */}
        <button className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors shrink-0 mb-0.5">
          <Smile className="h-4 w-4" />
        </button>

        {/* Send */}
        <button
          onClick={handleSend}
          disabled={!text.trim() || disabled}
          className="p-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
      <p className="text-[11px] text-gray-400 mt-1 ml-2">Press Enter to send · Shift+Enter for new line</p>
    </div>
  );
}
