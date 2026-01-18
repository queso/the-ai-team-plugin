#!/usr/bin/env node
/**
 * block-hannibal-writes.js - PreToolUse hook for Hannibal
 *
 * Blocks Write/Edit operations to src/** and test files.
 * This hook is scoped to Hannibal's context only (via frontmatter).
 * Subagents like B.A. and Murdock are not affected.
 */

const input = JSON.parse(process.env.TOOL_INPUT || '{}');
const filePath = input.file_path || '';

// Block writes to src/ directory
if (filePath.includes('/src/')) {
  console.error(`BLOCKED: Hannibal cannot write to ${filePath}`);
  console.error('Implementation code must be delegated to B.A.');
  process.exit(2);
}

// Block writes to test files
if (filePath.match(/\.(test|spec)\.(ts|js|tsx|jsx)$/)) {
  console.error(`BLOCKED: Hannibal cannot write to ${filePath}`);
  console.error('Test files must be delegated to Murdock.');
  process.exit(2);
}

// Allow other writes (mission/, etc.)
process.exit(0);
