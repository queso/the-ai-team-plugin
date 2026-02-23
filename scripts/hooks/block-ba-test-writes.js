#!/usr/bin/env node
/**
 * block-ba-test-writes.js - PreToolUse hook for B.A.
 *
 * Blocks B.A. from writing or editing test files. Tests are Murdock's
 * responsibility. B.A. implements code to pass existing tests — he does
 * NOT modify the tests to pass his code.
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

if (!filePath) {
  process.exit(0);
}

// Block writes to test/spec files
if (filePath.match(/\.(test|spec)\.(ts|js|tsx|jsx)$/)) {
  console.error(`BLOCKED: B.A. cannot modify test files: ${filePath}`);
  console.error('Tests are Murdock\'s responsibility. Implement code that passes the existing tests.');
  console.error('If a test is genuinely broken, message Hannibal to have Murdock fix it.');
  process.exit(2);
}

// Allow vitest.setup.ts, jest.setup.ts etc. — these are infrastructure, not tests
// Allow all other writes
process.exit(0);
