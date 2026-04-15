// Created At: 2026-04-12 06:15:00 +07:00 (v1.3.25)
// Previous version: 2026-04-10 03:40:00 +07:00 (v1.0.0)
// Last Updated: 2026-04-12 06:15:00 +07:00 (v1.3.25)

import { GoogleGenerativeAI } from '@google/generative-ai'
import { getPrisma } from '@/lib/db'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

/**
 * Role-based table whitelist (Read-only access)
 */
const ROLE_TABLE_WHITELIST = {
  OWNER: [
    'tenants', 'employees', 'customers', 'conversations', 'messages',
    'orders', 'order_items', 'products', 'ad_accounts', 'campaigns',
    'ingredients', 'recipes', 'warehouse_stocks', 'stock_movements', 'tasks'
  ],
  MANAGER: [
    'employees', 'customers', 'conversations', 'messages', 'orders',
    'order_items', 'products', 'ad_accounts', 'campaigns', 'tasks'
  ],
  SALES: [
    'customers', 'conversations', 'messages', 'orders', 'order_items',
    'products', 'tasks'
  ],
  KITCHEN: [
    'ingredients', 'recipes', 'warehouse_stocks', 'products'
  ],
  FINANCE: [
    'orders', 'order_items', 'products'
  ],
  STAFF: [
    'customers', 'conversations', 'messages', 'tasks'
  ]
}

/**
 * Clean and validate generated SQL
 */
function validateSql(sql, role, tenantId) {
  const normalizedSql = sql.trim().toUpperCase()
  
  // 1. Must be a SELECT statement
  if (!normalizedSql.startsWith('SELECT')) {
    throw new Error('Only SELECT queries are allowed.')
  }

  // 2. Check for malicious keywords
  const forbidden = ['UPDATE', 'DELETE', 'INSERT', 'DROP', 'ALTER', 'TRUNCATE', 'GRANT', 'REVOKE', 'EXEC']
  for (const word of forbidden) {
    if (normalizedSql.includes(word)) {
      throw new Error(`Forbidden keyword detected: ${word}`)
    }
  }

  return true
}

/**
 * AI Assistant Pipeline
 */
export async function processAssistantMessage({ message, history, role, tenantId, userId, context = {} }) {
  const prisma = await getPrisma()
  const systemPrompt = `
    You are the Zuri AI Assistant, a professional and helpful assistant for school administrators and staff at Zuri.
    
    Role: ${role}
    Tenant ID: ${tenantId}
    Current Page: ${context.path || 'Dashboard'}
    
    Capabilities:
    1. Answer general questions about the system.
    2. Query data using SQL (read-only).
    3. Help with daily tasks and summaries.
    
    SQL Schema Context:
    - customers: id, name, phone, email, tenant_id
    - orders: id, customer_id, total_amount, status, tenant_id, created_at
    - products: id, name, price, tenant_id
    - tasks: id, title, status, assignee_id, tenant_id
    - conversations: id, customer_id, platform, tenant_id
    
    Rules for SQL:
    - If the user asks for data (e.g., "What are today's sales?"), respond with a JSON object:
      { "type": "SQL_QUERY", "sql": "SELECT ...", "explanation": "..." }
    - ALWAYS include "WHERE tenant_id = '${tenantId}'" in every query.
    - If you need to join tables, ensure all have tenant_id filters.
    - Limit results to 50 unless specified.
    
    Rules for Chat:
    - If the user is just chatting, respond normally in Thai.
    - Professional tone, helpful, and concise.
    
    Refuse:
    - Changing data (Update/Delete).
    - Accessing passwords or keys.
    - Queries outside of your context.

    Conversation History:
    ${JSON.stringify(history.slice(-5))}
  `

  try {
    const chat = model.startChat({
      history: [
        { role: 'user', parts: [{ text: systemPrompt }] },
        { role: 'model', parts: [{ text: 'I understand my role as the Zuri AI Assistant. I will assist you within these parameters.' }] }
      ]
    })

    const result = await chat.sendMessage(message)
    const responseText = result.response.text()

    // Check if response is intended to be JSON (SQL)
    if (responseText.includes('SQL_QUERY')) {
      const cleanedText = responseText.replace(/```json|```/g, '').trim()
      const data = JSON.parse(cleanedText)
      
      // Validate and Execute
      try {
        validateSql(data.sql, role, tenantId)
        
        // Execute Query
        const results = await prisma.$queryRawUnsafe(data.sql)
        
        // Re-format results into a friendly Thai response
        const summarizePrompt = `
          Based on these raw database results, answer the user's question: "${message}"
          Results: ${JSON.stringify(results)}
          Response language: Thai.
        `
        const finalResult = await model.generateContent(summarizePrompt)
        return {
          type: 'DATA_REPLY',
          content: finalResult.response.text(),
          rawData: results,
          sql: data.sql
        }
      } catch (sqlErr) {
        return { type: 'ERROR', content: `ขออภัยครับ เกิดข้อผิดพลาดในการดึงข้อมูล: ${sqlErr.message}` }
      }
    }

    return { type: 'CHAT_REPLY', content: responseText }
  } catch (error) {
    console.error('Assistant Pipeline Error:', error)
    return { type: 'ERROR', content: 'ขออภัยครับ ระบบขัดข้องชั่วคราว ลองใหม่อีกครั้งนะครับ' }
  }
}
