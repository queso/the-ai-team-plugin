#!/usr/bin/env node
/**
 * block-raw-echo-log.js - PreToolUse hook for all agents
 *
 * Blocks attempts to use raw `echo >> mission/activity.log` commands.
 * Redirects agents to use `node scripts/log.js` instead.
 *
 * This hook runs on Bash tool calls and checks if the command
 * is trying to write directly to the activity log.
 */

// Read tool input from environment
const toolInput = process.env.TOOL_INPUT || '{}';

let input;
try {
  input = JSON.parse(toolInput);
} catch {
  // Can't parse, allow through
  process.exit(0);
}

const command = input.command || '';

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

Instead, use the log script:
  node scripts/log.js YourAgent "Your message here"

Examples:
  node scripts/log.js Murdock "Created 5 test cases"
  node scripts/log.js B.A. "All tests passing"
  node scripts/log.js Lynch "APPROVED - all checks pass"

This ensures proper formatting and permissions.
`.trim()
  };

  console.log(JSON.stringify(response));
  process.exit(0);
}

// Allow other commands
process.exit(0);
