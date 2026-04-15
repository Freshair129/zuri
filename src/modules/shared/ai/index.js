/**
 * AI Engine Module — Gemini 2.0 Flash, compose-reply, ask-AI, agent processor
 * @module shared/ai
 */

export const MODULE_NAME = 'ai'

// Model config — import from system_config.yaml via systemConfig.js
export const AI_MODELS = {
  COMPOSE_REPLY: 'gemini-2.0-flash',
  ASK_AI: 'gemini-2.0-flash',
  DAILY_BRIEF: 'gemini-2.0-flash',
  SLIP_OCR: 'gemini-2.0-flash',
}

// Context limits
export const MAX_CONTEXT_MESSAGES = 10
export const MAX_AGENT_CONTEXT_MESSAGES = 20
export const MAX_CONVERSATIONS_PER_DAY = 500
