import { NextResponse } from 'next/server'
import { getTenantId } from '@/lib/tenant'

/**
 * MCP (Model Context Protocol) server endpoint for Zuri CRM.
 * Exposes structured tools that AI agents can call to interact with CRM data.
 *
 * Spec: https://spec.modelcontextprotocol.io/
 */

// Describe available MCP tools
const MCP_TOOLS = [
  {
    name: 'list_customers',
    description: 'List customers with optional filters',
    inputSchema: {
      type: 'object',
      properties: {
        search: { type: 'string' },
        limit: { type: 'number', default: 10 },
      },
    },
  },
  {
    name: 'get_customer',
    description: 'Get a single customer by ID',
    inputSchema: {
      type: 'object',
      required: ['id'],
      properties: {
        id: { type: 'string' },
      },
    },
  },
  {
    name: 'list_conversations',
    description: 'List recent conversations',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['open', 'closed', 'pending'] },
        limit: { type: 'number', default: 10 },
      },
    },
  },
  {
    name: 'list_orders',
    description: 'List orders with optional status filter',
    inputSchema: {
      type: 'object',
      properties: {
        customerId: { type: 'string' },
        status: { type: 'string' },
        limit: { type: 'number', default: 10 },
      },
    },
  },
  // TODO: Add more tools as features are implemented
]

// GET /api/mcp - Return MCP server manifest (tools list)
export async function GET(request) {
  try {
    // TODO: Optionally require authentication for tool discovery
    return NextResponse.json({
      protocolVersion: '2024-11-05',
      serverInfo: {
        name: 'zuri-crm',
        version: '1.0.0',
      },
      capabilities: {
        tools: {},
      },
      tools: MCP_TOOLS,
    })
  } catch (error) {
    console.error('[MCP]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/mcp - Handle MCP tool calls
export async function POST(request) {
  try {
    const tenantId = await getTenantId(request)
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { method, params } = body

    // Handle MCP initialize handshake
    if (method === 'initialize') {
      return NextResponse.json({
        protocolVersion: '2024-11-05',
        serverInfo: { name: 'zuri-crm', version: '1.0.0' },
        capabilities: { tools: {} },
      })
    }

    // Handle tools/list request
    if (method === 'tools/list') {
      return NextResponse.json({ tools: MCP_TOOLS })
    }

    // Handle tools/call request
    if (method === 'tools/call') {
      const { name: toolName, arguments: toolArgs } = params ?? {}

      switch (toolName) {
        case 'list_customers': {
          // TODO: Import customerRepo and call getCustomers({ tenantId, ...toolArgs })
          return NextResponse.json({ content: [{ type: 'text', text: JSON.stringify([]) }] })
        }
        case 'get_customer': {
          // TODO: Import customerRepo and call getCustomerById({ tenantId, id: toolArgs.id })
          return NextResponse.json({ content: [{ type: 'text', text: JSON.stringify(null) }] })
        }
        case 'list_conversations': {
          // TODO: Import conversationRepo and call getConversations({ tenantId, ...toolArgs })
          return NextResponse.json({ content: [{ type: 'text', text: JSON.stringify([]) }] })
        }
        case 'list_orders': {
          // TODO: Import orderRepo and call getOrders({ tenantId, ...toolArgs })
          return NextResponse.json({ content: [{ type: 'text', text: JSON.stringify([]) }] })
        }
        default:
          return NextResponse.json(
            { error: { code: -32601, message: `Unknown tool: ${toolName}` } },
            { status: 404 }
          )
      }
    }

    return NextResponse.json(
      { error: { code: -32601, message: `Unknown method: ${method}` } },
      { status: 404 }
    )
  } catch (error) {
    console.error('[MCP]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
