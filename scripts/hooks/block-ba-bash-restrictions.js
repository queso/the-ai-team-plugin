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
import { resolveAgent } from './lib/resolve-agent.js';
import { sendDeniedEvent } from './lib/send-denied-event.js';

let hookInput = {};
try {
  const raw = readFileSync(0, 'utf8');
  hookInput = JSON.parse(raw);
} catch {
  // Can't read stdin, allow through
  process.exit(0);
}

try {
  const agent = resolveAgent(hookInput);

  // Only enforce for B.A.
  if (agent !== 'ba') {
    process.exit(0);
  }

  const toolName = hookInput.tool_name || '';
  const toolInput = hookInput.tool_input || {};
  const command = toolInput.command || '';

  // Block dev server commands
  const devServerPattern = /\b(pnpm\s+dev|npm\s+run\s+dev|npm\s+start|yarn\s+dev|bun\s+dev|bun\s+run\s+dev|next\s+dev)\b/;
  if (devServerPattern.test(command)) {
    sendDeniedEvent({ agentName: agent, toolName, reason: 'BLOCKED: B.A. cannot start a dev server.' });
    process.stderr.write('BLOCKED: B.A. cannot start a dev server.\n');
    process.stderr.write('If tests require a running server, message Hannibal:\n');
    process.stderr.write('  SendMessage({ type: "message", recipient: "hannibal",\n');
    process.stderr.write('    content: "BLOCKED: {itemId} - Tests require a running dev server",\n');
    process.stderr.write('    summary: "Needs dev server for {itemId}" })\n');
    process.exit(2);
  }

  // Block git stash
  if (/\bgit\s+stash\b/.test(command)) {
    sendDeniedEvent({ agentName: agent, toolName, reason: 'BLOCKED: B.A. cannot use git stash.' });
    process.stderr.write('BLOCKED: B.A. cannot use git stash.\n');
    process.stderr.write('If tests are failing, fix the implementation — do not check whether failures are "pre-existing".\n');
    process.stderr.write('If you believe a test is genuinely broken, message Hannibal to have Murdock investigate.\n');
    process.exit(2);
  }

  // Block sleep > 5 seconds
  const sleepMatch = command.match(/\bsleep\s+(\d+)/);
  if (sleepMatch && parseInt(sleepMatch[1], 10) > 5) {
    sendDeniedEvent({ agentName: agent, toolName, reason: `BLOCKED: sleep ${sleepMatch[1]} is too long.` });
    process.stderr.write(`BLOCKED: sleep ${sleepMatch[1]} is too long.\n`);
    process.stderr.write('If you need to wait for a process, use a shorter timeout or a retry loop.\n');
    process.exit(2);
  }

  // Allow other commands
  process.exit(0);
} catch {
  // Fail open on any unexpected error
  process.exit(0);
}
