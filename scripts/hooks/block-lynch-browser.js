#!/usr/bin/env node
/**
 * block-lynch-browser.js - PreToolUse hook for Lynch
 *
 * Blocks Lynch from using Playwright MCP browser tools.
 * Lynch reviews code by reading it, not by interacting with the browser.
 * Browser-based testing is Amy's responsibility.
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

if (/^mcp__plugin_playwright_playwright__/.test(toolName)) {
  console.error('BLOCKED: Lynch cannot use Playwright browser tools.');
  console.error('Code review is done by reading code, not by interacting with the browser.');
  console.error('Browser-based testing is Amy\'s responsibility during the probing stage.');
  process.exit(2);
}

// Allow other tools
process.exit(0);
