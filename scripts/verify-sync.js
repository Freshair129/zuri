const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Zuri Doc-to-Code Sync Verifier
 * This script identifies modified code modules and checks if their 
 * corresponding specs in docs/product/specs/ have been updated.
 */

function getModifiedFiles() {
  try {
    // Check both staged and unstaged changes
    const diff = execSync('git diff HEAD --name-only', { encoding: 'utf8' });
    return diff.split('\n').filter(Boolean);
  } catch (error) {
    console.error('Error reading git diff:', error.message);
    return [];
  }
}

const SPEC_DIR = 'docs/product/specs';
const MODULE_DIR_PREFIX = 'src/modules/';

function verifySync() {
  const modifiedFiles = getModifiedFiles();
  if (modifiedFiles.length === 0) {
    console.log('✅ No changes detected in the workspace.');
    return;
  }

  const modifiedModules = new Set();
  const modifiedSpecs = new Set();

  modifiedFiles.forEach(file => {
    if (file.startsWith(MODULE_DIR_PREFIX)) {
      // Extract module name: src/modules/core/pos -> pos
      const parts = file.split('/');
      if (parts.length >= 4) {
        modifiedModules.add(parts[3].toUpperCase());
      }
    } else if (file.startsWith(SPEC_DIR)) {
      // Extract feature name: docs/product/specs/FEAT06-POS.md -> POS
      const basename = path.basename(file, '.md');
      const match = basename.match(/FEAT\d+-(.+)/);
      if (match) {
        modifiedSpecs.add(match[1].toUpperCase());
      }
    }
  });

  console.log('\n🔍 Zuri Sync Audit Report');
  console.log('========================');

  let driftFound = false;

  modifiedModules.forEach(module => {
    if (!modifiedSpecs.has(module)) {
      console.warn(`⚠️  DRIFT DETECTED: Module "${module}" was modified, but its spec in "${SPEC_DIR}" was not.`);
      driftFound = true;
    } else {
      console.log(`✅ SYNCED: Module "${module}" and its spec were both updated.`);
    }
  });

  if (!driftFound && modifiedModules.size > 0) {
    console.log('\n✨ All modified modules are in sync with their documentation.');
  } else if (modifiedModules.size === 0) {
    console.log('\nℹ️  No core modules were modified in this session.');
  }

  console.log('\nRemember: Documentation is the Source of Truth. Use "The Auditor" agent for a deep semantic audit.');
}

verifySync();
