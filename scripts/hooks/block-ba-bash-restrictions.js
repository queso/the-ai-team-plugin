#!/usr/bin/env node
/**
 * block-ba-bash-restrictions.js - PreToolUse hook for B.A. (Bash commands)
 *
 * Blocks B.A. from running commands outside his implementation scope:
 * - Dev server commands (pnpm dev, npm start, etc.) — Hannibal manages the dev server
 * - git stash — used to rationalize test failures as "pre-existing"
 * - sleep > 5s — wasteful idle time
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
const command = toolInput.command || '';

// Block dev server commands
const devServerPattern = /\b(pnpm\s+dev|npm\s+run\s+dev|npm\s+start|yarn\s+dev|bun\s+dev|bun\s+run\s+dev|next\s+dev)\b/;
if (devServerPattern.test(command)) {
  console.error('BLOCKED: B.A. cannot start a dev server.');
  console.error('If tests require a running server, message Hannibal:');
  console.error('  SendMessage({ type: "message", recipient: "hannibal",');
  console.error('    content: "BLOCKED: {itemId} - Tests require a running dev server",');
  console.error('    summary: "Needs dev server for {itemId}" })');
  process.exit(2);
}

// Block git stash
if (/\bgit\s+stash\b/.test(command)) {
  console.error('BLOCKED: B.A. cannot use git stash.');
  console.error('If tests are failing, fix the implementation — do not check whether failures are "pre-existing".');
  console.error('If you believe a test is genuinely broken, message Hannibal to have Murdock investigate.');
  process.exit(2);
}

// Block sleep > 5 seconds
const sleepMatch = command.match(/\bsleep\s+(\d+)/);
if (sleepMatch && parseInt(sleepMatch[1], 10) > 5) {
  console.error(`BLOCKED: sleep ${sleepMatch[1]} is too long.`);
  console.error('If you need to wait for a process, use a shorter timeout or a retry loop.');
  process.exit(2);
}

// Allow other commands
process.exit(0);
