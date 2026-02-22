#!/usr/bin/env node
/**
 * track-browser-usage.js - PreToolUse hook for Amy
 *
 * Fires when Amy calls a Playwright MCP tool or the agent-browser skill.
 * Creates a marker file so the Stop hook can verify browser testing happened.
 *
 * Non-blocking - always exits 0.
 *
 * Claude Code sends hook context via stdin JSON (tool_name, tool_input).
 */
import { writeFileSync, mkdirSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { tmpdir } from 'os';

// Read hook input from stdin
let hookInput = {};
try {
  const raw = readFileSync(0, 'utf8');
  hookInput = JSON.parse(raw);
} catch {
  // Can't read stdin, allow through
  process.exit(0);
}

const toolName = hookInput.tool_name || '';
const toolInput = hookInput.tool_input || {};
const projectId = process.env.ATEAM_PROJECT_ID || 'default';

// Check if this is actually a browser tool call
let isBrowserTool = false;

if (toolName.startsWith('mcp__plugin_playwright')) {
  isBrowserTool = true;
} else if (toolName === 'Skill') {
  if (toolInput.skill === 'agent-browser') {
    isBrowserTool = true;
  }
}

if (isBrowserTool) {
  const markerPath = join(tmpdir(), `.ateam-browser-verified-${projectId}`);
  try {
    mkdirSync(dirname(markerPath), { recursive: true });
    writeFileSync(markerPath, new Date().toISOString());
  } catch { /* non-blocking */ }
}

process.exit(0);
