#!/usr/bin/env node
// runner-microtask.mjs
// Executes one or all Phase 3.5 micro-tasks via Ollama local SLM.
//
// Usage:
//   node scripts/msp/runner-microtask.mjs <feature-id>              # run all tasks
//   node scripts/msp/runner-microtask.mjs <feature-id> <task-id>    # run one
//
// Example:
//   node scripts/msp/runner-microtask.mjs FEAT-006
//   node scripts/msp/runner-microtask.mjs FEAT-006 T2_error-mapper

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '../..');

const OLLAMA_URL = 'http://localhost:11434/api/generate';
const CONTRACT_PATH = join(ROOT, '.brain/msp/LLM_Contract/codegen_microtask_contract.yaml');

const feature = process.argv[2];
const specificTask = process.argv[3];

if (!feature) {
  console.error('Usage: runner-microtask.mjs <FEAT-id> [task-id]');
  process.exit(2);
}

const FEATURE_DIR = join(ROOT, 'gks/phase3.5_microtasks', feature);
if (!existsSync(FEATURE_DIR)) {
  console.error(`Feature dir not found: ${FEATURE_DIR}`);
  process.exit(2);
}

// ─────────────────────────────────────────────────────────────────────────
// Load contract
// ─────────────────────────────────────────────────────────────────────────
const contract = YAML.parse(readFileSync(CONTRACT_PATH, 'utf8'));

// ─────────────────────────────────────────────────────────────────────────
// Post-processing: strip markdown fences, leading/trailing commentary
// ─────────────────────────────────────────────────────────────────────────
function postProcess(raw) {
  let s = raw.replace(/\r\n/g, '\n');
  // Strip triple-backtick fences
  s = s.replace(/```(?:javascript|js|typescript|ts)?\s*\n?/g, '');
  s = s.replace(/\n?```\s*$/g, '');
  // Strip leading lines that are not code
  const lines = s.split('\n');
  const start = lines.findIndex(l =>
    /^(export|import|const|let|var|async|function|class)\b/.test(l.trim())
  );
  if (start > 0) lines.splice(0, start);
  // Drop trailing pure-whitespace/commentary after last })
  return lines.join('\n').trim() + '\n';
}

// ─────────────────────────────────────────────────────────────────────────
// Forbidden-pattern checks
// ─────────────────────────────────────────────────────────────────────────
function checkForbiddenPatterns(code, taskMeta) {
  const violations = [];
  const slot = taskMeta.composer_slot;
  for (const rule of contract.contract?.always_forbidden_patterns || contract.always_forbidden_patterns || []) {
    const re = new RegExp(rule.pattern);
    if (re.test(code)) {
      if (rule.applies_to && !rule.applies_to.includes(taskMeta.task_id) && !rule.applies_to.includes(`any task with composer_slot=${slot}`)) {
        continue;
      }
      violations.push({ severity: rule.severity, pattern: rule.pattern, reason: rule.reason });
    }
  }
  return violations;
}

function checkForbiddenImports(code) {
  const violations = [];
  const pkgPath = join(ROOT, 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  const deps = new Set([
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ]);
  const importRe = /(?:^|\n)\s*import\s+.*?from\s+['"]([^'"]+)['"]/g;
  let m;
  while ((m = importRe.exec(code)) !== null) {
    const mod = m[1];
    const always = contract.always_forbidden_imports || [];
    if (always.includes(mod) || (mod.startsWith('../') && always.some(x => x === '../'))) {
      violations.push({ severity: 'error', import: mod, reason: `always_forbidden_import: ${mod}` });
    }
    const conditional = contract.forbidden_imports_if_not_in_package_json || [];
    if (conditional.includes(mod) && !deps.has(mod)) {
      violations.push({ severity: 'error', import: mod, reason: `forbidden (not in package.json): ${mod}` });
    }
  }
  return violations;
}

// ─────────────────────────────────────────────────────────────────────────
// Required-pattern checks
// ─────────────────────────────────────────────────────────────────────────
function checkRequiredPatterns(code, taskMeta) {
  const violations = [];
  const slot = taskMeta.composer_slot;
  for (const rule of contract.required_patterns || []) {
    if (rule.slot !== slot) continue;
    if (rule.must_contain && !code.includes(rule.must_contain)) {
      violations.push({ severity: 'error', missing: rule.must_contain, reason: rule.reason });
    }
    if (rule.must_contain_one_of) {
      const hit = rule.must_contain_one_of.some(p => new RegExp(p).test(code));
      if (!hit) {
        violations.push({ severity: 'error', missing_any: rule.must_contain_one_of, reason: rule.reason });
      }
    }
    if (rule.must_start_with_one_of) {
      const trimmed = code.trim();
      const hit = rule.must_start_with_one_of.some(p => trimmed.startsWith(p));
      if (!hit) {
        violations.push({ severity: 'error', must_start_with: rule.must_start_with_one_of, reason: rule.reason });
      }
    }
  }
  return violations;
}

// ─────────────────────────────────────────────────────────────────────────
// Acceptance tests
// ─────────────────────────────────────────────────────────────────────────
async function runAcceptanceTests(code, tests, taskMeta) {
  const results = [];
  const exportName = (taskMeta.output?.exports || [{}])[0]?.name;

  for (const t of tests) {
    if (t.type === 'syntax_only') {
      // just check code exists + the declared rule
      const pass = t.rule ? new RegExp(t.rule.replace(/[.*+?^${}()|[\]\\]/g, s => s)).test(code) || code.includes(t.rule) : true;
      results.push({ test: t, pass, reason: pass ? 'matched' : `missing: ${t.rule}` });
      continue;
    }
    if (t.type === 'contains') {
      const pass = code.includes(t.rule);
      results.push({ test: t, pass, reason: pass ? 'contains' : `missing: ${t.rule}` });
      continue;
    }
    if (t.type === 'not_contains') {
      const pass = !code.includes(t.rule);
      results.push({ test: t, pass, reason: pass ? 'absent' : `should not contain: ${t.rule}` });
      continue;
    }
    if (t.type === 'exact_match_trimmed') {
      const pass = code.trim() === t.expect.trim();
      results.push({ test: t, pass, reason: pass ? 'exact' : `got:\n${code.trim()}\n---\nexpected:\n${t.expect.trim()}` });
      continue;
    }
    // Default: input/expect — dynamic import + call
    if (t.input !== undefined && t.expect !== undefined) {
      try {
        const tmpFile = join(ROOT, `gks/phase3.5_microtasks/${feature}/_outputs/.tmp-${taskMeta.task_id}.mjs`);
        mkdirSync(dirname(tmpFile), { recursive: true });
        writeFileSync(tmpFile, code);
        const mod = await import('file://' + tmpFile.replace(/\\/g, '/') + '?t=' + Date.now());
        const fn = mod[exportName];
        if (typeof fn !== 'function') {
          results.push({ test: t, pass: false, reason: `export ${exportName} is not a function` });
          continue;
        }
        const inputVal = typeof t.input === 'string' ? JSON.parse(t.input === 'null' ? 'null' : t.input) : t.input;
        const got = fn(inputVal);
        const exp = typeof t.expect === 'string' ? JSON.parse(t.expect) : t.expect;
        const pass = JSON.stringify(got) === JSON.stringify(exp);
        results.push({
          test: t,
          pass,
          reason: pass ? 'equal' : `got ${JSON.stringify(got)} expected ${JSON.stringify(exp)}`,
        });
      } catch (e) {
        results.push({ test: t, pass: false, reason: `runtime: ${e.message}` });
      }
    }
  }
  return results;
}

// ─────────────────────────────────────────────────────────────────────────
// Ollama call
// ─────────────────────────────────────────────────────────────────────────
async function callOllama(prompt, runner) {
  const body = {
    model: runner.model,
    prompt,
    stream: false,
    options: {
      temperature: runner.temperature ?? 0.0,
      num_ctx: runner.num_ctx ?? 4096,
    },
  };
  const started = Date.now();
  const res = await fetch(OLLAMA_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Ollama HTTP ${res.status}`);
  const j = await res.json();
  return {
    text: j.response,
    elapsedMs: Date.now() - started,
    tokens: j.eval_count,
    tokPerSec: j.eval_count / (j.eval_duration / 1e9),
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Main per-task executor
// ─────────────────────────────────────────────────────────────────────────
async function runTask(taskPath) {
  const taskMeta = YAML.parse(readFileSync(taskPath, 'utf8'));
  const { task_id, runner, prompt, acceptance_tests } = taskMeta;

  console.log(`\n▶ ${task_id}`);
  console.log(`  concern: ${taskMeta.concern}`);

  let basePrompt = prompt.template;
  for (const [k, v] of Object.entries(prompt.inputs || {})) {
    basePrompt = basePrompt.replaceAll(`{${k}}`, String(v));
  }

  let code = null;
  let metrics = null;
  let attempts = 0;
  const maxRetries = runner.max_retries ?? 3;
  let failureReason = null;
  let lastOutput = null;

  while (attempts <= maxRetries) {
    attempts++;
    const promptForThisAttempt =
      attempts === 1
        ? basePrompt
        : basePrompt +
          '\n\n---\nYour previous attempt failed:\n' +
          failureReason +
          '\n\nPrevious output:\n' +
          lastOutput +
          '\n\nRetry. Follow the rules EXACTLY.';

    process.stdout.write(`  attempt ${attempts}/${maxRetries + 1}... `);
    try {
      const out = await callOllama(promptForThisAttempt, runner);
      metrics = out;
      lastOutput = out.text;
      const processed = postProcess(out.text);
      code = processed;

      const fp = checkForbiddenPatterns(processed, taskMeta);
      const fi = checkForbiddenImports(processed);
      const rp = checkRequiredPatterns(processed, taskMeta);
      const structural = [...fp, ...fi, ...rp].filter(v => v.severity === 'error');

      if (structural.length > 0) {
        failureReason = `Structural violations:\n${structural.map(v => `- ${v.reason || JSON.stringify(v)}`).join('\n')}`;
        console.log(`FAIL (structural: ${structural.length})`);
        continue;
      }

      const testResults = await runAcceptanceTests(processed, acceptance_tests, taskMeta);
      const failed = testResults.filter(r => !r.pass);
      if (failed.length > 0) {
        failureReason = `Acceptance tests failed:\n${failed.map(f => `- ${f.reason}`).join('\n')}`;
        console.log(`FAIL (${failed.length}/${testResults.length} tests)`);
        continue;
      }

      console.log(`PASS (${out.tokens} tok, ${out.tokPerSec.toFixed(1)} tok/s, ${(out.elapsedMs / 1000).toFixed(1)}s)`);
      break;
    } catch (e) {
      failureReason = `Exception: ${e.message}`;
      console.log(`ERROR: ${e.message}`);
    }
  }

  if (attempts > maxRetries + 1 || !code || failureReason) {
    if (code) {
      // Even failed, write output for inspection
      const outPath = join(ROOT, taskMeta.output.file);
      mkdirSync(dirname(outPath), { recursive: true });
      writeFileSync(outPath.replace(/\.js$/, '.FAILED.js'), code);
    }
    return { task_id, ok: false, attempts, reason: failureReason, metrics };
  }

  // Write output
  const outPath = join(ROOT, taskMeta.output.file);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, code);
  return { task_id, ok: true, attempts, outPath, metrics };
}

// ─────────────────────────────────────────────────────────────────────────
// Orchestration
// ─────────────────────────────────────────────────────────────────────────
async function main() {
  const taskFiles = readdirSync(FEATURE_DIR)
    .filter(f => f.endsWith('.task.yaml'))
    .sort();

  const toRun = specificTask ? taskFiles.filter(f => f.startsWith(specificTask)) : taskFiles;

  if (toRun.length === 0) {
    console.error(`No tasks matched.`);
    process.exit(2);
  }

  console.log(`=== Micro-task Runner ===`);
  console.log(`Feature: ${feature}`);
  console.log(`Tasks to run: ${toRun.length}`);

  const summary = [];
  for (const f of toRun) {
    const r = await runTask(join(FEATURE_DIR, f));
    summary.push(r);
  }

  console.log(`\n=== SUMMARY ===`);
  const ok = summary.filter(s => s.ok).length;
  console.log(`Passed: ${ok}/${summary.length}`);
  for (const s of summary) {
    const m = s.metrics;
    const t = m ? ` (${m.tokens}t @ ${m.tokPerSec?.toFixed(1)}t/s)` : '';
    console.log(`  ${s.ok ? '✓' : '✗'} ${s.task_id}  attempts=${s.attempts}${t}`);
    if (!s.ok) console.log(`     ${s.reason?.split('\n').join('\n     ')}`);
  }

  process.exit(ok === summary.length ? 0 : 1);
}

main().catch(e => {
  console.error('FATAL:', e);
  process.exit(1);
});
