#!/usr/bin/env node
/**
 * block-amy-test-writes.js - PreToolUse hook for Amy
 *
 * Blocks Write/Edit operations to test files.
 * Amy investigates and reports - she does NOT write test suites.
 * Her findings go in the agent_stop summary, not file artifacts.
 *
 * Claude Code sends hook context via stdin JSON (tool_name, tool_input).
 */

import { readFileSync } from 'fs';

let hookInput = {};
try {
  const raw = readFileSync(0, 'utf8');
  hookInput = JSON.parse(raw);
} catch {
  // Can't read stdin, allow through
  process.exit(0);
}

const toolInput = hookInput.tool_input || {};
const filePath = toolInput.file_path || '';

// Block writes to test/spec files
if (filePath.match(/\.(test|spec)\.(ts|js|tsx|jsx)$/)) {
  console.error(`BLOCKED: Amy cannot write to ${filePath}`);
  console.error('Test files are Murdock\'s responsibility.');
  console.error('Document your findings in the agent_stop summary instead.');
  process.exit(2);
}

// Block writes to raptor files specifically
if (filePath.match(/raptor/i)) {
  console.error(`BLOCKED: Amy cannot write raptor files: ${filePath}`);
  console.error('Document your investigation in the agent_stop summary instead.');
  process.exit(2);
}

// Allow other writes (throwaway debug scripts, temp investigation files)
process.exit(0);
