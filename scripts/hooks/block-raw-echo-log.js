#!/usr/bin/env node
/**
 * block-raw-echo-log.js - PreToolUse hook for all agents
 *
 * Blocks attempts to use raw `echo >> mission/activity.log` commands.
 * Redirects agents to use the `log` MCP tool instead.
 *
 * This hook runs on Bash tool calls and checks if the command
 * is trying to write directly to the activity log.
 *
 * Claude Code sends hook context via stdin JSON (tool_name, tool_input).
 */

import { readFileSync } from 'fs';

// Read hook input from stdin (Claude Code sends JSON)
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

// Check for echo commands targeting mission/activity.log
const isEchoToActivityLog =
  command.includes('>> mission/activity.log') ||
  command.includes('>>mission/activity.log') ||
  command.includes('> mission/activity.log') ||
  command.includes('>mission/activity.log') ||
  (command.includes('echo') && command.includes('activity.log'));

if (isEchoToActivityLog) {
  // Block and provide guidance
  const response = {
    decision: "block",
    reason: `
BLOCKED: Do not use raw echo commands to write to activity.log.

Instead, use the log MCP tool:
  log(agent="YourAgent", message="Your message here")

Examples:
  log(agent="Murdock", message="Created 5 test cases")
  log(agent="B.A.", message="All tests passing")
  log(agent="Lynch", message="APPROVED - all checks pass")

This ensures proper formatting and API integration.
`.trim()
  };

  console.log(JSON.stringify(response));
  process.exit(0);
}

// Allow other commands
process.exit(0);
