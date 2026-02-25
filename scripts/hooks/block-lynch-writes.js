#!/usr/bin/env node
/**
 * block-lynch-writes.js - PreToolUse hook for Lynch
 *
 * Blocks Lynch from writing or editing any files. Lynch is a code reviewer —
 * he reviews statically and must NOT modify source files, tests, or docs.
 * /tmp/ and /var/ are allowed as scratch space.
 *
 * Claude Code sends hook context via stdin JSON (tool_name, tool_input).
 */

import { readFileSync } from 'fs';
import { resolveAgent } from './lib/resolve-agent.js';
import { sendDeniedEvent } from './lib/send-denied-event.js';

try {
  let hookInput = {};
  try {
    const raw = readFileSync(0, 'utf8');
    hookInput = JSON.parse(raw);
  } catch {
    // Can't read stdin — fail open
    process.exit(0);
  }

  const agent = resolveAgent(hookInput);

  // Only enforce for Lynch (both per-feature and final review variants)
  if (agent !== 'lynch' && agent !== 'lynch-final') {
    process.exit(0);
  }

  const toolName = hookInput.tool_name || '';

  if (toolName !== 'Write' && toolName !== 'Edit') {
    process.exit(0);
  }

  const filePath = (hookInput.tool_input && hookInput.tool_input.file_path) || '';

  // Allow /tmp/ and /var/ as scratch space
  if (!filePath || filePath.startsWith('/tmp/') || filePath.startsWith('/var/')) {
    process.exit(0);
  }

  sendDeniedEvent({ agentName: agent, toolName, reason: `BLOCKED: Lynch cannot write or edit project files: ${filePath}` });
  process.stderr.write('BLOCKED: Lynch cannot write or edit project files.\n');
  process.stderr.write('Lynch reviews code statically. Browser investigation belongs to Amy.\n');
  process.stderr.write('Put your findings in the review report (as text output).\n');
  process.exit(2);
} catch {
  // Fail open on any unexpected error
  process.exit(0);
}
