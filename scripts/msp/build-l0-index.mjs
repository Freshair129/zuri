import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import YAML from 'yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../../');
const SOURCE_DIR = path.join(REPO_ROOT, 'gks', 'phase2_atomic');
const OUTPUT_DIR = path.join(REPO_ROOT, 'gks', '00_index');
const JSONL_FILE = path.join(OUTPUT_DIR, 'atomic_index.jsonl');
const META_FILE = path.join(OUTPUT_DIR, 'atomic_index.meta.json');

async function buildIndex() {
  try {
    try {
      await fs.access(SOURCE_DIR);
    } catch {
      throw new Error(`Source directory not found: ${SOURCE_DIR}`);
    }

    const files = await fs.readdir(SOURCE_DIR);
    const mdFiles = files.filter(f => f.toLowerCase().endsWith('.md'));

    const entries = [];
    const countByType = {};
    let totalBytes = 0;

    for (const fileName of mdFiles) {
      const filePath = path.join(SOURCE_DIR, fileName);
      const relativePath = path.posix.join('gks', 'phase2_atomic', fileName);

      let content;
      let fileStat;

      try {
        content = await fs.readFile(filePath, 'utf8');
        fileStat = await fs.stat(filePath);
      } catch (err) {
        console.error(`[READ ERROR] ${filePath}: ${err.message}`);
        process.exit(1);
      }

      const fmMatch = content.match(/^---\s*\r?\n([\s\S]*?)\r?\n---/);
      if (!fmMatch) continue;

      let data;
      try {
        data = YAML.parse(fmMatch[1]);
      } catch (err) {
        console.error(`[PARSE ERROR] ${filePath}: ${err.message}`);
        process.exit(1);
      }

      if (!data || typeof data !== 'object') continue;

      const id = data.id || path.parse(fileName).name;
      const type = data.type || 'other';

      const entry = {
        id,
        type,
        status: data.status,
        version: data.version,
        module: data.module,
        summary: data.summary ? String(data.summary).substring(0, 200) : undefined,
        tags: Array.isArray(data.tags) ? data.tags : undefined,
        depends_on: Array.isArray(data.depends_on)
          ? data.depends_on.map(link => String(link).replace(/\[\[|\]\]/g, ''))
          : undefined,
        file: relativePath,
        updated_at: fileStat.mtime.toISOString(),
        size_bytes: fileStat.size,
      };

      const cleanEntry = {};
      const fields = ['id', 'type', 'status', 'version', 'module', 'summary', 'tags', 'depends_on', 'file', 'updated_at', 'size_bytes'];
      for (const field of fields) {
        if (entry[field] !== undefined) {
          cleanEntry[field] = entry[field];
        }
      }

      entries.push(cleanEntry);
      countByType[type] = (countByType[type] || 0) + 1;
      totalBytes += fileStat.size;
    }

    entries.sort((a, b) => String(a.id).localeCompare(String(b.id)));

    await fs.mkdir(OUTPUT_DIR, { recursive: true });

    const jsonl = entries.map(e => JSON.stringify(e)).join('\n') + (entries.length > 0 ? '\n' : '');
    await fs.writeFile(JSONL_FILE, jsonl);

    const meta = {
      generated_at: new Date().toISOString(),
      count_by_type: countByType,
      total_files: entries.length,
      total_bytes: totalBytes,
      duplicates: [],
      version: '1.0.0'
    };
    await fs.writeFile(META_FILE, JSON.stringify(meta, null, 2));

    const typeParts = Object.entries(countByType).map(([t, c]) => `${t}: ${c}`);
    process.stdout.write(`[L0-INDEX] wrote ${entries.length} entries, types: {${typeParts.join(', ')}}\n`);

    process.exit(0);
  } catch (err) {
    console.error(`[FATAL ERROR] ${err.message}`);
    process.exit(1);
  }
}

buildIndex();
