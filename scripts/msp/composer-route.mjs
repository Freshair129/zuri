#!/usr/bin/env node
// composer-route.mjs
// Deterministically joins Phase 3.5 micro-task outputs into the final route file.
// NO SLM involved here — pure string transforms.
//
// Usage:
//   node scripts/msp/composer-route.mjs <FEAT-id>
//
// Behavior:
//   1. Reads gks/phase3.5_microtasks/<FEAT>/manifest.yaml
//   2. Reads each T*.out.js from _outputs/
//   3. Extracts named exports per manifest
//   4. Joins in the declared layout
//   5. Writes to <target_file>.generated.js
//   6. Runs ESLint on the generated file
//   7. If OK, copies to <target_file> (final location)

import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import YAML from 'yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '../..');

const feature = process.argv[2];
if (!feature) {
  console.error('Usage: composer-route.mjs <FEAT-id>');
  process.exit(2);
}

const manifestPath = join(ROOT, 'gks/phase3.5_microtasks', feature, 'manifest.yaml');
const manifest = YAML.parse(readFileSync(manifestPath, 'utf8'));

// ─────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────
function stripExportKeyword(code) {
  // "export function foo" -> "function foo"
  // "export const foo = ..." -> "const foo = ..."
  // "export async function foo" -> "async function foo"
  return code
    .replace(/^\s*export\s+(async\s+)?function\b/gm, (_, a) => (a || '') + 'function')
    .replace(/^\s*export\s+const\b/gm, 'const')
    .replace(/^\s*export\s+let\b/gm, 'let');
}

function loadTaskOutput(taskId) {
  const taskPath = join(ROOT, 'gks/phase3.5_microtasks', feature, `${taskId}.task.yaml`);
  const task = YAML.parse(readFileSync(taskPath, 'utf8'));
  const outPath = join(ROOT, task.output.file);
  if (!existsSync(outPath)) {
    throw new Error(`Missing output: ${outPath} (run runner first)`);
  }
  return {
    task,
    code: readFileSync(outPath, 'utf8'),
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Compose
// ─────────────────────────────────────────────────────────────────────────
function compose() {
  const bySlot = { helpers: [], handler: [], exports: [] };

  for (const taskId of manifest.compose.order) {
    const { task, code } = loadTaskOutput(taskId);
    const slot = task.composer_slot;
    if (!bySlot[slot]) {
      throw new Error(`Unknown composer_slot '${slot}' for ${taskId}`);
    }
    // For helpers, strip 'export' (they become internal); handler keeps export
    // (but we rename to non-exported anyway since compose layout defines exports).
    // exports slot: keep verbatim.
    const processed = slot === 'exports' ? code : stripExportKeyword(code);
    bySlot[slot].push({ taskId, code: processed.trim() });
  }

  const parts = [];
  parts.push(manifest.compose.header?.trim());
  parts.push('');
  parts.push(...(manifest.compose.imports || []));
  parts.push('');
  if (bySlot.helpers.length > 0) {
    parts.push('// ─── helpers ───────────────────────────────────────────────────────────');
    for (const { code } of bySlot.helpers) {
      parts.push(code);
      parts.push('');
    }
  }
  if (bySlot.handler.length > 0) {
    parts.push('// ─── handler ───────────────────────────────────────────────────────────');
    for (const { code } of bySlot.handler) {
      parts.push(code);
      parts.push('');
    }
  }
  if (bySlot.exports.length > 0) {
    parts.push('// ─── route exports ─────────────────────────────────────────────────────');
    for (const { code } of bySlot.exports) {
      parts.push(code);
    }
  }

  return parts.join('\n').replace(/\n{3,}/g, '\n\n') + '\n';
}

// ─────────────────────────────────────────────────────────────────────────
// ESLint gate
// ─────────────────────────────────────────────────────────────────────────
function runEslint(filePath) {
  const res = spawnSync('npx', ['--no-install', 'eslint', '--no-eslintrc', '--parser-options=ecmaVersion:2022,sourceType:module', '--rule', '{}', filePath], {
    cwd: ROOT,
    encoding: 'utf8',
    shell: true,
  });
  // We use --no-eslintrc --rule {} so this just checks syntax parse, not style.
  return { ok: res.status === 0, stdout: res.stdout, stderr: res.stderr };
}

// ─────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────
function main() {
  console.log(`=== Composer: ${feature} ===`);
  console.log(`Target: ${manifest.target_file}`);

  const composed = compose();

  const genPath = join(ROOT, manifest.target_file + '.generated.js');
  mkdirSync(dirname(genPath), { recursive: true });
  writeFileSync(genPath, composed);
  console.log(`Wrote: ${manifest.target_file}.generated.js (${composed.length} bytes)`);

  const lint = runEslint(genPath);
  if (!lint.ok) {
    console.error('✗ Syntax check FAILED:');
    console.error(lint.stdout || lint.stderr);
    console.error(`\nGenerated file kept at: ${genPath}`);
    console.error(`NOT promoted to ${manifest.target_file}`);
    process.exit(1);
  }
  console.log('✓ Syntax check passed');

  const finalPath = join(ROOT, manifest.target_file);
  mkdirSync(dirname(finalPath), { recursive: true });
  copyFileSync(genPath, finalPath);
  console.log(`✓ Promoted to: ${manifest.target_file}`);

  console.log('\nDone.');
}

main();
