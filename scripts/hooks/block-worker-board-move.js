#!/usr/bin/env node
/**
 * block-worker-board-move.js - PreToolUse hook for working agents
 *
 * Blocks working agents (Murdock, B.A., Lynch, Amy, Tawnia) from calling
 * the board_move MCP tool. Stage transitions are Hannibal's responsibility.
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

const toolName = hookInput.tool_name || '';

if (toolName === 'mcp__plugin_ai-team_ateam__board_move') {
  console.error('BLOCKED: Working agents cannot call board_move.');
  console.error('Stage transitions are Hannibal\'s responsibility.');
  console.error('Use agent_stop to signal completion, then Hannibal will advance the item.');
  process.exit(2);
}

// Allow other tools
process.exit(0);
