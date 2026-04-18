// AUTO-GENERATED from phase3.5_microtasks/FEAT-006/
// Do not edit directly. Regenerate via: npm run msp:codegen FEAT-006
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { mergeTables } from '@/lib/repositories/tableRepo'

// ─── helpers ───────────────────────────────────────────────────────────
function validateMergeInput(body) {
  if (typeof body !== 'object' || body === null) {
    return { ok: false, error: "Body must be a JSON object" };
  }
  
  if (typeof body.primary_id !== 'string' || body.primary_id.trim() === '') {
    return { ok: false, error: "primary_id required" };
  }
  
  if (!Array.isArray(body.children_ids)) {
    return { ok: false, error: "children_ids must be an array" };
  }
  
  if (body.children_ids.length < 1) {
    return { ok: false, error: "children_ids cannot be empty" };
  }
  
  for (let i = 0; i < body.children_ids.length; i++) {
    if (typeof body.children_ids[i] !== 'string' || body.children_ids[i].trim() === '') {
      return { ok: false, error: "children_ids must all be non-empty strings" };
    }
  }
  
  return { ok: true, data: { primary_id: body.primary_id, children_ids: body.children_ids } };
}

function mapRepoErrorToHttp(err) {
  if (err.message.includes("cross-tenant") || err.message.includes("not found")) {
    return { status: 404, body: { error: "Resource not found" } };
  }
  if (err.message.includes("already part of a merge") || err.message.includes("not available")) {
    return { status: 409, body: { error: "Conflict: " + err.message } };
  }
  return { status: 500, body: { error: "Internal Server Error" } };
}

// ─── handler ───────────────────────────────────────────────────────────
async function mergeHandler(req, ctx) {
  const body = await req.json();
  const validation = validateMergeInput(body);
  if (!validation.ok) return NextResponse.json({ error: validation.error }, { status: 400 });
  try {
    const result = await mergeTables(ctx.tenantId, validation.data.primary_id, validation.data.children_ids);
    return NextResponse.json({ ok: true, data: result }, { status: 200 });
  } catch (err) {
    const mapped = mapRepoErrorToHttp(err);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}

// ─── route exports ─────────────────────────────────────────────────────
export const POST = withAuth(mergeHandler);
