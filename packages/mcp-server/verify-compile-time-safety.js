#!/usr/bin/env node

/**
 * Compile-time safety verification script
 *
 * This script intentionally breaks shared types and verifies that TypeScript
 * catches the errors in consumer packages.
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const REPO_ROOT = '/Users/josh/Code/The-Ai-team';
const SHARED_PKG = join(REPO_ROOT, 'packages/shared');
const MCP_SERVER = join(REPO_ROOT, 'packages/mcp-server');
const KANBAN_VIEWER = join(REPO_ROOT, 'packages/kanban-viewer');

const STAGES_FILE = join(SHARED_PKG, 'src/stages.ts');
const AGENTS_FILE = join(SHARED_PKG, 'src/agents.ts');
const ITEMS_FILE = join(SHARED_PKG, 'src/items.ts');

const results = {
  baseline: { passed: false, errors: [] },
  test1: { passed: false, errors: [] },
  test2: { passed: false, errors: [] },
  test3: { passed: false, errors: [] },
  cleanup: { passed: false, errors: [] },
};

function runTypeCheck(pkg) {
  try {
    execSync('npx tsc --noEmit', {
      cwd: pkg,
      stdio: 'pipe',
      encoding: 'utf-8',
    });
    return { success: true, output: '' };
  } catch (error) {
    return {
      success: false,
      output: error.stdout + error.stderr,
    };
  }
}

function rebuildShared() {
  try {
    execSync('npx tsc', {
      cwd: SHARED_PKG,
      stdio: 'pipe',
    });
    return true;
  } catch (error) {
    console.error('Failed to rebuild shared package:', error.message);
    return false;
  }
}

// Test 1: Add a new stage without updating TRANSITION_MATRIX
console.log('\n=== Test 1: Add new stage to ALL_STAGES without updating TRANSITION_MATRIX ===');
const stagesOriginal = readFileSync(STAGES_FILE, 'utf-8');
const stagesModified = stagesOriginal.replace(
  "export const ALL_STAGES = [\n  'briefings',",
  "export const ALL_STAGES = [\n  'planning',\n  'briefings',"
);
writeFileSync(STAGES_FILE, stagesModified);

if (!rebuildShared()) {
  console.error('Failed to rebuild shared package after modification');
  process.exit(1);
}

const test1McpResult = runTypeCheck(MCP_SERVER);
console.log('MCP Server type check:', test1McpResult.success ? 'PASSED' : 'FAILED');
if (!test1McpResult.success) {
  console.log('Errors detected:', test1McpResult.output.split('\n').slice(0, 5).join('\n'));
  results.test1.errors.push('MCP: ' + test1McpResult.output);
}
results.test1.passed = !test1McpResult.success;

// Revert
writeFileSync(STAGES_FILE, stagesOriginal);
rebuildShared();

// Test 2: Remove an agent from VALID_AGENTS
console.log('\n=== Test 2: Remove agent from VALID_AGENTS ===');
const agentsOriginal = readFileSync(AGENTS_FILE, 'utf-8');
const agentsModified = agentsOriginal.replace(
  "  'murdock',\n",
  ""
);
writeFileSync(AGENTS_FILE, agentsModified);

if (!rebuildShared()) {
  console.error('Failed to rebuild shared package after modification');
  process.exit(1);
}

const test2McpResult = runTypeCheck(MCP_SERVER);
console.log('MCP Server type check:', test2McpResult.success ? 'PASSED' : 'FAILED');
if (!test2McpResult.success) {
  console.log('Errors detected:', test2McpResult.output.split('\n').slice(0, 5).join('\n'));
  results.test2.errors.push('MCP: ' + test2McpResult.output);
}
results.test2.passed = !test2McpResult.success;

// Revert
writeFileSync(AGENTS_FILE, agentsOriginal);
rebuildShared();

// Test 3: Add a new item type
console.log('\n=== Test 3: Add new item type to ITEM_TYPES ===');
const itemsOriginal = readFileSync(ITEMS_FILE, 'utf-8');
const itemsModified = itemsOriginal.replace(
  "export const ITEM_TYPES = ['feature', 'bug', 'task', 'enhancement'] as const;",
  "export const ITEM_TYPES = ['feature', 'bug', 'task', 'enhancement', 'spike'] as const;"
);
writeFileSync(ITEMS_FILE, itemsModified);

if (!rebuildShared()) {
  console.error('Failed to rebuild shared package after modification');
  process.exit(1);
}

const test3McpResult = runTypeCheck(MCP_SERVER);
console.log('MCP Server type check:', test3McpResult.success ? 'PASSED' : 'FAILED');
if (!test3McpResult.success) {
  console.log('Errors detected:', test3McpResult.output.split('\n').slice(0, 5).join('\n'));
  results.test3.errors.push('MCP: ' + test3McpResult.output);
}

// Revert
writeFileSync(ITEMS_FILE, itemsOriginal);
rebuildShared();

// Final baseline check
console.log('\n=== Cleanup Verification ===');
const cleanupResult = runTypeCheck(MCP_SERVER);
console.log('MCP Server type check:', cleanupResult.success ? 'PASSED' : 'FAILED');
results.cleanup.passed = cleanupResult.success;

console.log('\n=== SUMMARY ===');
console.log('Test 1 (new stage breaks TRANSITION_MATRIX):', results.test1.passed ? 'PASS' : 'FAIL');
console.log('Test 2 (removed agent breaks consumers):', results.test2.passed ? 'PASS' : 'FAIL');
console.log('Test 3 (new item type):', results.test3.passed ? 'PASS (optional)' : 'No exhaustive checks found');
console.log('Cleanup (all clean):', results.cleanup.passed ? 'PASS' : 'FAIL');

process.exit(results.cleanup.passed ? 0 : 1);
