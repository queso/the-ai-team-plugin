#!/usr/bin/env node
/**
 * block-amy-writes.js - PreToolUse hook for Amy
 *
 * Blocks Write/Edit operations to project source code.
 * Amy investigates and reports - she does NOT modify production code or tests.
 * Her findings go in the agent_stop summary, not file artifacts.
 *
 * Allowed: writes to /tmp/, throwaway debug scripts outside the project.
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

// Allow writes to /tmp/ (throwaway debug scripts, investigation artifacts)
if (filePath.startsWith('/tmp/') || filePath.startsWith('/var/')) {
  process.exit(0);
}

// Block writes to test/spec files
if (filePath.match(/\.(test|spec)\.(ts|js|tsx|jsx)$/)) {
  console.error(`BLOCKED: Amy cannot write to ${filePath}`);
  console.error('Test files are Murdock\'s responsibility.');
  console.error('Document your findings in the agent_stop summary instead.');
  process.exit(2);
}

// Block writes to raptor files
if (filePath.match(/raptor/i)) {
  console.error(`BLOCKED: Amy cannot write raptor files: ${filePath}`);
  console.error('Document your investigation in the agent_stop summary instead.');
  process.exit(2);
}

// Block writes to project source code (src/, app/, lib/, components/, etc.)
if (filePath.match(/\/(src|app|lib|components|pages|utils|services|hooks|styles|public)\//)) {
  console.error(`BLOCKED: Amy cannot modify project source code: ${filePath}`);
  console.error('Amy investigates and reports. She does NOT fix bugs or modify code.');
  console.error('Document your findings in the agent_stop summary instead.');
  process.exit(2);
}

// Block writes to config files that affect the project
if (filePath.match(/\/(package\.json|tsconfig.*|biome\.json|vitest\.config|next\.config|prisma\/schema)/)) {
  console.error(`BLOCKED: Amy cannot modify project config: ${filePath}`);
  console.error('Report config issues in the agent_stop summary instead.');
  process.exit(2);
}

// Allow other writes (files outside project directories)
process.exit(0);
