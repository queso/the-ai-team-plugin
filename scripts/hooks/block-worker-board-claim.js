#!/usr/bin/env node
/**
 * block-worker-board-claim.js - PreToolUse hook for working agents
 *
 * Blocks working agents from calling the raw board_claim MCP tool.
 * Workers should use agent_start to claim items, which handles both
 * the board claim and the assigned_agent metadata in one call.
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

if (toolName === 'mcp__plugin_ai-team_ateam__board_claim') {
  console.error('BLOCKED: Working agents cannot call board_claim directly.');
  console.error('Use agent_start to claim items — it handles both the board claim and metadata.');
  process.exit(2);
}

// Allow other tools
process.exit(0);
