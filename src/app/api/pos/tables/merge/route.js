// AUTO-GENERATED from phase3.5_microtasks/FEAT-006/
// Do not edit directly. Regenerate via: npm run msp:codegen FEAT-006
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { mergeTables } from '@/lib/repositories/tableRepo'

// ─── helpers ───────────────────────────────────────────────────────────
function validateMergeInput(body) {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return { ok: false, error: 'Body must be a JSON object' }
  }

  if (typeof body.primary_id !== 'string' || body.primary_id.trim() === '') {
    return { ok: false, error: 'primary_id required' }
  }

  if (!Array.isArray(body.children_ids)) {
    return { ok: false, error: 'children_ids must be an array' }
  }

  if (body.children_ids.length < 1) {
    return { ok: false, error: 'children_ids cannot be empty' }
  }

  if (body.children_ids.some((id) => typeof id !== 'string' || id.trim() === '')) {
    return { ok: false, error: 'children_ids must all be non-empty strings' }
  }

  const primaryId = body.primary_id.trim()
  const childrenIds = body.children_ids.map((id) => id.trim())

  if (childrenIds.includes(primaryId)) {
    return { ok: false, error: 'primary_id cannot also appear in children_ids' }
  }

  if (new Set(childrenIds).size !== childrenIds.length) {
    return { ok: false, error: 'children_ids must not contain duplicates' }
  }

  return { ok: true, data: { primary_id: primaryId, children_ids: childrenIds } }
}

function mapRepoErrorToHttp(err) {
  const message = err && typeof err.message === 'string' ? err.message : String(err ?? '')

  if (message.includes('cross-tenant') || message.includes('not found')) {
    return { status: 404, body: { error: 'Resource not found' } }
  }
  if (message.includes('already part of a merge') || message.includes('not available')) {
    return { status: 409, body: { error: 'Conflict: ' + message } }
  }
  return { status: 500, body: { error: 'Internal Server Error' } }
}

// ─── handler ───────────────────────────────────────────────────────────
async function mergeHandler(req, ctx) {
  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const validation = validateMergeInput(body)
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 })
  }

  const tenantId = ctx.session.user.tenantId

  try {
    const result = await mergeTables(
      tenantId,
      validation.data.primary_id,
      validation.data.children_ids
    )
    return NextResponse.json({ ok: true, data: result }, { status: 200 })
  } catch (err) {
    const mapped = mapRepoErrorToHttp(err)
    return NextResponse.json(mapped.body, { status: mapped.status })
  }
}

// ─── route exports ─────────────────────────────────────────────────────
export const POST = withAuth(mergeHandler, { domain: 'orders', action: 'F' })
