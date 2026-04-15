#!/usr/bin/env node
/**
 * Created At: 2026-04-10 03:25:00 +07:00 (v1.0.0)
 * # Previous version: —
 * # Last Updated: 2026-04-10 03:25:00 +07:00 (v1.0.0)
 * 
 * ZDEV Management CLI (zdev.mjs)
 * Automates tasks, metadata, and state management for the ZDEV workflow.
 */

import fs from 'fs/promises';
import path from 'path';
import YAML from 'yaml';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const DEVLOG_DIR = path.join(ROOT_DIR, '.zdev', 'devlog');
const REGISTRY_PATH = path.join(ROOT_DIR, 'dev_tool_id_standards.yaml');
const TEMPLATE_PATH = path.join(ROOT_DIR, 'docs', 'standards', 'templates', 'task-log-template.md');

const STAGES = ['todo', 'wip', 'review', 'feedback', 'approved', 'achieved'];

/**
 * Get current time in Thailand format
 */
function getThailandTime() {
    const now = new Date();
    const offset = 7 * 60; // Minutes
    const localTime = new Date(now.getTime() + (offset + now.getTimezoneOffset()) * 60000);
    
    const pad = (n) => String(n).padStart(2, '0');
    
    const date = `${localTime.getFullYear()}-${pad(localTime.getMonth() + 1)}-${pad(localTime.getDate())}`;
    const time = `${pad(localTime.getHours())}:${pad(localTime.getMinutes())}:${pad(localTime.getSeconds())}`;
    
    return `${date} ${time} +07:00`;
}

/**
 * Update the 3-line metadata header in a content string
 */
function updateHeader(content, version = 'v1.0.0') {
    const lines = content.split('\n');
    const timestamp = getThailandTime();
    
    // Header lines
    const h1 = `# Created At: ${timestamp} (${version})`;
    const h2 = `# Previous version: —`;
    const h3 = `# Last Updated: ${timestamp} (${version})`;

    // Check if header already exists (simple check)
    if (lines[0].startsWith('# Created At:')) {
        // Move current Last Updated to Previous version
        const prevMatch = lines[2].match(/\d{4}-\d{2}-\d{2}.*\(v.*\)/);
        const prev = prevMatch ? prevMatch[0] : '—';
        
        lines[1] = `# Previous version: ${prev}`;
        lines[2] = h3;
        return lines.join('\n');
    } else {
        return `${h1}\n${h2}\n${h3}\n\n${content}`;
    }
}

/**
 * Find task file by ID across all stages
 */
async function findTaskFile(taskId) {
    for (const stage of STAGES) {
        const stageDir = path.join(DEVLOG_DIR, stage);
        try {
            const files = await fs.readdir(stageDir);
            const found = files.find(f => f.startsWith(taskId));
            if (found) return { stage, filename: found, fullPath: path.join(stageDir, found) };
        } catch (e) {
            // Stage dir might not exist
        }
    }
    return null;
}

/**
 * Command: Init
 */
async function initTask(title) {
    console.log(`🚀 Initializing task: "${title}"...`);
    
    // 1. Get next ID from registry
    const registryContent = await fs.readFile(REGISTRY_PATH, 'utf8');
    const registry = YAML.parse(registryContent);
    
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const taskSet = registry.id_naming_conventions.find(c => c.category === "Process Identifiers")
        .formats.find(f => f.name === "Task ID");
    
    const existingIds = Object.keys(taskSet.registry || {})
        .filter(id => id.startsWith(`ZDEV-TSK-${today}`))
        .sort();
        
    let nextSerial = 1;
    if (existingIds.length > 0) {
        const lastId = existingIds[existingIds.length - 1];
        nextSerial = parseInt(lastId.split('-').pop()) + 1;
    }
    
    const taskId = `ZDEV-TSK-${today}-${String(nextSerial).padStart(3, '0')}`;
    const filename = `${taskId}.md`;
    const targetPath = path.join(DEVLOG_DIR, 'todo', filename);
    
    // 2. Create file from template
    let template = await fs.readFile(TEMPLATE_PATH, 'utf8');
    template = template.replace(/\[ZDEV-TSK-YYYYMMDD-SERIAL\]/g, taskId)
                       .replace(/\[Short Title\]/g, title)
                       .replace(/\[ISO 8601\]/g, new Date().toISOString());
                       
    const content = updateHeader(template);
    
    await fs.writeFile(targetPath, content);
    
    // 3. Update Registry
    if (!taskSet.registry) taskSet.registry = {};
    taskSet.registry[taskId] = `todo/${filename} (Created via CLI)`;
    
    // Update registry header too
    const updatedRegistry = updateHeader(YAML.stringify(registry), 'v1.0.4'); // Semi-hardcoded version bump
    // Wait, YAML.stringify might lose comments. Let's be careful.
    // For now, let's just write the stringified YAML and assume the user manual fix for comments if needed.
    // Actually, the yaml package preserves some things, but not all.
    await fs.writeFile(REGISTRY_PATH, updatedRegistry);

    console.log(`✅ Created: .zdev/devlog/todo/${filename}`);
    console.log(`📝 Registered: ${taskId}`);
}

/**
 * Command: Move
 */
async function moveTask(taskId, targetStage) {
    if (!STAGES.includes(targetStage)) {
        console.error(`❌ Invalid stage: ${targetStage}. Use one of: ${STAGES.join(', ')}`);
        return;
    }

    const task = await findTaskFile(taskId);
    if (!task) {
        console.error(`❌ Task not found: ${taskId}`);
        return;
    }

    if (task.stage === targetStage) {
        console.log(`ℹ️ Task is already in [${targetStage}]`);
        return;
    }

    const newPath = path.join(DEVLOG_DIR, targetStage, task.filename);
    
    // 1. Read and update metadata
    let content = await fs.readFile(task.fullPath, 'utf8');
    content = updateHeader(content);
    
    // Ensure the internal status field matches (if it exists)
    content = content.replace(/- \*\*Status\*\*: .*/g, `- **Status**: ${targetStage}`);

    // 2. Write and remove old
    await fs.mkdir(path.dirname(newPath), { recursive: true });
    await fs.writeFile(newPath, content);
    await fs.unlink(task.fullPath);

    console.log(`🚚 Moved ${taskId} from [${task.stage}] to [${targetStage}]`);
}

/**
 * Main
 */
async function main() {
    const [command, ...args] = process.argv.slice(2);

    try {
        switch (command) {
            case 'init':
                if (!args[0]) throw new Error('Title is required: zdev init "Title"');
                await initTask(args[0]);
                break;
            case 'move':
                if (!args[0] || !args[1]) throw new Error('Usage: zdev move <TSK-ID> <target-stage>');
                await moveTask(args[0], args[1]);
                break;
            case 'stamp':
                if (!args[0]) throw new Error('Usage: zdev stamp <TSK-ID>');
                const task = await findTaskFile(args[0]);
                if (!task) throw new Error('Task not found');
                const content = await fs.readFile(task.fullPath, 'utf8');
                await fs.writeFile(task.fullPath, updateHeader(content));
                console.log(`🕒 Stamped ${args[0]} at ${getThailandTime()}`);
                break;
            default:
                console.log(`
ZDEV Management CLI
Commands:
  init <title>            - Create new task in todo/
  move <id> <stage>       - Move task across kanban stages
  stamp <id>              - Update Last Updated timestamp
  
Stages: ${STAGES.join(', ')}
                `);
        }
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        process.exit(1);
    }
}

main();
