#!/usr/bin/env node
// Generate YAML frontmatter for a phase2_atomic file using Gemini CLI.
// Pipes document content via stdin; prompt template via -p flag.
//
// Usage: node scripts/msp/gen-frontmatter.mjs <path-to-md-file>

import { readFileSync, writeFileSync } from 'node:fs';
import { basename, extname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { writeFileSync as writeTmp, unlinkSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join as pjoin } from 'node:path';

const file = process.argv[2];
if (!file) {
  console.error('Usage: gen-frontmatter.mjs <file>');
  process.exit(2);
}

const raw = readFileSync(file, 'utf8');
if (/^---\s*\r?\n/.test(raw)) {
  console.log(`[FM] ${file} already has frontmatter - skipping`);
  process.exit(0);
}

const name = basename(file, extname(file));

let idHint = name;
let typeHint = 'other';
const adrMatch = name.match(/^ADR-(\d{3})/);
if (adrMatch) {
  idHint = `ADR-${adrMatch[1]}`;
  typeHint = 'architecture_decision';
} else if (name.startsWith('FEAT--')) {
  typeHint = 'feature';
} else if (name.startsWith('MOD--')) {
  typeHint = 'module';
} else if (name.startsWith('PROTO--')) {
  typeHint = 'protocol';
} else if (name.startsWith('FLOW--')) {
  typeHint = 'flow';
} else {
  idHint = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  if (/^(LAWS|TECH_STACK|WEBHOOK)/i.test(name)) typeHint = 'knowledge';
  else typeHint = 'protocol';
}

const today = new Date().toISOString().slice(0, 10);
const extraFields = typeHint === 'architecture_decision'
  ? '\nepistemic:\n  confidence: 1.0\n  source_type: "documented_source"\ncontext_anchor:\n  duration: "universal"'
  : '';

const promptTemplate = `TASK: Read the document on stdin. Produce ONLY the YAML frontmatter block below, filling in ONLY <SUMMARY> (<=180 chars, one sentence, match document's language Thai or English) and <TAGS> (2-5 lowercase hyphen-separated tags comma-joined).

Rules:
- Do NOT change id, type, status, version, created_at, created_by.
- Do NOT add fields.
- Do NOT use markdown code fences.
- Output starts with --- and ends with --- nothing else.

Template (substitute <SUMMARY> and <TAGS>):
---
id: "${idHint}"
type: "${typeHint}"
status: "active"
version: "1.0.0"
summary: "<SUMMARY>"
tags: [<TAGS>]
created_at: "${today}"
created_by: "@gemini-draft"${extraFields}
---`;

const stdinContent = raw.slice(0, 3500);

// Write content to temp file, pipe via shell (`cat tempfile | gemini -p "..."`).
// This avoids Windows spawnSync stdin quirks.
const tmpDir = mkdtempSync(pjoin(tmpdir(), 'msp-fm-'));
const tmpFile = pjoin(tmpDir, 'doc.txt');
writeTmp(tmpFile, stdinContent);

// Prompt goes as single argv to shell; use env var to avoid quoting hell
process.env.MSP_FM_PROMPT = promptTemplate;

async function callGemini(attempt = 1) {
  const result = spawnSync(
    'bash',
    ['-c', `cat "${tmpFile}" | gemini -p "$MSP_FM_PROMPT"`],
    {
      encoding: 'utf8',
      maxBuffer: 500_000,
      timeout: 120_000,
    }
  );

  if (result.status !== 0 || !result.stdout) {
    const msg = (result.stderr || '') + (result.stdout || '');
    if (attempt < 4 && /429|quota|rate limit/i.test(msg)) {
      const delay = 30_000 * attempt;
      console.error(`[FM-RETRY] ${file} 429; waiting ${delay/1000}s (attempt ${attempt}/3)`);
      const end = Date.now() + delay;
      while (Date.now() < end) { /* spin */ }
      return callGemini(attempt + 1);
    }
    throw new Error(`gemini failed (exit=${result.status}): ${msg.slice(0, 400)}`);
  }
  return result.stdout;
}

let fm;
try {
  fm = await callGemini();
} catch (e) {
  console.error(`[FM-ERR] ${file}: ${e.message}`);
  process.exit(1);
}

const match = fm.match(/---\s*\r?\n[\s\S]*?\r?\n---/);
if (!match) {
  console.error(`[FM-ERR] ${file}: no frontmatter block in output:\n${fm.slice(0, 400)}`);
  process.exit(1);
}

const frontmatter = match[0].replace(/\r/g, '').trim() + '\n';

// Sanity check: id and type must be what we requested (anti-hallucination)
if (!frontmatter.includes(`id: "${idHint}"`) && !frontmatter.includes(`id: ${idHint}`)) {
  console.error(`[FM-ERR] ${file}: gemini returned wrong id (expected ${idHint}):\n${frontmatter.slice(0, 300)}`);
  process.exit(1);
}
if (!frontmatter.includes(`type: "${typeHint}"`) && !frontmatter.includes(`type: ${typeHint}`)) {
  console.error(`[FM-ERR] ${file}: gemini returned wrong type (expected ${typeHint}):\n${frontmatter.slice(0, 300)}`);
  process.exit(1);
}

const out = frontmatter + '\n' + raw.replace(/^\uFEFF/, '');
writeFileSync(file, out);

try { unlinkSync(tmpFile); } catch {}
console.log(`[FM] ${file} id=${idHint} type=${typeHint}`);
