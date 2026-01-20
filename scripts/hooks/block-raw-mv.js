#!/usr/bin/env node
/**
 * block-raw-mv.js - PreToolUse hook for Hannibal
 *
 * Blocks raw `mv` commands on mission files.
 * Hannibal must use board-move.js instead, which:
 * - Updates board.json atomically
 * - Validates stage transitions
 * - Enforces WIP limits
 * - Logs activity
 */

const input = JSON.parse(process.env.TOOL_INPUT || '{}');
const command = input.command || '';

// Check if this is an mv command targeting mission files
const isMvCommand = command.trim().startsWith('mv ') || command.includes('&& mv ') || command.includes('; mv ');
const targetsMission = command.includes('mission/') || command.includes('/mission/');

if (isMvCommand && targetsMission) {
  console.error('BLOCKED: Do not use raw `mv` to move mission files.');
  console.error('');
  console.error('Use board-move.js instead:');
  console.error('');
  console.error('  echo \'{"itemId":"001","to":"done"}\' | node .claude/ai-team/scripts/board-move.js');
  console.error('');
  console.error('The script ensures:');
  console.error('  - board.json is updated atomically');
  console.error('  - Stage transitions are validated');
  console.error('  - WIP limits are enforced');
  console.error('  - Activity is logged');
  console.error('');
  console.error('Available stages: briefings, ready, testing, implementing, review, probing, done, blocked');
  process.exit(2);
}

// Allow other bash commands
process.exit(0);
