#!/usr/bin/env node
/**
 * block-raw-mv.js - PreToolUse hook for Hannibal
 *
 * Blocks raw `mv` commands on mission files.
 * Hannibal must use the board_move MCP tool instead, which:
 * - Updates board state in the API
 * - Validates stage transitions
 * - Enforces WIP limits
 * - Logs activity
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

// Check if this is an mv command targeting mission files
const isMvCommand = command.trim().startsWith('mv ') || command.includes('&& mv ') || command.includes('; mv ');
const targetsMission = command.includes('mission/') || command.includes('/mission/');

if (isMvCommand && targetsMission) {
  console.error('BLOCKED: Do not use raw `mv` to move mission files.');
  console.error('');
  console.error('Use the board_move MCP tool instead:');
  console.error('');
  console.error('  board_move(itemId="WI-001", to="done")');
  console.error('');
  console.error('The MCP tool ensures:');
  console.error('  - Board state is updated in the API');
  console.error('  - Stage transitions are validated');
  console.error('  - WIP limits are enforced');
  console.error('  - Activity is logged');
  console.error('');
  console.error('Available stages: briefings, ready, testing, implementing, review, probing, done, blocked');
  process.exit(2);
}

// Allow other bash commands
process.exit(0);
