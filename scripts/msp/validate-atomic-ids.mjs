import { readdir, readFile, writeFile, access } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '../..');
const ATOMIC_DIR = join(ROOT, 'gks/phase2_atomic');
const INDEX_DIR = join(ROOT, 'gks/00_index');
const REPORT_PATH = join(INDEX_DIR, 'atomic_validation_report.json');
const META_PATH = join(INDEX_DIR, 'atomic_index.meta.json');

async function validate() {
  let files = [];
  try {
    const allFiles = await readdir(ATOMIC_DIR);
    files = allFiles.filter(f => f.endsWith('.md'));
  } catch (err) {
    console.error(`Error reading directory ${ATOMIC_DIR}: ${err.message}`);
    process.exit(1);
  }

  const results = {
    errors: [],
    warnings: [],
    scanned: 0
  };

  const idMap = new Map();
  const normMap = new Map();
  const fileData = [];

  for (const filename of files) {
    results.scanned++;
    const filePath = join(ATOMIC_DIR, filename);
    const content = await readFile(filePath, 'utf8');
    const relativePath = `gks/phase2_atomic/${filename}`;

    const normalized = filename.replace(/\.md$/, '').toLowerCase().replace(/-+$/, '').replace(/--+/g, '-');
    if (!normMap.has(normalized)) normMap.set(normalized, []);
    normMap.get(normalized).push(relativePath);

    const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!fmMatch) {
      results.errors.push({ type: 'NO_FRONTMATTER', file: relativePath });
      continue;
    }

    let data;
    try {
      data = YAML.parse(fmMatch[1]);
    } catch (e) {
      results.errors.push({ type: 'MALFORMED_YAML', file: relativePath, detail: e.message });
      continue;
    }

    if (!data || typeof data !== 'object') {
      results.errors.push({ type: 'NO_FRONTMATTER', file: relativePath });
      continue;
    }

    const { id, type } = data;

    if (!id) {
      results.errors.push({ type: 'MISSING_ID', file: relativePath });
    } else {
      if (!idMap.has(id)) idMap.set(id, []);
      idMap.get(id).push(relativePath);

      if (!filename.toLowerCase().includes(String(id).toLowerCase())) {
        results.warnings.push({
          type: 'ID_FILENAME_MISMATCH',
          file: relativePath,
          detail: `id='${id}' not in filename`
        });
      }
    }

    if (!type) {
      results.warnings.push({ type: 'MISSING_TYPE', file: relativePath });
    }

    fileData.push({ file: relativePath, id, type });
  }

  for (const [id, paths] of idMap.entries()) {
    if (paths.length > 1) {
      results.errors.push({ type: 'DUPLICATE_ID', id, files: paths });
    }
  }

  for (const [norm, paths] of normMap.entries()) {
    if (paths.length > 1) {
      results.errors.push({ type: 'FILENAME_COLLISION', normalized: norm, files: paths });
    }
  }

  console.log('=== ATOMIC VALIDATION REPORT ===');
  console.log(`Files scanned: ${results.scanned}`);
  console.log(`Errors: ${results.errors.length}`);
  console.log(`Warnings: ${results.warnings.length}\n`);

  for (const err of results.errors) {
    if (err.type === 'DUPLICATE_ID') {
      console.log(`[ERROR] DUPLICATE_ID '${err.id}' in:\n  - ${err.files.join('\n  - ')}`);
    } else if (err.type === 'FILENAME_COLLISION') {
      console.log(`[ERROR] FILENAME_COLLISION (norm='${err.normalized}') in:\n  - ${err.files.join('\n  - ')}`);
    } else {
      console.log(`[ERROR] ${err.type} in ${err.file}${err.detail ? `: ${err.detail}` : ''}`);
    }
  }

  for (const warn of results.warnings) {
    console.log(`[WARN] ${warn.type}: ${warn.detail || ''} file='${warn.file}'`);
  }

  const status = results.errors.length > 0 ? 'FAIL' : (results.warnings.length > 0 ? 'PASS WITH WARNINGS' : 'PASS');
  console.log('\n=== SUMMARY ===');
  console.log(`Status: ${status}`);

  const jsonReport = {
    timestamp: new Date().toISOString(),
    scanned: results.scanned,
    status,
    errors: results.errors,
    warnings: results.warnings
  };
  await writeFile(REPORT_PATH, JSON.stringify(jsonReport, null, 2));

  try {
    await access(META_PATH);
    const metaRaw = await readFile(META_PATH, 'utf8');
    const meta = JSON.parse(metaRaw);

    const duplicateIds = results.errors
      .filter(e => e.type === 'DUPLICATE_ID')
      .map(e => e.id);

    meta.duplicates = Array.from(new Set([...(meta.duplicates || []), ...duplicateIds]));
    meta.last_validation = new Date().toISOString();

    await writeFile(META_PATH, JSON.stringify(meta, null, 2));
  } catch (e) {
    // meta.json missing — skip update silently
  }

  process.exit(results.errors.length > 0 ? 1 : 0);
}

validate().catch(err => {
  console.error(err);
  process.exit(1);
});
