'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';

const TABS = ['All', 'FB', 'LINE'];

// Placeholder conversation card
function ConversationCard({ conv, isActive, onClick }) {
  return (
    <button
      onClick={() => onClick(conv)}
      className={`
        w-full text-left px-4 py-3 flex items-start gap-3 border-b border-gray-100
        hover:bg-indigo-50 transition-colors
        ${isActive ? 'bg-indigo-50 border-l-2 border-l-indigo-600' : ''}
      `}
    >
      {/* Avatar */}
      <div className="relative shrink-0">
        <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold text-sm">
          {conv.name?.[0]?.toUpperCase() ?? '?'}
        </div>
        {/* Channel badge */}
        <span className={`
          absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full text-[9px] flex items-center justify-center font-bold text-white
          ${conv.channel === 'FB' ? 'bg-blue-600' : conv.channel === 'LINE' ? 'bg-green-500' : 'bg-gray-400'}
        `}>
          {conv.channel?.[0]}
        </span>
      </div>
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-900 truncate">{conv.name}</span>
          <span className="text-xs text-gray-400 shrink-0 ml-2">{conv.time}</span>
        </div>
        <p className="text-xs text-gray-500 truncate mt-0.5">{conv.lastMessage}</p>
      </div>
      {conv.unread > 0 && (
        <span className="shrink-0 mt-1 h-5 w-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center">
          {conv.unread}
        </span>
      )}
    </button>
  );
}

export default function ConversationList({
  conversations = [],
  activeId,
  onSelect,
  loading = false,
}) {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('All');

  const filtered = conversations.filter((c) => {
    const matchesTab = activeTab === 'All' || c.channel === activeTab;
    const matchesSearch = c.name?.toLowerCase().includes(search.toLowerCase());
    return matchesTab && matchesSearch;
  });

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200 w-72 shrink-0">
      {/* Search */}
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-gray-100 rounded-lg border-0 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex border-b border-gray-100">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`
              flex-1 py-2.5 text-sm font-medium transition-colors
              ${activeTab === tab
                ? 'text-indigo-600 border-b-2 border-indigo-600'
                : 'text-gray-500 hover:text-gray-700'
              }
            `}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 text-sm py-10">
            <p>Loading...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 text-sm py-10">
            <p>No conversations found.</p>
          </div>
        ) : (
          filtered.map((conv) => (
            <ConversationCard
              key={conv.id}
              conv={conv}
              isActive={conv.id === activeId}
              onClick={onSelect}
            />
          ))
        )}
      </div>
    </div>
  );
}
