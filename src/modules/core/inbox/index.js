/**
 * Inbox Module — Unified FB + LINE messaging, conversation management
 * @module core/inbox
 */

// Repositories
export { default as conversationRepo } from '../../../lib/repositories/conversationRepo.js'

// Components
export { default as ChatView } from '../../../components/inbox/ChatView.jsx'
export { default as ConversationList } from '../../../components/inbox/ConversationList.jsx'
export { default as CustomerCard } from '../../../components/inbox/CustomerCard.jsx'
export { default as ChatPOS } from '../../../components/inbox/ChatPOS.jsx'
export { default as ReplyBox } from '../../../components/inbox/ReplyBox.jsx'

// Constants
export const MODULE_NAME = 'inbox'
