#!/usr/bin/env node
/**
 * block-worker-board-move.js - PreToolUse hook for working agents
 *
 * Blocks working agents (Murdock, B.A., Lynch, Amy, Tawnia) from calling
 * the board_move MCP tool. Stage transitions are Hannibal's responsibility.
 *
 * Targets: murdock, ba, lynch, amy, tawnia
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

  // Only enforce for working agents
  const TARGET_AGENTS = ['murdock', 'ba', 'lynch', 'amy', 'tawnia'];
  if (!agent || !TARGET_AGENTS.includes(agent)) {
    process.exit(0);
  }

  const toolName = hookInput.tool_name || '';

  if (toolName === 'mcp__plugin_ai-team_ateam__board_move') {
    sendDeniedEvent({ agentName: agent, toolName, reason: 'BLOCKED: Working agents cannot call board_move. Stage transitions are Hannibal\'s responsibility.' });
    process.stderr.write('BLOCKED: Working agents cannot call board_move.\n');
    process.stderr.write('Stage transitions are Hannibal\'s responsibility.\n');
    process.stderr.write('Use agent_stop to signal completion, then Hannibal will advance the item.\n');
    process.exit(2);
  }

  // Allow other tools
  process.exit(0);
} catch {
  // Fail open on any unexpected error
  process.exit(0);
}
