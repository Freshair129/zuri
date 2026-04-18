#!/usr/bin/env node
// One-shot merger for ADR-057..061 collision pairs.
// Strategy:
//   Source A: "ADR-NNN--slug.md"  (stub, has frontmatter, placeholder body)
//   Source B: "ADR-NNN-slug.md"   (long, no frontmatter, full body)
//   Output: rewrite B with (frontmatter from A) + (full body of B); delete A.

import { readFileSync, writeFileSync, unlinkSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'gks/phase2_atomic';
const PAIRS = [
  'ADR-057-pos-mobile-ordering-architecture',
  'ADR-058-floor-plan-storage-model',
  'ADR-059-loyalty-point-idempotency',
  'ADR-060-modular-architecture',
  'ADR-061-split-prisma-schema',
];

for (const base of PAIRS) {
  const longPath = join(ROOT, `${base}.md`);
  const stubBase = base.replace(/^(ADR-\d{3})-/, '$1--');
  const stubPath = join(ROOT, `${stubBase}.md`);

  if (!existsSync(longPath)) { console.error(`missing: ${longPath}`); process.exit(1); }
  if (!existsSync(stubPath)) { console.error(`missing: ${stubPath}`); process.exit(1); }

  const stub = readFileSync(stubPath, 'utf8');
  const long = readFileSync(longPath, 'utf8');

  const fmMatch = stub.match(/^(---\s*\r?\n[\s\S]*?\r?\n---)/);
  if (!fmMatch) { console.error(`no frontmatter in stub: ${stubPath}`); process.exit(1); }
  const frontmatter = fmMatch[1].replace(/\r/g, '');

  // Long file should not have frontmatter — if it does, skip
  if (/^---\s*\r?\n/.test(long)) {
    console.error(`long already has frontmatter: ${longPath} — skipping`);
    continue;
  }

  const merged = frontmatter + '\n' + long.replace(/^\uFEFF/, '');
  writeFileSync(longPath, merged);
  unlinkSync(stubPath);
  console.log(`[MERGED] ${longPath} (kept); removed ${stubPath}`);
}
