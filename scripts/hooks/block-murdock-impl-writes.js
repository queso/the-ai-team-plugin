#!/usr/bin/env node
/**
 * block-murdock-impl-writes.js - PreToolUse hook for Murdock
 *
 * Blocks Murdock from writing or editing implementation files. Implementation
 * is B.A.'s responsibility. Murdock writes tests and type definitions ONLY.
 *
 * Allowed:
 *   - Test files: *.test.{ts,tsx,js,jsx}, *.spec.{ts,tsx,js,jsx}
 *   - Files inside __tests__/ directories
 *   - Files inside top-level tests/ directories
 *   - Type definition files: *.d.ts
 *   - Files inside /types/ directories
 *   - Vitest/Jest setup files: vitest.setup.*, jest.setup.*
 *   - Files in /tmp/ (throwaway scripts)
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

// Allow writes to /tmp/ (throwaway scripts, debugging artifacts)
if (filePath.startsWith('/tmp/') || filePath.startsWith('/var/')) {
  process.exit(0);
}

// Allow test files: *.test.{ts,tsx,js,jsx}, *.spec.{ts,tsx,js,jsx}
if (filePath.match(/\.(test|spec)\.(ts|js|tsx|jsx)$/)) {
  process.exit(0);
}

// Allow files inside __tests__/ directories
if (filePath.includes('/__tests__/')) {
  process.exit(0);
}

// Allow files inside top-level tests/ directories
if (filePath.match(/\/tests\//)) {
  process.exit(0);
}

// Allow type definition files: *.d.ts
if (filePath.match(/\.d\.ts$/)) {
  process.exit(0);
}

// Allow files inside /types/ directories
if (filePath.match(/\/types\//)) {
  process.exit(0);
}

// Allow vitest/jest setup files
if (filePath.match(/\/(vitest|jest)\.setup\.(ts|js|tsx|jsx)$/)) {
  process.exit(0);
}

// Block everything else — this is implementation territory
console.error(`BLOCKED: Murdock cannot write implementation files: ${filePath}`);
console.error('Implementation is B.A.\'s job. Murdock writes tests and type definitions ONLY.');
console.error('If you need a type, create a .d.ts file or place it in a /types/ directory.');
process.exit(2);
